import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../test/test-utils';
import { EmailService } from '../email/email.service';
import { mockEmailService } from '../test/test-utils';
import { ActivityService } from '../activity/activity.service';
import { mockActivityService } from '../test/test-utils';
import { UploadService } from 'src/upload/upload.service';
import { mockUploadService } from '../test/test-utils';
import { NotificationService } from '../notification/notification.service';
import { mockNotificationService } from '../test/test-utils';
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
          provide: UploadService,
          useValue: mockUploadService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
