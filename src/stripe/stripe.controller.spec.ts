import { Test, TestingModule } from '@nestjs/testing';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { AuthGuard } from '@nestjs/passport';
import { mockStripeService } from '../test/test-utils';
import { EmailService } from 'src/email/email.service';
import { mockEmailService } from '../test/test-utils';
import { ActivityService } from 'src/activity/activity.service';
import { mockActivityService } from '../test/test-utils';
import { NotificationService } from 'src/notification/notification.service';
import { mockNotificationService } from '../test/test-utils';
import { ConfigService } from '@nestjs/config';
import { mockConfigService } from '../test/test-utils';
import { TransactionService } from 'src/transaction/transaction.service';
import { mockTransactionService } from '../test/test-utils';
describe('StripeController', () => {
  let controller: StripeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
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
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StripeController>(StripeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
