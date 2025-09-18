import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  Frequency,
  Prisma,
  RecurrenceRule,
  BookingStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { addDays } from 'date-fns';
import { addDaysUTC } from 'src/common/utc';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';
import { RecurrenceUtils } from 'src/utils/recurrence.utils';
import { createSingleEventSchema } from './dto/create.single.event.dto';
import { eventQuerySchema } from './dto/event.query.dto';
import { queryEventSchema } from './dto/query.dto';
import { UpdateEventDto, updateEventSchema } from './dto/update.event.dto';
import { adminEventQuerySchema } from './dto/admin.query.dto';
import { singleEventQuerySchema } from './dto/singleEventQuery.dto';

interface CustomEventsUpdateInput extends Prisma.EventsUpdateInput {
  recurringRules: JSON;
}

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

  //create single event
  async createSingleEvent(body: any) {
    //validate body
    const validatedBody = createSingleEventSchema.safeParse(body);
    if (!validatedBody.success)
      throw new BadRequestException(validatedBody.error.message);
    //validate experience
    const experience = await this.prisma.experience.findUnique({
      where: { id: validatedBody.data.experienceId },
    });
    if (!experience) throw new NotFoundException('Experience not found');

    const startTime = new Date(validatedBody.data.startTime).toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );

    const endTime = new Date(validatedBody.data.endDate).toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );

    //check already event exists
    const eventExists = await this.prisma.events.findFirst({
      where: {
        experienceId: validatedBody.data.experienceId,
        date: validatedBody.data.date,
      },
    });
    if (eventExists) throw new BadRequestException('Event already exists');

    //check experience status
    if (experience.status !== 'PUBLISHED')
      throw new BadRequestException('Experience is not published');

    const event = await this.prisma.events.create({
      data: {
        experienceId: validatedBody.data.experienceId,
        title: validatedBody.data.title,
        date: validatedBody.data.date,
        startTime,
        endTime,
        maxGuest: validatedBody.data.maxGuest,
        maxperSlot: validatedBody.data.maxperSlot,
        discount: validatedBody.data.discount,
        duration: validatedBody.data.duration,
        discountType: validatedBody.data.discountType,
        price: validatedBody.data.price,
        maxparticipants: validatedBody.data.maxparticipants,
        notes: validatedBody.data.notes,
        status: EventStatus.SCHEDULE,
        timeslots: validatedBody.data.timeslots,
        activities: validatedBody.data.activities,
        isAvailable: true,
      },
    });

    //send Notifications
    await this.notificationService.createAndQueueNotification(
      experience.userId,
      {
        type: 'EVENT',
        title: `Create New Events Date:${event.date.toLocaleDateString()}`,
        message: `Create Custom Event Successfully created`,
        link: `/explore/${experience.slug}`,
      },
    );
    return {
      status: true,
      message: 'Event created successfully',
      data: event,
    };
  }

  // (locking helpers removed; not used)

  // ========== experience readiness check ==========
  async checkExperienceReadyForEvent(experienceId: string) {
    // (kept same as your implementation but you may choose to tighten conditions)
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      include: { events: true, recurrenceRules: true },
    });

    if (!experience) throw new NotFoundException('Experience not found');

    // required fields set — you may decide which are strictly mandatory
    const required = [
      'startDate',
      'endDate',
      'startTime',
      'endTime',
      'maxGuest',
      'price',
      'status',
      'agreement',
      'city',
      'country',
      'categoryId',
      'name',
    ];
    for (const f of required) {
      // @ts-ignore
      if (!experience[f]) {
        return { status: false, message: `Missing required field: ${f}` };
      }
    }

    if (
      experience.scheduleType === 'RECURRING' &&
      !experience.recurrenceRules
    ) {
      return {
        status: false,
        message: 'Missing recurringRules for RECURRING schedule',
      };
    }

    return { status: true, message: 'Ready for Event' };
  }

  // ========== queue helpers ==========
  async eventQueueListener(experienceId: string) {
    this.logger.log('Event Queue Listener started');
    await this.eventQueue.add('initiate-event', { experienceId });
  }

  // ========== initiateEvent ==========
  async initiateEvent(experienceId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      include: { events: true, recurrenceRules: true },
    });

    if (!experience) throw new NotFoundException('Experience not found');

    if (experience.events.length > 0)
      throw new ConflictException('Event(s) already exist for this experience');

    const {
      startDate,
      endDate,
      startTime,
      endTime,
      maxGuest,
      price,
      discount,
      discountType,
      activities,
      maxparticipants,
      scheduleType,
      recurrenceRules,
      maxPerSlot,
      notes,
    } = experience;

    if (
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !maxGuest ||
      !maxparticipants ||
      !price
    ) {
      throw new NotAcceptableException(
        'Missing required fields for event creation',
      );
    }

    if (experience.scheduleType === 'RECURRING') {
      if (!recurrenceRules)
        throw new BadRequestException('Missing recurringRules');
      const { frequency, byday } = recurrenceRules as RecurrenceRule;
      if (!frequency || !byday)
        throw new BadRequestException('Invalid recurrence rule');

      return this.createRecurringEvent(experienceId);
    }

    //prisma transactions
    await this.prisma.$transaction(async (tx) => {
      //create event
      await tx.events.create({
        data: {
          experienceId,
          title: experience.name,
          date: this.toUTCMidnight(startDate),
          duration: experience.duration,
          startTime,
          endTime,
          maxGuest,
          maxperSlot: maxPerSlot,
          price,
          discount,
          discountType,
          activities: JSON.stringify(activities),
          maxparticipants,
          availableTickets: maxparticipants,
          notes,
        },
      });

      await tx.experience.update({
        where: { id: experienceId },
        data: { status: 'PUBLISHED' },
      });

      await this.notificationService.createAndQueueNotification(
        experience.userId,
        {
          type: 'EVENT',
          title: `${experience.name} Event Created and Published`,
          message: `Your event ${experience.name} has been created successfully.`,
          link: `/explore/${experience.slug}`,
        },
      );
    });

    return {
      status: true,
      message: `Event created successfully (ONTIME) and Published`,
    };
  }

  // ========== updateEvent ==========
  async updateEvent(id: string, body: UpdateEventDto) {
    const parseBody = updateEventSchema.safeParse(body);
    if (!parseBody.success)
      throw new BadRequestException(parseBody.error.errors);

    const { maxparticipants } = parseBody.data;
    const event = await this.prisma.events.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    if (event.date < new Date())
      throw new NotAcceptableException('Event already passed');

    const bookings = await this.prisma.booking.count({
      where: { eventId: id },
    });
    if (maxparticipants && bookings >= maxparticipants)
      throw new NotAcceptableException('Max participants reached');

    await this.prisma.events.update({ where: { id }, data: parseBody.data });
    return { status: true, message: 'Event updated successfully' };
  }

  // ========== updateRecurringRuleinExistingEvent ==========
  async updateRecurringRuleinExistingEvent(eventId: string, rule: Object) {
    return this.prisma.events.update({
      where: { id: eventId },
      data: { recurringRules: rule } as CustomEventsUpdateInput,
    });
  }

  /**
   * Create events for specific target dates (UTC midnight) for a recurring experience.
   * Returns number of created rows (skips duplicates via unique index).
   */
  async generateEventsForTargetDates(
    experienceId: string,
    targetDates: Date[],
  ): Promise<{ created: number; considered: number }> {
    // Use distributed lock to prevent concurrent event generation for same experience
    const lockKey = `event-generation:${experienceId}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockTTL = 60000; // 1 minute

    const acquired = await this.acquireDistributedLock(
      lockKey,
      lockValue,
      lockTTL,
    );
    if (!acquired) {
      this.logger.warn(
        `generateEventsForTargetDates: could not acquire lock for exp=${experienceId}, skipping`,
      );
      return { created: 0, considered: targetDates.length };
    }

    try {
      return await this.doGenerateEventsForTargetDates(
        experienceId,
        targetDates,
      );
    } finally {
      await this.releaseDistributedLock(lockKey, lockValue);
    }
  }

  private async doGenerateEventsForTargetDates(
    experienceId: string,
    targetDates: Date[],
  ): Promise<{ created: number; considered: number }> {
    const exp = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      include: { recurrenceRules: true },
    });

    // Debug context moved to logger below; avoid console logs in production

    if (!exp) throw new NotFoundException('Experience not found');

    // Support ONTIME: if targetDates includes the experience startDate (UTC), create the event
    if (exp.scheduleType === 'ONTIME') {
      if (!exp.startDate) return { created: 0, considered: targetDates.length };
      const startUTC = this.toUTCMidnight(exp.startDate);
      const norm = (d: Date) =>
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const matches = targetDates
        .map(norm)
        .some((d) => d.getTime() === startUTC.getTime());
      if (!matches) return { created: 0, considered: targetDates.length };

      const row = {
        experienceId: exp.id,
        title: exp.name,
        date: startUTC,
        startTime: exp.startTime ?? null,
        endTime: exp.endTime ?? null,
        maxGuest: exp.maxGuest ?? 0,
        maxperSlot: (exp as any).maxPerSlot ?? null,
        price: exp.price,
        discount: exp.discount,
        discountType: exp.discountType,
        duration: exp.duration,
        notes: exp.notes ?? null,
        status: EventStatus.SCHEDULE,
        activities: (exp as any).activities ?? [],
        timeslots: (exp as any).timeslots ?? [],
        isAvailable: true,
        maxparticipants: exp.maxparticipants ?? 0,
        availableTickets: exp.maxparticipants ?? 0,
      } as const;

      const result = await this.prisma.events.createMany({
        data: [row],
        skipDuplicates: true,
      });

      if (exp.status !== 'PUBLISHED') {
        await this.prisma.experience.update({
          where: { id: exp.id },
          data: { status: 'PUBLISHED' },
        });
      }

      return { created: result.count, considered: targetDates.length };
    }
    // RECURRING behavior below
    if (exp.scheduleType !== 'RECURRING') {
      return { created: 0, considered: targetDates.length };
    }
    if (!exp.recurrenceRules) {
      throw new BadRequestException('Missing recurrence rules');
    }

    const rules = exp.recurrenceRules;

    // Log incoming request context for diagnostics
    this.logger.debug(
      `generateEventsForTargetDates: exp=${exp.id}, scheduleType=${exp.scheduleType}, targets=${targetDates
        .map((d) => d.toISOString().slice(0, 10))
        .join(',')}, rules.byday=${(rules as any)?.byday}`,
    );

    const weekdayCode = (
      d: Date,
    ): 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' => {
      const wd = d.getUTCDay();
      return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][wd] as any;
    };

    const norm = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    const startDateBound = exp.startDate
      ? this.toUTCMidnight(exp.startDate)
      : null;
    const endDateBound = exp.endDate ? this.toUTCMidnight(exp.endDate) : null;
    const untilBound = rules.until
      ? this.toUTCMidnight(new Date(rules.until))
      : null;

    // Normalize byday to uppercase 2-letter weekday codes for robustness
    const bydayNormalized: Array<
      'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'
    > = ((rules.byday as any[]) || [])
      .map((s) => (typeof s === 'string' ? s.toUpperCase() : s))
      .filter((s) =>
        ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].includes(s),
      ) as any;

    // Adjust each input date forward up to 6 days to the next matching weekday if needed
    const adjustedDates: Date[] = [];
    for (const raw of targetDates) {
      const base = norm(raw);
      let candidate = base;
      let steps = 0;
      while (
        steps < 7 &&
        bydayNormalized.length > 0 &&
        !bydayNormalized.includes(weekdayCode(candidate))
      ) {
        candidate = norm(addDaysUTC(candidate, 1));
        steps++;
      }
      // If no byday set, we won't create anything; if set, push the matching candidate (could be base)
      if (bydayNormalized.length > 0) {
        adjustedDates.push(candidate);
      }
    }

    // Deduplicate adjusted dates
    const dedupKey = (d: Date) => d.toISOString();
    const uniqueAdjusted = Array.from(
      new Map(adjustedDates.map((d) => [dedupKey(d), d])).values(),
    );

    const validDates = uniqueAdjusted.filter((d) => {
      if (startDateBound && d < startDateBound) return false;
      if (endDateBound && d > endDateBound) return false;
      if (untilBound && d > untilBound) return false;
      return true;
    });

    if (validDates.length === 0) {
      this.logger.debug(
        `generateEventsForTargetDates: no valid dates after adjustment for exp=${exp.id}; byday=${bydayNormalized.join(
          ',',
        )}, startBound=${startDateBound?.toISOString() ?? 'null'}, endBound=${
          endDateBound?.toISOString() ?? 'null'
        }, until=${untilBound?.toISOString() ?? 'null'}`,
      );
      return { created: 0, considered: targetDates.length };
    }

    // Pre-insert validation: ensure minimally required fields are present
    const missing: string[] = [];
    if (exp.price === null || exp.price === undefined) missing.push('price');
    if (exp.maxGuest === null || exp.maxGuest === undefined)
      missing.push('maxGuest');

    if (missing.length > 0) {
      this.logger.debug(
        `generateEventsForTargetDates: skipping insert for exp=${exp.id} due to missing fields: ${missing.join(
          ', ',
        )}`,
      );
      return { created: 0, considered: targetDates.length };
    }

    const rows = validDates.map((dateUTC) => ({
      experienceId: exp.id,
      title: exp.name,
      date: dateUTC,
      startTime: exp.startTime ?? null,
      endTime: exp.endTime ?? null,
      maxGuest: exp.maxGuest!,
      maxperSlot: (exp as any).maxPerSlot ?? null,
      price: exp.price!,
      discount: exp.discount,
      discountType: exp.discountType,
      duration: exp.duration,
      notes: exp.notes ?? null,
      status: EventStatus.SCHEDULE,
      activities: (exp as any).activities ?? [],
      timeslots: (exp as any).timeslots ?? [],
      isAvailable: true,
      maxparticipants: exp.maxparticipants ?? 0,
      availableTickets: exp.maxparticipants ?? 0,
    }));

    // Process in chunks to avoid large transaction locks and improve performance
    let totalCreated = 0;
    const chunkSize = Math.min(this.CHUNK_SIZE, rows.length);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      try {
        const result = await this.prisma.events.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        totalCreated += result.count;

        this.logger.debug(
          `generateEventsForTargetDates: chunk ${Math.floor(i / chunkSize) + 1} created ${result.count}/${chunk.length} events for exp=${exp.id}`,
        );
      } catch (e: any) {
        // Handle duplicate key violations gracefully
        if (e?.code === 'P2002') {
          this.logger.warn(
            `generateEventsForTargetDates: duplicate events detected for exp=${exp.id}, chunk ${Math.floor(i / chunkSize) + 1} - continuing`,
          );
          continue;
        }

        // Surface other Prisma error code/details to logs for diagnosis
        const code = e?.code || 'UNKNOWN';
        const meta = e?.meta ? JSON.stringify(e.meta) : '';
        this.logger.error(
          `generateEventsForTargetDates: createMany failed for exp=${exp.id} code=${code} meta=${meta} message=${e?.message}`,
        );
        throw e;
      }
    }

    const result = { count: totalCreated };

    const maxDate = rows.reduce(
      (max, r) => (r.date > max ? r.date : max),
      rows[0].date,
    );
    await this.prisma.recurrenceRule.update({
      where: { experienceId: exp.id },
      data: { nextRecurrence: maxDate },
    });

    if (exp.status !== 'PUBLISHED') {
      await this.prisma.experience.update({
        where: { id: exp.id },
        data: { status: 'PUBLISHED' },
      });
    }

    this.logger.debug(
      `generateEventsForTargetDates: created=${result.count} for exp=${exp.id} from targets=${targetDates
        .map((d) => d.toISOString().slice(0, 10))
        .join(',')} adjusted=${validDates
        .map((d) => d.toISOString().slice(0, 10))
        .join(',')}`,
    );
    return { created: result.count, considered: targetDates.length };
  }

  // ========== queries ==========
  async getEventsByExperience(id: string, query: any) {
    const parseQuery = queryEventSchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException(parseQuery.error.errors);

    const {
      search,
      limit = '10',
      page = '1',
      sortBy = 'date',
      sortOrder = 'desc',
    } = parseQuery.data;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { experienceId: id };
    if (search)
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.events.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy || 'date']: sortOrder || 'desc' },
      }),
      this.prisma.events.count({ where }),
    ]);

    const hasNext = total > parseInt(page) * parseInt(limit);
    const hasPrev = parseInt(page) > 1;

    return {
      status: true,
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext,
      hasPrev,
    };
  }
  async getEventsByExperienceAdmin(id: string, query: any) {
    const parseQuery = queryEventSchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException(parseQuery.error.errors);

    const {
      search,
      limit = '10',
      page = '1',
      sortBy = 'date',
      sortOrder = 'desc',
    } = parseQuery.data;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { experienceId: id };
    if (search)
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.events.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      this.prisma.events.count({ where }),
    ]);

    const hasNext = total > parseInt(page) * parseInt(limit);
    const hasPrev = parseInt(page) > 1;

    return {
      status: true,
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext,
      hasPrev,
    };
  }

  async getAllEvents() {
    return this.prisma.events.findMany();
  }

  async adminGetAllEvents(query: any) {
    console.log('adminGetAllEvents', query);
    const parsedQuery = adminEventQuerySchema.safeParse(query);
    if (!parsedQuery.success)
      throw new BadRequestException(parsedQuery.error.errors);

    const {
      search,
      limit = '10',
      page = '1',
      sortBy = 'date',
      sortOrder = 'desc',
      experienceId,
      userId,
      status,
      from,
      to,
    } = parsedQuery.data;

    const limitInt = Number(limit);
    const pageInt = Number(page);
    const skip = (pageInt - 1) * limitInt;

    // Build base where clause
    const where: Prisma.EventsWhereInput = {
      ...(status ? { status } : {}),
      ...(experienceId ? { experienceId } : {}),
      ...(userId ? { experience: { userId } } : {}),
    };

    // Robust search handling (supports key=value or free text)
    if (search) {
      const s = String(search).trim();
      if (s.includes('=')) {
        const idx = s.indexOf('=');
        const key = s.slice(0, idx).trim();
        const val = s.slice(idx + 1).trim();
        if (val) {
          switch (key) {
            case 'id':
              (where as any).id = { equals: val };
              break;
            case 'title':
              (where as any).title = { contains: val, mode: 'insensitive' };
              break;
            case 'experienceId':
              (where as any).experienceId = { equals: val };
              break;
            case 'experienceName':
              (where as any).experience = {
                ...(where as any).experience,
                name: { contains: val, mode: 'insensitive' },
              };
              break;
            default:
              (where as any).OR = [
                { id: { contains: s, mode: 'insensitive' } },
                { title: { contains: s, mode: 'insensitive' } },
                { experience: { name: { contains: s, mode: 'insensitive' } } },
              ];
          }
        }
      } else {
        (where as any).OR = [
          { id: { contains: s, mode: 'insensitive' } },
          { title: { contains: s, mode: 'insensitive' } },
          { experience: { name: { contains: s, mode: 'insensitive' } } },
        ];
      }
    }

    // Resolve date range for analytics window
    const now = new Date();
    const parseLocalYmd = (s: string) => {
      const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        return new Date(y, mo, d);
      }
      return new Date(s);
    };

    let startAt: Date;
    let endAt: Date;

    if (from || to) {
      startAt = from
        ? parseLocalYmd(from)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      endAt = to ? parseLocalYmd(to) : now;
      startAt.setHours(0, 0, 0, 0);
      endAt.setHours(23, 59, 59, 999);
    } else {
      // default window: current month
      startAt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endAt = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    // If a custom date range was provided, constrain the list by createdAt
    const whereWithDate: Prisma.EventsWhereInput = {
      ...where,
      ...(from || to
        ? {
            date: {
              gte: startAt,
              lte: endAt,
            },
          }
        : {}),
    };

    // Fetch paginated events for admin list view
    const [events, total] = await this.prisma.$transaction([
      this.prisma.events.findMany({
        where: whereWithDate,
        skip,
        take: limitInt,
        orderBy: { [sortBy]: sortOrder as any },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          price: true,
          maxGuest: true,
          maxparticipants: true,
          availableTickets: true,
          createdAt: true,
          updatedAt: true,
          experience: {
            select: {
              id: true,
              name: true,
              userId: true,
              coverImage: true,
              city: true,
              price: true,
            },
          },
          _count: { select: { bookings: true, reviews: true } },
        },
      }),
      this.prisma.events.count({ where: whereWithDate }),
    ]);

    const eventIds = events.map((e) => e.id);

    // Compute metrics for the selected window across the page events
    const [bookingAgg, reviewAgg] = await this.prisma.$transaction([
      this.prisma.booking.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: eventIds.length ? eventIds : [''] },
          createdAt: { gte: startAt, lte: endAt },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
        orderBy: { eventId: 'asc' },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.review.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: eventIds.length ? eventIds : [''] },
          createdAt: { gte: startAt, lte: endAt },
          status: 'APPROVED',
        },
        orderBy: { eventId: 'asc' },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ]);

    const bookingMap = new Map(
      bookingAgg.map((b: any) => [
        b.eventId,
        {
          count: Number(b._count?._all || 0),
          revenue: Number(b._sum?.total || 0),
        },
      ]),
    );
    const reviewMap = new Map(
      reviewAgg.map((r: any) => [
        r.eventId,
        {
          count: Number(r._count?._all || 0),
          avg: Number(r._avg?.rating || 0),
        },
      ]),
    );

    const enriched = events.map((e) => {
      const b = bookingMap.get(e.id) || { count: 0, revenue: 0 };
      const r = reviewMap.get(e.id) || { count: 0, avg: 0 };
      return {
        ...e,
        windowBookingCount: b.count,
        windowRevenue: b.revenue,
        windowReviewCount: r.count,
        windowAvgRating: r.avg,
      };
    });

    return {
      status: true,
      data: enriched,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
      },
      window: { startAt, endAt, period: from || to ? 'custom' : 'monthly' },
      filters: {
        search,
        status,
        sortBy,
        sortOrder,
        experienceId,
        userId,
        from,
        to,
      },
    };
  }

  async getEventById(id: string, query: any) {
    const parseQuery = eventQuerySchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException(parseQuery.error.errors);

    const {
      page = '1',
      limit = '10',
      cursor,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      includeParticipants = true,
    } = parseQuery.data;

    // Get the event first
    const event = await this.prisma.events.findUnique({
      where: { id },
      include: {
        experience: {
          select: {
            id: true,
            name: true,
            slug: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    // Build where clause for participants
    const where: any = {
      eventId: id,
      deletedAt: null, // Exclude soft-deleted bookings
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            phone: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [participants, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        take: parseInt(limit),
        skip: skip,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        select: {
          id: true,
          guestCount: true,
          total: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Offset-based pagination

    // Calculate pagination metadata
    const currentPage = parseInt(page);
    const pageSize = parseInt(limit);
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = cursor
      ? participants.length === pageSize
      : currentPage < totalPages;
    const hasPrev = cursor ? !!cursor : currentPage > 1;

    // Get next and previous cursors for cursor-based pagination
    const nextCursor =
      cursor && participants.length > 0
        ? participants[participants.length - 1].id
        : null;
    const prevCursor =
      cursor && participants.length > 0 ? participants[0].id : null;

    // Calculate summary statistics
    const summary = {
      totalParticipants: total,
      totalGuests: participants.reduce(
        (sum, booking) => sum + booking.guestCount,
        0,
      ),
      totalRevenue: participants.reduce(
        (sum, booking) => sum + Number(booking.total),
        0,
      ),
      statusBreakdown: await this.prisma.booking.groupBy({
        by: ['status'],
        where: { eventId: id, deletedAt: null },
        _count: {
          status: true,
        },
      }),
    };

    return {
      status: true,
      data: {
        event,
        participants: {
          data: participants,
          summary,
          pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages,
            hasNext,
            hasPrev,
            ...(cursor && {
              cursor: {
                current: cursor,
                next: nextCursor,
                prev: prevCursor,
              },
            }),
          },
          filters: {
            search,
            status,
            sortBy,
            sortOrder,
          },
        },
      },
    };
  }

  async adminGetSingleEventById(id: string, query: any) {
    const parseQuery = eventQuerySchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException(parseQuery.error.errors);

    // Fetch event details first
    const event = await this.prisma.events.findUnique({
      where: { id },
      include: {
        experience: {
          select: {
            id: true,
            name: true,
            slug: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    // Participants query builder

    const [total, statusBreakdown, totals] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: { eventId: id, deletedAt: null } }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { eventId: id, deletedAt: null },
        orderBy: { status: 'asc' },
        _count: { status: true },
      }),
      this.prisma.booking.aggregate({
        where: { eventId: id, deletedAt: null },
        _sum: { total: true, guestCount: true },
        _count: { _all: true },
      }),
    ]);

    // Summary
    const summary = {
      totalParticipants: Number(totals._count?._all || 0),
      totalGuests: Number(totals._sum?.guestCount || 0),
      totalRevenue: Number(totals._sum?.total || 0),
      availableTickets: Number(event.availableTickets || 0),
      statusBreakdown,
      reviews: await this.prisma.review.groupBy({
        by: ['status'],
        where: { eventId: id },
        orderBy: { status: 'asc' },
        _count: { status: true },
      }),
    };

    return {
      status: true,
      data: {
        event,
        summary,
      },
    };
  }

  async adminGetEventParticipants(id: string, query: any) {
    const parseQuery = singleEventQuerySchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException(parseQuery.error.errors);

    const {
      page = '1',
      limit = '10',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      from,
      to,
    } = parseQuery.data;

    // Ensure event exists
    const event = await this.prisma.events.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    // Map incoming status (string) to Prisma enum to satisfy BookingWhereInput
    const statusFilter:
      | Prisma.EnumBookingStatusFilter
      | BookingStatus
      | undefined =
      status && Object.values(BookingStatus).includes(status as BookingStatus)
        ? (status as BookingStatus)
        : undefined;

    // Resolve date range for analytics window
    const now = new Date();
    const parseLocalYmd = (s: string) => {
      const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        return new Date(y, mo, d);
      }
      return new Date(s);
    };

    let startAt: Date;
    let endAt: Date;

    if (from || to) {
      startAt = from
        ? parseLocalYmd(from)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      endAt = to ? parseLocalYmd(to) : now;
      startAt.setHours(0, 0, 0, 0);
      endAt.setHours(23, 59, 59, 999);
    } else {
      // default window: current month
      startAt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endAt = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    const where: Prisma.BookingWhereInput = {
      eventId: id,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { phone: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(from || to ? { createdAt: { gte: startAt, lt: endAt } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        take,
        skip,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        select: {
          id: true,
          guestCount: true,
          total: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      status: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      filters: { search, status, sortBy, sortOrder },
    };
  }

  async adminGetEventById(id: string, query: any) {
    const parseQuery = eventQuerySchema.safeParse(query);
    if (!parseQuery.success)
      throw new NotAcceptableException(parseQuery.error.errors);

    const {
      page = '1',
      limit = '10',
      cursor,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
    } = parseQuery.data;

    this.logger.debug(
      `adminGetEventById query: ${JSON.stringify(parseQuery.data)}`,
    );

    // Get the event first
    const event = await this.prisma.events.findUnique({
      where: { id },
      include: {
        experience: {
          select: {
            id: true,
            name: true,
            slug: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    // Build where clause for participants
    const where: any = {
      eventId: id,
      deletedAt: null, // Exclude soft-deleted bookings
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            phone: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [participants, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        take: parseInt(limit),
        skip: skip,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        select: {
          id: true,
          guestCount: true,
          total: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    this.logger.debug(
      `adminGetEventById result count=${participants.length}, total=${total}`,
    );

    // Offset-based pagination

    // Calculate pagination metadata
    const currentPage = parseInt(page);
    const pageSize = parseInt(limit);
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = cursor
      ? participants.length === pageSize
      : currentPage < totalPages;
    const hasPrev = cursor ? !!cursor : currentPage > 1;

    // Get next and previous cursors for cursor-based pagination
    const nextCursor =
      cursor && participants.length > 0
        ? participants[participants.length - 1].id
        : null;
    const prevCursor =
      cursor && participants.length > 0 ? participants[0].id : null;

    // Calculate summary statistics
    const summary = {
      totalParticipants: total,
      totalGuests: participants.reduce(
        (sum, booking) => sum + booking.guestCount,
        0,
      ),
      totalRevenue: participants.reduce(
        (sum, booking) => sum + Number(booking.total),
        0,
      ),
      statusBreakdown: await this.prisma.booking.groupBy({
        by: ['status'],
        where: { eventId: id, deletedAt: null },
        _count: {
          status: true,
        },
      }),
    };

    return {
      status: true,
      data: {
        event,
        participants: {
          data: participants,
          summary,
          pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages,
            hasNext,
            hasPrev,
            ...(cursor && {
              cursor: {
                current: cursor,
                next: nextCursor,
                prev: prevCursor,
              },
            }),
          },
          filters: {
            search,
            status,
            sortBy,
            sortOrder,
          },
        },
      },
    };
  }

  // ========== createRecurringEvent (production ready) ==========
  private async createRecurringEvent(
    experienceId: string,
  ): Promise<{ status: boolean; message: string }> {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      include: {
        recurrenceRules: true,
      },
    });
    if (!experience) throw new NotFoundException('Experience not found');

    const today = this.toUTCMidnight(new Date());
    let fromDate: Date;
    if (experience.startDate) {
      fromDate = this.toUTCMidnight(experience.startDate);
    } else {
      fromDate = today;
    }

    // Calculate proper end date for recurring events
    // Default to 30 days from now if no other end date is specified
    let endDate = this.toUTCMidnight(addDays(today, 30));

    // If today is before the start date and openWindowDays is set, use that instead
    if (today < fromDate && experience.openWindowDays) {
      endDate = this.toUTCMidnight(addDays(today, experience.openWindowDays));
    }
    if (!experience.recurrenceRules) {
      throw new BadRequestException('Missing recurrence rules');
    }

    const recurrence = {
      frequency: experience.recurrenceRules.frequency as Frequency,
      interval: experience.recurrenceRules.interval as number,
      byday: experience.recurrenceRules.byday as string[],
      count: experience.recurrenceRules.count as number,
      until: experience.recurrenceRules.until as Date,
      openWindowDays: experience.recurrenceRules.openWindowDays as number,
    };

    // generate future dates using recurrence util
    const dates = RecurrenceUtils.generateDatesFromRule(
      recurrence,
      fromDate,
      100, // Increase default count for proper range
      endDate,
    );

    this.logger.debug(
      `createRecurringEvent: RecurrenceUtils generated ${dates.length} dates: ${dates
        .slice(0, 10)
        .map((d) => new Date(d).toISOString().slice(0, 10))
        .join(', ')}${dates.length > 10 ? '...' : ''}`,
    );

    // filter out dates that are <= lastGeneratedDate (defensive)

    if (!dates.length) {
      this.logger.log(`No new dates to create for experience ${experienceId}`);
      return {
        status: true,
        message: `No new dates to create for experience ${experienceId}`,
      }; // idempotent: nothing to do
    }

    try {
      // run in a transaction for atomic resume + insert + update
      return await this.prisma.$transaction(async (tx) => {
        // prepare events, ensure UTC midnight for the date field (use date + times if you want)
        const eventsToInsert = dates.map((date) => ({
          experienceId: experienceId,
          title: experience.name,
          date: this.toUTCMidnight(date),
          startTime: experience.startTime,
          endTime: experience.endTime,
          maxGuest: experience.maxGuest ?? 0,
          discount: experience.discount,
          duration: experience.duration,
          discountType: experience.discountType,
          price: experience.price,
          activities: experience.activities
            ? JSON.parse(JSON.stringify(experience.activities))
            : null,
          maxparticipants: experience.maxparticipants ?? 0,
          notes: experience.notes,
        }));

        await tx.events.createMany({
          data: eventsToInsert,
          skipDuplicates: true,
        });

        // fetch events that match the inserted dates (could be newly created or existing)
        const createdEvents = await tx.events.findMany({
          where: {
            experienceId: experienceId,
            date: { in: dates.map((d) => this.toUTCMidnight(d)) },
          },
          orderBy: { date: 'asc' },
        });

        // notify host (only if events were created)
        if (createdEvents.length) {
          await this.prisma.experience.update({
            where: { id: experienceId },
            data: {
              status: 'PUBLISHED',
            },
          });
          await this.notificationService.createAndQueueNotification(
            experience.userId,
            {
              title: `${createdEvents.length} events created for ${experience.name}`,
              message: `Events created for ${experience.name} from ${createdEvents[0].date.toISOString()} to ${createdEvents[createdEvents.length - 1].date.toISOString()}`,
              type: 'EVENT',
              link: `/host/experience/${experienceId}/events`,
            },
          );
        }

        this.logger.log(
          `Created/found ${createdEvents.length} events for ${experienceId}`,
        );
        return {
          status: true,
          message: `Event created successfully and Published`,
        };
      });
    } catch (err) {
      this.logger.error(`Failed to create recurring events: ${err}`, err.stack);
      throw new InternalServerErrorException(
        'Failed to generate recurring events',
      );
    }
  }

  // ========== utility date helpers ==========
  // ensure date stored as UTC midnight (no time component)
  private toUTCMidnight(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private addDaysUTC(date: Date, days: number): Date {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return this.toUTCMidnight(d);
  }

  // Calculate a Date (UTC) for availableAt/availableEndAt: the duration string means "Xh" or "Xd" before the event's date/time
  private calculateDateTime(startDate: Date, duration: string): Date {
    const match = duration.match(/^(\d+)(h|d)$/);
    if (!match) throw new BadRequestException('Invalid duration format');
    const value = Number(match[1]);
    const unit = match[2];

    // interpret startDate as UTC midnight + optionally combine with startTime if needed
    const base = this.toUTCMidnight(startDate);

    if (unit === 'h') {
      // subtract hours
      return new Date(base.getTime() - value * 60 * 60 * 1000);
    } else {
      // subtract days
      return new Date(base.getTime() - value * 24 * 60 * 60 * 1000);
    }
  }

  async updateAvaiableTickets() {
    const events = await this.prisma.events.findMany({
      where: {
        status: EventStatus.SCHEDULE,
      },
    });

    events.forEach(async (event) => {
      await this.prisma.events.update({
        where: {
          id: event.id,
        },
        data: {
          availableTickets: event.maxparticipants,
        },
      });
    });
    return {
      status: true,
      message: 'Event updated successfully',
    };
  }
}
