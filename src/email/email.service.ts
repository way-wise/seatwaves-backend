import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';
import { SendEmailDto } from './dto/sendMail.dto';
import { ContactEmailDto } from './dto/contact.dto';

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue(QUEUES.EMAIL) private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    this.notificationQueue.add('send-email', { to, subject, text, html });
    return { ok: true };
  }

  //SendMail specific Users
  async sendEmailToUser(userId: string, data: SendEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found.');

    this.notificationQueue.add('send-email', { to: user.email, ...data });
    return { ok: true };
  }

  // OTP Mail
  async sendOTPEmail({
    to,
    subject,
    text,
    html,
  }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    this.notificationQueue.add('send-otp-email', { to, subject, text, html });
    return { ok: true };
  }

  // Contact Mail
  async sendContactEmail(data: ContactEmailDto) {
    this.notificationQueue.add('send-contact-email', { ...data });
    return { ok: true };
  }
}
