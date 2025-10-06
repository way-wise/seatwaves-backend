import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotAcceptableException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';
import { z } from 'zod';
import { createEventScehema, SeatSchema } from './dto/create.event.dto';
import { eventQuerySchema } from './dto/event.query.dto';
import { seatQuerySchema } from './dto/seat.query.dto';
import { updateSeatSchema } from './dto/update.seat.dto';

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
        seats: {
          select: {
            id: true,
            seatId: true,
            seatNumber: true,
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

  // get seat by event Id
  async getSeatsByEventId(eventId: string, query) {
    const parsedQuery = seatQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      this.logger.error('Validation failed', parsedQuery.error);
      throw new NotAcceptableException('Invalid query parameters');
    }
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotAcceptableException('Event not found');
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
        { seatId: { contains: search, mode: 'insensitive' } },
        { row: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [seats, total] = await this.prisma.$transaction([
      this.prisma.seat.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitInt,
        cursor: cursor ? { id: cursor } : undefined,
      }),
      this.prisma.seat.count({ where }),
    ]);

    const nextCursor =
      seats.length === limitInt ? seats[seats.length - 1].id : null;

    return {
      status: true,
      data: seats,
      meta: {
        total,
        page: pageInt,
        limit: limitInt,
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
      if (parsedData.data.seats.length > 0) {
        // If seats are provided, we can add them to the existing event
        const seatsToCreate = parsedData.data.seats.map((seat) => ({
          ...seat,
          sellerId: existingEvent.sellerId,
          eventId: existingEvent.id,
        }));

        // Chunk seats to avoid too-large queries
        for (let i = 0; i < seatsToCreate.length; i += this.CHUNK_SIZE) {
          const chunk = seatsToCreate.slice(i, i + this.CHUNK_SIZE);
          await this.prisma.seat.createMany({
            data: chunk,
            skipDuplicates: true, // Skip duplicates based on unique constraints
          });
        }
      }
      return { message: 'Event already exists, seats added if provided' };
    }

    const newEvent = await this.prisma.event.create({
      data: {
        title: parsedData.data.title,
        description: parsedData.data.description,
        eventId: parsedData.data.eventId,
        venue: parsedData.data.venue,
        startTime: parsedData.data.startTime,
        endTime: parsedData.data.endTime,
        duration: parsedData.data.duration,
        sellerId: sellerId,
        metadata: parsedData.data.metadata,
        categoryId: parsedData.data.categoryId,
      },
    });

    if (parsedData.data.seats.length > 0) {
      const seatsToCreate = parsedData.data.seats.map((seat) => ({
        ...seat,
        sellerId: sellerId,
        eventId: newEvent.id,
      }));

      // Chunk seats to avoid too-large queries
      for (let i = 0; i < seatsToCreate.length; i += this.CHUNK_SIZE) {
        const chunk = seatsToCreate.slice(i, i + this.CHUNK_SIZE);
        await this.prisma.seat.createMany({
          data: chunk,
          skipDuplicates: true, // Skip duplicates based on unique constraints
        });
      }

      this.logger.log(
        `Created event ${newEvent.id} with ${parsedData.data.seats.length} seats`,
      );
    }

    return {
      status: true,
      message: 'Event created successfully',
      eventId: newEvent.id,
    };
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
      seatsCreated: 0,
      seatsAddedToExisting: 0,
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
          // If seats provided, add them
          if (ev.seats && ev.seats.length > 0) {
            const seatsToCreate = ev.seats.map((seat) => ({
              ...seat,
              metaData: ev.metaData,
              eventId: existing.id,
            }));
            for (let j = 0; j < seatsToCreate.length; j += this.CHUNK_SIZE) {
              const chunk = seatsToCreate.slice(j, j + this.CHUNK_SIZE);
              await this.prisma.seat.createMany({
                data: chunk,
                skipDuplicates: true,
              });
            }
            summary.seatsAddedToExisting += ev.seats.length;
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

        if (ev.seats && ev.seats.length > 0) {
          const seatsToCreate = ev.seats.map((seat) => ({
            ...seat,
            eventId: newEvent.id,
          }));
          for (let j = 0; j < seatsToCreate.length; j += this.CHUNK_SIZE) {
            const chunk = seatsToCreate.slice(j, j + this.CHUNK_SIZE);
            await this.prisma.seat.createMany({
              data: chunk,
              skipDuplicates: true,
            });
          }
          summary.seatsCreated += ev.seats.length;
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

  // Added Seat
  async addSeatToEvent(eventId: string, seatData: any, sellerId: string) {
    const parsedData = SeatSchema.safeParse(seatData);

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

    const newSeat = await this.prisma.seat.create({
      data: {
        seatId: parsedData.data.seatId,
        sellerId: sellerId,
        metadata: parsedData.data.metadata,
        price: parsedData.data.price,
        discount: parsedData.data.discount,
        discountType: parsedData.data.discountType,
        eventId: event.id,
      },
    });

    return {
      status: true,
      message: 'Seat added successfully',
      seatId: newSeat.id,
    };
  }

  async updateSeat(seatId: string, seatData) {
    const parsedData = updateSeatSchema.safeParse(seatData);

    if (!parsedData.success) {
      this.logger.error('Validation failed', parsedData.error);
      throw new NotAcceptableException(parsedData.error.message);
    }

    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
    });

    if (!seat) {
      throw new NotAcceptableException('Seat not found');
    }

    if (seat.isBooked) {
      throw new NotAcceptableException('Seat is booked');
    }

    const updatedSeat = await this.prisma.seat.update({
      where: { id: seatId },
      data: {
        ...parsedData.data,
      },
    });

    return {
      status: true,
      message: 'Seat updated successfully',
      seatId: updatedSeat.id,
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
          seats: true,
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
  async getAllEventsAdmin(query) {
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
              seats: true,
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

  //
}
