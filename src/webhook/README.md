# Stripe Webhook Integration

## Overview
Production-ready Stripe webhook integration for WeOut event booking system with clean architecture and comprehensive error handling.

## Environment Variables Required

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret from Stripe dashboard

# Database
DATABASE_URL=postgresql://...  # Your PostgreSQL connection string
```

## Webhook Endpoint

**URL:** `POST /api/v1/webhook/stripe`

Configure this URL in your Stripe dashboard under Webhooks.

## Supported Events

### 1. `checkout.session.completed`
- **Purpose:** Confirms successful payment via Stripe Checkout
- **Action:** Updates transaction status to SUCCESS, booking status to CONFIRMED
- **Database Updates:** Transaction, Booking tables

### 2. `payment_intent.succeeded` 
- **Purpose:** Confirms successful payment intent
- **Action:** Records payment confirmation and settlement
- **Database Updates:** Transaction, Booking tables

### 3. `transfer.paid`
- **Purpose:** Confirms host payout completion
- **Action:** Marks withdrawal request and payout transaction as completed
- **Database Updates:** WithdrawalRequest, Transaction tables

### 4. `charge.refunded`
- **Purpose:** Handles refunds (full or partial)
- **Action:** Creates refund transaction, updates original transaction and booking status
- **Database Updates:** Transaction (new + update), Booking tables

## Architecture

### WebhookController
- Handles HTTP requests and Stripe signature verification
- Raw body parsing for webhook signature validation
- Error handling with appropriate HTTP status codes

### WebhookService  
- Business logic for processing webhook events
- Atomic database transactions using Prisma
- In-memory duplicate event prevention
- Comprehensive logging and error handling

## Security Features

- **Signature Verification:** All webhooks verified using Stripe signature
- **Duplicate Prevention:** Events processed only once using in-memory cache
- **Raw Body Parsing:** Proper handling of webhook payloads for signature verification
- **Error Handling:** Graceful error handling prevents webhook retry storms

## Usage

The webhook integration is automatically active once deployed. Stripe will send events to your configured endpoint.

## Monitoring

Access processed events for debugging:
```typescript
// In your service
const processedEvents = webhookService.getProcessedEvents();
```

## Testing

Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:8000/api/v1/webhook/stripe
```
