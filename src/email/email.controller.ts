import { Body, Controller, Param, Post, UsePipes } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto, sendEmailSchema } from './dto/sendMail.dto';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { ContactEmailDto, contactEmailSchema } from './dto/contact.dto';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('/contact')
  @UsePipes(new ZodValidationPipe(contactEmailSchema))
  sendContactEmail(@Body() emailDto: ContactEmailDto) {
    return this.emailService.sendContactEmail(emailDto);
  }

  @Post('/:id')
  @UsePipes(new ZodValidationPipe(sendEmailSchema))
  sendEmail(@Param('id') id: string, @Body() emailDto: SendEmailDto) {
    return this.emailService.sendEmailToUser(id, emailDto);
  }
}
