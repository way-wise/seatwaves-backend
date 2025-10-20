import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
import { PointsService } from '../points/points.service';
import { ActivityService } from '../activity/activity.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUES } from '../queues/queue.constants';
import Stripe from 'stripe';

describe('WebhookService', () => {
  let service: WebhookService;
  let prismaService: PrismaService;
  let webhookQueue: any;

  const mockPrismaService = {
    webhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockNotificationService = {
    createAndQueueNotification: jest.fn(),
  };

  const mockEmailService = {
    sendEmailToUser: jest.fn(),
  };

  const mockPointsService = {
    awardPoints: jest.fn(),
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PointsService,
          useValue: mockPointsService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
        {
          provide: getQueueToken(QUEUES.WEBHOOK),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prismaService = module.get<PrismaService>(PrismaService);
    webhookQueue = module.get(getQueueToken(QUEUES.WEBHOOK));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueWebhookEvent', () => {
    it('should enqueue a new webhook event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        data: { object: {} as any },
      };

      mockPrismaService.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrismaService.webhookEvent.create.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      await service.enqueueWebhookEvent(mockEvent as Stripe.Event);

      expect(mockPrismaService.webhookEvent.findUnique).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_test123' },
      });
      expect(mockPrismaService.webhookEvent.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'stripe-webhook',
        { event: mockEvent },
        expect.objectContaining({
          attempts: 5,
          jobId: 'evt_test123',
        }),
      );
    });

    it('should skip enqueue if event already processed', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test123',
        type: 'checkout.session.completed',
      };

      mockPrismaService.webhookEvent.findUnique.mockResolvedValue({
        id: 'webhook1',
        status: 'PROCESSED',
        stripeEventId: 'evt_test123',
      });

      await service.enqueueWebhookEvent(mockEvent as Stripe.Event);

      expect(mockPrismaService.webhookEvent.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('processWebhookJob - Idempotency', () => {
    it('should not process already processed event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test123',
        type: 'checkout.session.completed',
      };

      mockPrismaService.webhookEvent.findUnique.mockResolvedValue({
        id: 'webhook1',
        status: 'PROCESSED',
        stripeEventId: 'evt_test123',
      });

      await service.processWebhookJob(mockEvent as Stripe.Event);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
