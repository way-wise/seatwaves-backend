import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';
import { z } from 'zod';
import { createEventScehema, ticketSchema } from './dto/create.event.dto';
import { eventQuerySchema } from './dto/event.query.dto';
import { ticketQuerySchema } from './dto/ticket.query.dto';
import { updateticketSchema } from './dto/update.ticket.dto';
import { queryEventSchema } from './dto/query.dto';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  // chunk size for createMany to avoid too-large queries
  private readonly CHUNK_SIZE = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @InjectQueue(QUEUES.EVENT) private readonly eventQueue: Queue,
  ) {}

  /**
   * Acquire distributed lock using Redis
   */
  private async acquireDistributedLock(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    try {
      // Use Redis SET with NX (only if not exists) and PX (expiration in ms)
      const client = await this.eventQueue.client;
      const result = await client.set(key, value, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${key}:`, error);
      return false;
    }
  }
  // Flat participants list for DataTable consumption

  /**
   * Release distributed lock using Redis
   */
  private async releaseDistributedLock(
    key: string,
    value: string,
  ): Promise<void> {
    try {
      // Use Lua script to ensure we only delete our own lock
      const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;
      const client = await this.eventQueue.client;
      await client.eval(script, 1, key, value);
    } catch (error) {
      this.logger.error(`Failed to release lock ${key}:`, error);
    }
  }

  //get all events public with pagination and search
  async getAllEventsPublic(query: any) {
    const parsedQuery = eventQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      this.logger.error('Validation failed', parsedQuery.error);
      throw new NotAcceptableException('Invalid query parameters');
    }

    const { page, limit, cursor, search, sortBy, sortOrder } = parsedQuery.data;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          category: true,
          seller: { select: { id: true, name: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const nextCursor =
      events.length === limitInt ? events[events.length - 1].id : null;

    return {
      status: true,
      data: events,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
        nextCursor,
      },
    };
  }

  //get single event
  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        tickets: {
          select: {
            id: true,
            ticketId: true,
            seatDetails: true,
            seller: { select: { id: true, name: true } },
            price: true,
            discount: true,
            discountType: true,
            isBooked: true,
          },
        },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      throw new NotAcceptableException('Event not found');
    }

    return {
      status: true,
      data: event,
    };
  }

  // get ticket by event Id
  async getticketsByEventId(eventId: string, query: any) {
    const parsedQuery = ticketQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      this.logger.error('Validation failed', parsedQuery.error);
      throw new NotAcceptableException('Invalid query parameters');
    }
    const event = await this.prisma.event.findUnique({
      where: { eventId: eventId },
      include: {
        _count: {
          select: {
            tickets: {
              where: { isBooked: false },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const {
      page = '1',
      limit = '10',
      cursor,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = parsedQuery.data;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    const where: any = { eventId: event.id };

    if (search) {
      where.OR = [
        { ticketId: { contains: search, mode: 'insensitive' } },
        { seatDetails: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          ticketId: true,
          ticketType: true,
          eventId: true,
          price: true,
          discount: true,
          discountType: true,
          seatDetails: true,
          thumbnail: true,
          description: true,
          note: true,
          isBooked: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          seller: {
            select: {
              id: true,
              name: true,
              averageRating: true,
              _count: {
                select: {
                  bookings: {
                    where: {
                      status: 'DELIVERED',
                    },
                  },
                  events: {
                    where: {
                      status: 'ONGOING',
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const nextCursor =
      tickets.length === limitInt ? tickets[tickets.length - 1].id : null;

    return {
      status: true,
      event: event,
      tickets,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
        nextCursor,
      },
    };
  }

  //create Events
  async createEvent(data: any, sellerId: string) {
    const parsedData = createEventScehema.safeParse(data);

    if (!parsedData.success) {
      this.logger.error('Validation failed', parsedData.error);
      throw new NotAcceptableException('Invalid event data');
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotAcceptableException('Seller not found');
    }

    if (!seller.stripeAccountId) {
      throw new NotAcceptableException('Seller not onboarding complete');
    }

    //check event already exists
    const existingEvent = await this.prisma.event.findUnique({
      where: { eventId: parsedData.data.eventId },
    });

    if (existingEvent) {
      let ticketsAdded = 0;
      if (parsedData.data.tickets.length > 0) {
        // If tickets are provided, we can add them to the existing event
        const ticketsToCreate = parsedData.data.tickets.map((ticket) => ({
          ...ticket,
          sellerId: existingEvent.sellerId,
          eventId: existingEvent.id,
        }));

        // Insert all ticket chunks atomically
        await this.prisma.$transaction(async (tx) => {
          for (let i = 0; i < ticketsToCreate.length; i += this.CHUNK_SIZE) {
            const chunk = ticketsToCreate.slice(i, i + this.CHUNK_SIZE);
            const res = await tx.ticket.createMany({
              data: chunk,
              skipDuplicates: true, // Skip duplicates based on unique constraints
            });
            ticketsAdded += (res as any)?.count ?? 0;
          }
        });
      }
      return {
        status: true,
        message: 'Event already exists, tickets added if provided',
        eventId: existingEvent.id,
        ticketsAdded,
      };
    }

    console.log('Creating new event', parsedData.data);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const newEvent = await tx.event.create({
          data: {
            title: parsedData.data.title,
            description: parsedData.data.description,
            eventId: parsedData.data.eventId,
            venue: parsedData.data.venue,
            startTime: parsedData.data.startTime,
            endTime: parsedData.data.endTime,
            duration: parsedData.data.duration,
            sellerId: sellerId,
            image: parsedData.data.image,
            metadata: parsedData.data.metadata,
            categoryId: parsedData.data.categoryId,
            city: parsedData.data.city,
            country: parsedData.data.country,
            address: parsedData.data.address,
            latitude: parsedData.data.latitude,
            longitude: parsedData.data.longitude,
            seatmapImage: parsedData.data.seatmapImage,
            venueImage: parsedData.data.venuImage,
            timezone: parsedData.data.timezone,
            originUrl: parsedData.data.originUrl,
          },
        });
        let ticketsCreated = 0;
        if (parsedData.data.tickets.length > 0) {
          const ticketsToCreate = parsedData.data.tickets.map((ticket) => ({
            ...ticket,
            sellerId: sellerId,
            eventId: newEvent.id,
          }));

          // Chunk tickets to avoid too-large queries
          for (let i = 0; i < ticketsToCreate.length; i += this.CHUNK_SIZE) {
            const chunk = ticketsToCreate.slice(i, i + this.CHUNK_SIZE);
            const res = await tx.ticket.createMany({
              data: chunk,
              skipDuplicates: true, // Skip duplicates based on unique constraints
            });
            ticketsCreated += (res as any)?.count ?? 0;
          }
        }
        return {
          status: true,
          message: 'Event created successfully',
          eventId: newEvent.id,
          ticketsCreated,
        };
      });
    } catch (error) {
      this.logger.error('Failed to create event', error);
      throw new NotAcceptableException('Failed to create event');
    }
  }

  //create events bulk
  async createEventsBulk(data: any) {
    // Accept either an array or an object with { events: [...] }
    const eventsInput: any[] | undefined = Array.isArray(data)
      ? data
      : Array.isArray(data?.events)
        ? data.events
        : undefined;

    if (!Array.isArray(eventsInput)) {
      this.logger.error('Validation failed', 'Expected array of events');
      throw new NotAcceptableException('Expected array of events');
    }

    console.log(eventsInput);

    const EventArraySchema = z.array(createEventScehema);
    // const parsedArray = EventArraySchema.safeParse(eventsInput);
    // if (!parsedArray.success) {
    //   this.logger.error('Validation failed', parsedArray.error);
    //   throw new NotAcceptableException('Invalid event data');
    // }

    const summary = {
      created: 0,
      updatedExisting: 0,
      ticketsCreated: 0,
      ticketsAddedToExisting: 0,
      skipped: 0,
      eventIds: [] as string[],
      errors: [] as { index: number; message: string }[],
    };

    for (let i = 0; i < eventsInput.length; i++) {
      const ev = eventsInput[i];
      try {
        // Check existing by external eventId
        const existing = await this.prisma.event.findUnique({
          where: { eventId: ev.eventId },
        });

        if (existing) {
          // If tickets provided, add them
          if (ev.tickets && ev.tickets.length > 0) {
            const ticketsToCreate = ev.tickets.map((ticket) => ({
              ...ticket,
              metaData: ev.metaData,
              eventId: existing.id,
            }));
            for (let j = 0; j < ticketsToCreate.length; j += this.CHUNK_SIZE) {
              const chunk = ticketsToCreate.slice(j, j + this.CHUNK_SIZE);
              await this.prisma.ticket.createMany({
                data: chunk,
                skipDuplicates: true,
              });
            }
            summary.ticketsAddedToExisting += ev.tickets.length;
          }
          summary.updatedExisting += 1;
          continue;
        }

        // Create new event
        const newEvent = await this.prisma.event.create({
          data: {
            title: ev.title,
            description: ev.description,
            eventId: ev.eventId,
            venue: ev.venue,
            startTime: ev.startTime,
            endTime: ev.endTime,
            duration: ev.duration,
            sellerId: ev.sellerId,
            metadata: ev.metadata,
            categoryId: ev.categoryId,
          },
        });
        summary.created += 1;
        summary.eventIds.push(newEvent.id);

        if (ev.tickets && ev.tickets.length > 0) {
          const ticketsToCreate = ev.tickets.map((ticket) => ({
            ...ticket,
            eventId: newEvent.id,
          }));
          for (let j = 0; j < ticketsToCreate.length; j += this.CHUNK_SIZE) {
            const chunk = ticketsToCreate.slice(j, j + this.CHUNK_SIZE);
            await this.prisma.ticket.createMany({
              data: chunk,
              skipDuplicates: true,
            });
          }
          summary.ticketsCreated += ev.tickets.length;
        }
      } catch (e: any) {
        this.logger.error(`Failed to process event at index ${i}`, e);
        summary.skipped += 1;
        summary.errors.push({
          index: i,
          message: e?.message || 'Unknown error',
        });
      }
    }

    return {
      status: true,
      message: 'Bulk events processed',
      summary,
    };
  }

  // Added ticket
  async addticketToEvent(eventId: string, ticketData: any, sellerId: string) {
    const parsedData = ticketSchema.safeParse(ticketData);

    if (!parsedData.success) {
      this.logger.error('Validation failed', parsedData.error);
      throw new NotAcceptableException(parsedData.error.message);
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotAcceptableException('Event not found');
    }

    const newticket = await this.prisma.ticket.create({
      data: {
        ticketId: parsedData.data.ticketId,
        sellerId: sellerId,
        seatDetails: parsedData.data.seatDetails,
        metadata: parsedData.data.metadata,
        price: parsedData.data.price,
        discount: parsedData.data.discount,
        discountType: parsedData.data.discountType,
        eventId: event.id,
      },
    });

    return {
      status: true,
      message: 'ticket added successfully',
      ticketId: newticket.id,
    };
  }

  async updateticket(ticketId: string, ticketData: any, sellerId: string) {
    const parsedData = updateticketSchema.safeParse(ticketData);

    if (!parsedData.success) {
      this.logger.error('Validation failed', parsedData.error);
      throw new NotAcceptableException(parsedData.error.message);
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotAcceptableException('ticket not found');
    }

    if (ticket.isBooked) {
      throw new NotAcceptableException('ticket is booked');
    }

    if (ticket.sellerId !== sellerId) {
      throw new NotAcceptableException('ticket not belongs to you');
    }

    const updatedticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...parsedData.data,
      },
    });

    return {
      status: true,
      message: 'ticket updated successfully',
      ticketId: updatedticket.id,
    };
  }

  //get event by seller
  async getEventsBySeller(sellerId: string, query) {
    const parsedQuery = eventQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      this.logger.error('Validation failed', parsedQuery.error);
      throw new NotAcceptableException('Invalid query parameters');
    }

    const { page, limit, cursor, search, sortBy, sortOrder } = parsedQuery.data;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    const where: any = { sellerId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          category: true,
          seller: true,
          tickets: true,
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const nextCursor =
      events.length === limitInt ? events[events.length - 1].id : null;

    return {
      status: true,
      data: events,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
        nextCursor,
      },
    };
  }

  //get events by admin with pagination and search
  async getAllEventsAdmin(query: any) {
    const parsedQuery = eventQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      this.logger.error('Validation failed', parsedQuery.error);
      throw new NotAcceptableException('Invalid query parameters');
    }

    const { page, limit, cursor, search, sortBy, sortOrder } = parsedQuery.data;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        cursor: cursor ? { id: cursor } : undefined,

        include: {
          _count: {
            select: {
              tickets: true,
              reviews: true,
            },
          },
          category: true,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      status: true,
      data: events,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
      },
    };
  }

  async getSellerListing(query: any, sellerId: string) {
    const parseData = queryEventSchema.parse(query);

    const {
      page = '1',
      limit = '10',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
    } = parseData;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    const where: any = {};

    if (isActive) {
      where.event = { status: 'ONGOING' };
    }

    if (search) {
      where.OR = [
        { event: { title: { contains: search, mode: 'insensitive' } } },
        { event: { description: { contains: search, mode: 'insensitive' } } },
        { event: { venue: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        include: {
          event: true,
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      status: true,
      data: tickets,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
      },
    };
  }

  async getEventsSeller(query: any, sellerId: string) {
    const parsedQuery = eventQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      this.logger.error('Validation failed', parsedQuery.error);
      throw new NotAcceptableException('Invalid query parameters');
    }

    const { page, limit, cursor, search, sortBy, sortOrder } = parsedQuery.data;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        cursor: cursor ? { id: cursor } : undefined,

        include: {
          _count: {
            select: {
              tickets: true,
              reviews: true,
            },
          },
          category: true,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      status: true,
      data: events,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
      },
    };
  }

  async adminGetSingleEventById(id: string, query: any) {
    const parseQuery = eventQuerySchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException('Invalid query parameters');

    // Fetch event with related info for admin view
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        seller: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        _count: { select: { tickets: true, reviews: true } },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    // Build base where for bookings belonging to this event
    const whereBookingBase = { deletedAt: null, ticket: { eventId: id } };
    const paidStatuses = ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

    const [
      bookingsTotalCount,
      statusBreakdown,
      paidAgg,
      totaltickets,
      availabletickets,
      reviewBreakdown,
      txnAgg,
    ] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereBookingBase }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: whereBookingBase,
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.booking.aggregate({
        where: { ...whereBookingBase, status: { in: paidStatuses as any } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.ticket.count({ where: { eventId: id } }),
      this.prisma.ticket.count({ where: { eventId: id, isBooked: false } }),
      this.prisma.review.groupBy({
        by: ['status'],
        where: { eventId: id },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.transaction.aggregate({
        where: {
          eventId: id,
          type: 'BOOKING_PAYMENT',
          status: 'SUCCESS',
        },
        _sum: { amount: true, platformFee: true, sellerAmount: true },
      }),
    ]);

    const summary = {
      totalRevenue: Number(txnAgg._sum?.amount || 0),
      totalPlatformFees: Number(txnAgg._sum?.platformFee || 0),
      totalSellerPayouts: Number(txnAgg._sum?.sellerAmount || 0),
      totalTickets: totaltickets,
      availableTickets: availabletickets,
      soldTickets: totaltickets - availabletickets,
      statusBreakdown,
      reviews: reviewBreakdown,
    };

    // Add a 'date' alias for frontend compatibility (maps to startTime)
    const eventForClient: any = { ...event, date: event.startTime };

    return {
      status: true,
      data: {
        event: eventForClient,
        summary,
      },
    };
  }
}
