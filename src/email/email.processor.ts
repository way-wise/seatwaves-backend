// src/email/email.processor.ts
import { Logger, Injectable } from '@nestjs/common';
import { WorkerHost, OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';

import { config } from 'dotenv';
import { QUEUES } from 'src/queues/queue.constants';

config();

@Injectable()
@Processor(QUEUES.EMAIL) // Queue name
export class EmailProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(EmailProcessor.name);

  constructor() {
    super();

    // Validate environment variables
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.EMAIL_FROM
    ) {
      this.logger.error('❌ Missing SMTP configuration in .env file');
      throw new Error('Missing SMTP configuration');
    }

    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: parseInt(process.env.SMTP_PORT, 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify SMTP connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('❌ SMTP connection failed:', error);
      } else {
        this.logger.log('✅ SMTP connection established');
      }
    });
  }

  // Main job handler
  async process(job: Job<any, any, string>): Promise<any> {
    try {
      // Handle contact form emails specially
      if (job.name === 'send-contact-email') {
        const { name, email, phone, subject, message } = job.data as {
          name: string;
          email: string;
          phone?: string;
          subject?: string;
          message: string;
        };

        const to = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM;
        const finalSubject = subject
          ? `Contact: ${subject}`
          : 'New Contact Form Submission';
        const text = `New contact submission:\n\nName: ${name}\nEmail: ${email}${
          phone ? `\nPhone: ${phone}` : ''
        }\n\nMessage:\n${message}`;
        const html = `<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
<p><strong>Message:</strong></p>
<p>${message}</p>`;

        this.logger.log(
          `📨 [send-contact-email] Routing contact email to ${to}`,
        );
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to,
          subject: finalSubject,
          text,
          html,
        });
        this.logger.log(`✅ Contact email processed for ${email}`);
        return;
      }

      // Default handling for other email jobs expects { to, subject, text, html }
      const { to, subject, text, html } = job.data;
      this.logger.log(`📨 Sending email to ${to} [${job.name}]`);
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`✅ Email successfully sent to ${to}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed processing job ${job.name}: ${error.message}`,
      );
      throw error;
    }
  }

  // Optional: Listen to job events
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`🎉 Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`💥 Job ${job.id} failed: ${err.message}`);
  }
}
