import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockBookingService } from '../test/test-utils';
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
describe('BookingController', () => {
  let controller: BookingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: mockBookingService,
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
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
