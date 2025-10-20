import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import Stripe from 'stripe';

describe('WebhookController', () => {
  let controller: WebhookController;
  let webhookService: WebhookService;

  const mockWebhookService = {
    enqueueWebhookEvent: jest.fn(),
    findWebhookEvents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleStripeWebhook', () => {
    const mockStripeEvent: Stripe.Event = {
      id: 'evt_test_123',
      object: 'event',
      api_version: '2020-08-27',
      created: Date.now(),
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
        } as any,
      },
      livemode: false,
      pending_webhooks: 0,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: 'checkout.session.completed',
    };

    const mockRequest = {
      rawBody: Buffer.from(JSON.stringify(mockStripeEvent)),
      headers: {
        'stripe-signature': 't=1234567890,v1=test_signature',
      },
    };

    beforeEach(() => {
      // Set required env vars for tests
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    });

    it('should reject requests without stripe-signature header', async () => {
      await expect(
        controller.handleStripeWebhook(
          mockRequest as any,
          '',
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should reject requests without webhook secret configured', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(
        controller.handleStripeWebhook(
          mockRequest as any,
          'test_signature',
        ),
      ).rejects.toThrow(HttpException);

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    it('should reject requests without raw body', async () => {
      const requestWithoutBody = {
        ...mockRequest,
        rawBody: null,
      };

      await expect(
        controller.handleStripeWebhook(
          requestWithoutBody as any,
          'test_signature',
        ),
      ).rejects.toThrow(HttpException);
    });

    // Note: Full signature verification testing requires mocking Stripe SDK
    // which should be done in integration tests with actual Stripe test mode
  });

  describe('findAll', () => {
    it('should return webhook events', async () => {
      const mockEvents = [
        {
          id: '1',
          stripeEventId: 'evt_1',
          type: 'checkout.session.completed',
          status: 'PROCESSED',
        },
      ];
      
      mockWebhookService.findWebhookEvents.mockResolvedValue(mockEvents);

      const result = await controller.findAll();
      
      expect(result).toEqual(mockEvents);
      expect(mockWebhookService.findWebhookEvents).toHaveBeenCalled();
    });
  });
});
