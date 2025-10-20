# SeatWaves Backend

Event ticketing and booking platform built with NestJS, Prisma, Stripe Connect, and PostgreSQL.

## Description

SeatWaves is a production-ready event ticketing marketplace featuring:
- **Stripe Connect** integration for split payments and seller payouts
- **Real-time notifications** via WebSockets and BullMQ job queues
- **Multi-provider authentication** (Google, Facebook, Apple, JWT)
- **Webhook idempotency** with database-backed deduplication
- **Health checks** for Kubernetes/container deployments
- **Rate limiting** and security hardening (Helmet, CORS, validation)
- **Comprehensive logging** with correlation IDs and PII masking
- **S3 upload** support for event images and assets

## Prerequisites

- **Node.js** >= 20.0.0 (LTS recommended)
- **PostgreSQL** 16+ or Docker
- **Redis** 7+ or Docker
- **pnpm** package manager
- **Stripe account** with API keys

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd seatwaves-backend
pnpm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/seatwaves

# JWT (Generate a secure 32+ character secret)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:3000
APP_CLIENT_URL=http://localhost:3000
```

See `.env.example` for all available configuration options.

### 3. Start Services with Docker

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 16 on port `5432`
- Redis Stack on port `6379`
- pgAdmin on port `5050`

### 4. Database Setup

```bash
# Run migrations
pnpm run migrate:dev

# Seed database (optional)
pnpm run db:seed
```

### 5. Start Application

```bash
# Development mode with hot-reload
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

### 6. Access Application

- **API Base URL:** `http://localhost:8000/api/v1`
- **Swagger Docs:** `http://localhost:8000/api/v1/docs`
- **Health Check:** `http://localhost:8000/api/v1/health`
- **Readiness Check:** `http://localhost:8000/api/v1/health/ready`

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov

# Watch mode
pnpm run test:watch
```

## Background Workers

Start background job processors:

```bash
# Email worker
pnpm run start:worker:email

# Notification worker
pnpm run start:worker:notification

# Event worker
pnpm run start:worker:event
```

## Key Features

### Authentication
- JWT-based authentication
- Social OAuth (Google, Facebook, Apple)
- Email OTP verification
- Two-factor authentication support

### Payments & Transactions
- Stripe Checkout integration
- Stripe Connect for seller payouts
- Platform fee/commission tracking
- Automatic refund handling
- Idempotent webhook processing

### Booking System
- Ticket inventory management
- Seat deduplication (unique per event+seat)
- Hold windows with TTL
- Multiple delivery types (online, physical, pickup)
- Booking confirmation emails

### Security
- Helmet.js for HTTP headers
- Rate limiting (100 req/min default)
- Global validation with whitelist
- CORS with explicit origin control
- PII masking in logs

### Observability
- Correlation ID tracking across requests
- Structured JSON logging
- Health/readiness endpoints for k8s
- Graceful shutdown hooks

## Architecture

### Tech Stack
- **Framework:** NestJS 11 with TypeScript
- **Database:** PostgreSQL 16 with Prisma ORM
- **Cache/Queue:** Redis Stack with BullMQ
- **Payments:** Stripe Connect
- **Storage:** AWS S3
- **Email:** Nodemailer
- **Real-time:** Socket.io

### Database Schema Highlights
- **Idempotent webhooks:** `WebhookEvent` with unique `stripeEventId`
- **Seat uniqueness:** Composite unique constraint on `(eventId, seatDetails)`
- **Transaction deduplication:** Unique `externalTxnId`
- **Soft deletes:** `deletedAt` timestamps on critical models

## API Documentation

Interactive Swagger documentation is available at:
```
http://localhost:8000/api/v1/docs
```

**Authentication:** Use Bearer token authentication for protected endpoints.

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|----------|
| `NODE_ENV` | No | Environment | `development` |
| `PORT` | No | Server port | `8000` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | **Yes** | JWT signing key (32+ chars) | `your-secret-key` |
| `STRIPE_SECRET_KEY` | **Yes** | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Stripe webhook signing secret | `whsec_...` |
| `FRONTEND_URL` | Recommended | CORS allowed origin | `https://yoursite.com` |
| `AWS_ACCESS_KEY_ID` | Optional | S3 uploads | - |
| `SMTP_HOST` | Optional | Email sending | `smtp.gmail.com` |
| `THROTTLE_LIMIT` | No | Rate limit per minute | `100` |

## Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Configure production `FRONTEND_URL` for CORS
- [ ] Set `NODE_ENV=production`
- [ ] Enable SSL/TLS for database connections
- [ ] Configure Stripe webhook endpoint in dashboard
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Enable database connection pooling
- [ ] Set appropriate rate limits
- [ ] Review and adjust Helmet CSP rules

### Docker Deployment

```bash
# Build image
docker build -t seatwaves-backend .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**Database connection failed:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` format
- Verify network connectivity

**Stripe webhook signature verification failed:**
- Get webhook secret from Stripe Dashboard
- Ensure `STRIPE_WEBHOOK_SECRET` matches
- Check raw body is enabled in main.ts

**Redis connection errors:**
- Verify Redis is running on port 6379
- Check `REDIS_HOST` and `REDIS_PORT` in .env

## Project Structure

```
src/
├── auth/              # Authentication & OAuth
├── booking/           # Booking management
├── common/            # Shared utilities, filters, pipes
├── config/            # Configuration & validation
├── email/             # Email service & templates
├── event/             # Event management
├── health/            # Health check endpoints
├── notification/      # Push notifications
├── prisma/            # Database service
├── stripe/            # Stripe integration
├── webhook/           # Webhook handlers
└── main.ts            # Application entry point
```

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## License

MIT
