import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { mockPrismaService, mockConfigService } from '../test/test-utils';
import { UploadService } from 'src/upload/upload.service';
import { mockUploadService } from '../test/test-utils';
import { StripeService } from 'src/stripe/stripe.service';
import { mockStripeService } from '../test/test-utils';
import { EmailService } from 'src/email/email.service';
import { mockEmailService } from '../test/test-utils';
import { ActivityService } from 'src/activity/activity.service';
import { mockActivityService } from '../test/test-utils';
import { NotificationService } from 'src/notification/notification.service';
import { mockNotificationService } from '../test/test-utils';
describe('BookingService', () => {
  let service: BookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
