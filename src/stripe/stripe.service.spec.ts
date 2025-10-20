import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { mockConfigService, mockPrismaService } from '../test/test-utils';
import { TransactionService } from '../transaction/transaction.service';
import { mockTransactionService } from '../test/test-utils';
import { NotificationService } from '../notification/notification.service';
import { mockNotificationService } from '../test/test-utils';
import { ActivityService } from '../activity/activity.service';
import { mockActivityService } from '../test/test-utils';
import { EmailService } from '../email/email.service';
import { mockEmailService } from '../test/test-utils';
describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
