import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/query.dto';
import {
  UpdateReportStatusDto,
  updateReportStatusSchema,
  AssignReportDto,
  assignReportSchema,
  UpdateNotesDto,
  updateNotesSchema,
} from './dto/manage.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  // Create a new report by a user
  async create(dto: CreateReportDto, reporterId: string) {
    // Validate target existence based on targetType
    switch (dto.targetType) {
      case 'USER': {
        if (!dto.reportedUserId)
          throw new BadRequestException('reportedUserId is required');
        const user = await this.prisma.user.findUnique({
          where: { id: dto.reportedUserId },
        });
        if (!user) throw new NotFoundException('Reported user not found');
        break;
      }
      case 'BOOKING': {
        if (!dto.bookingId)
          throw new BadRequestException('bookingId is required');
        const booking = await this.prisma.booking.findUnique({
          where: { id: dto.bookingId },
        });
        if (!booking) throw new NotFoundException('Booking not found');
        break;
      }
      case 'EVENT': {
        if (!dto.eventId) throw new BadRequestException('eventId is required');
        const event = await this.prisma.event.findUnique({
          where: { id: dto.eventId },
        });
        if (!event) throw new NotFoundException('Event not found');
        break;
      }
      case 'TRANSACTION': {
        if (!dto.transactionId)
          throw new BadRequestException('transactionId is required');
        const txn = await this.prisma.transaction.findUnique({
          where: { id: dto.transactionId },
        });
        if (!txn) throw new NotFoundException('Transaction not found');
        break;
      }
      case 'MESSAGE': {
        if (!dto.messageId)
          throw new BadRequestException('messageId is required');
        const msg = await this.prisma.message.findUnique({
          where: { id: dto.messageId },
        });
        if (!msg) throw new NotFoundException('Message not found');
        break;
      }
      case 'OTHER':
      default:
        break;
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        type: dto.type,
        severity: dto.severity,
        subject: dto.subject,
        description: dto.description,
        attachments: dto.attachments ?? [],
        metadata: dto.metadata as any,
        reportedUserId: dto.reportedUserId,
        bookingId: dto.bookingId,
        eventId: dto.eventId,
        transactionId: dto.transactionId,
        messageId: dto.messageId,
      },
    });

    // Log activity
    await this.activity.log({
      userId: reporterId,
      type: 'REPORT',
      action: 'CREATED',
      metadata: JSON.stringify({
        reportId: report.id,
        targetType: dto.targetType,
      }),
    });

    return {
      status: true,
      message: 'Report submitted successfully',
      data: report,
    };
  }

  // Admin list all reports with filters
  async listAll(query: ReportQueryDto) {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      severity,
      type,
      targetType,
      reporterId,
      reportedUserId,
      assignedToId,
      bookingId,
      eventId,
      transactionId,
      messageId,
    } = query as ReportQueryDto & { page?: string; limit?: string };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (targetType) where.targetType = targetType;
    if (reporterId) where.reporterId = reporterId;
    if (reportedUserId) where.reportedUserId = reportedUserId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (bookingId) where.bookingId = bookingId;
    if (eventId) where.eventId = eventId;
    if (transactionId) where.transactionId = transactionId;
    if (messageId) where.messageId = messageId;

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit),
        include: this.defaultInclude(),
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      status: true,
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / parseInt(limit)),
      next: skip + parseInt(limit) < total,
      prev: skip > 0,
    };
  }

  // Reporter list own reports
  async listMine(userId: string, query: ReportQueryDto) {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      severity,
      type,
      targetType,
    } = query as ReportQueryDto & { page?: string; limit?: string };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = { reporterId: userId };
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (targetType) where.targetType = targetType;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit),
        include: this.defaultInclude(),
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      status: true,
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / parseInt(limit)),
      next: skip + parseInt(limit) < total,
      prev: skip > 0,
    };
  }

  async getById(id: string) {
    const item = await this.prisma.report.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!item) throw new NotFoundException('Report not found');
    return { status: true, data: item };
  }

  async assign(id: string, dto: AssignReportDto, actorId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    const assignedToId = dto.assignedToId ?? actorId;

    // Ensure target user exists
    const user = await this.prisma.user.findUnique({
      where: { id: assignedToId },
    });
    if (!user) throw new NotFoundException('Assignee user not found');

    const updated = await this.prisma.report.update({
      where: { id },
      data: { assignedToId, assignedAt: new Date(), status: 'IN_REVIEW' },
      include: this.defaultInclude(),
    });

    await this.activity.log({
      userId: actorId,
      type: 'REPORT',
      action: 'ASSIGNED',
      metadata: JSON.stringify({ reportId: id, assignedToId }),
    });

    return { status: true, message: 'Report assigned', data: updated };
  }

  async updateStatus(id: string, dto: UpdateReportStatusDto, actorId: string) {
    const parse = updateReportStatusSchema.safeParse(dto);
    if (!parse.success) throw new BadRequestException(parse.error.errors);

    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    const resolvedAt = parse.data.status === 'RESOLVED' ? new Date() : null;
    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: parse.data.status,
        ...(parse.data.adminNotes ? { adminNotes: parse.data.adminNotes } : {}),
        ...(resolvedAt ? { resolvedAt } : {}),
      },
      include: this.defaultInclude(),
    });

    await this.activity.log({
      userId: actorId,
      type: 'REPORT',
      action: 'STATUS_UPDATED',
      metadata: JSON.stringify({ reportId: id, status: parse.data.status }),
    });

    return { status: true, message: 'Report status updated', data: updated };
  }

  async updateNotes(id: string, dto: UpdateNotesDto, actorId: string) {
    const parse = updateNotesSchema.safeParse(dto);
    if (!parse.success) throw new BadRequestException(parse.error.errors);

    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id },
      data: { adminNotes: parse.data.adminNotes },
      include: this.defaultInclude(),
    });

    await this.activity.log({
      userId: actorId,
      type: 'REPORT',
      action: 'NOTES_UPDATED',
      metadata: JSON.stringify({ reportId: id }),
    });

    return { status: true, message: 'Notes updated', data: updated };
  }

  private defaultInclude() {
    return {
      reporter: { select: { id: true, name: true, email: true, avatar: true } },
      reportedUser: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      booking: { select: { id: true, seatId: true, userId: true } },
      event: { select: { id: true, title: true, sellerId: true } },
      transaction: {
        select: { id: true, type: true, status: true, amount: true },
      },
      message: {
        select: { id: true, roomId: true, senderId: true, receiverId: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    } as const;
  }
}
