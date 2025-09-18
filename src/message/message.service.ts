// src/message/message.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto, createMessageSchema } from './dto/message.dto';
import { Role, User, Message, Prisma } from '@prisma/client';
import {
  PaginationQueryDto,
  paginationQuerySchema,
} from './dto/pagination.dto';
import { InitMessageDto } from './dto/initMessage.dto';
import { UploadService } from 'src/upload/upload.service';
import { SidebarQuery, SidebarQuerySchema } from './dto/sidebar.dto';

interface ConversationItem {
  bookingId: string;
  experienceName: string;
  guest?: User;
  host?: User;
  lastMessage: Message | null;
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private readonly logger = new Logger(MessageService.name);

  async initiateMessage(body: InitMessageDto, userId: string) {
    const existEvent = await this.prisma.event.findUnique({
      where: {
        id: body.experienceId,
      },
    });

    if (!existEvent) {
      throw new NotFoundException('Event not found');
    }

    if (existEvent.sellerId === userId) {
      throw new BadRequestException(
        'You cannot initiate a message with yourself',
      );
    }
    type MessageRoomWhereUniqueInputWithEventId =
      Prisma.MessageRoomWhereUniqueInput & {
        senderId_receiverId_eventId: {
          senderId: string;
          receiverId: string;
          eventId: string;
        };
      };

    const exists = await this.prisma.messageRoom.findUnique({
      where: {
        senderId_receiverId_eventId: {
          senderId: userId,
          receiverId: existEvent.sellerId,
          eventId: body.experienceId,
        },
      } as MessageRoomWhereUniqueInputWithEventId,
    });

    if (exists) {
      const message = await this.prisma.message.create({
        data: {
          message: body.message,
          senderId: userId,
          receiverId: existEvent.sellerId,
          roomId: exists.id,
        },
      });
      return {
        status: true,
        roomId: message.roomId,
        data: message,
        message: 'Message sent successfully.',
      };
    }

    const newMessageRoom = await this.prisma.messageRoom.create({
      data: {
        senderId: userId,
        receiverId: existEvent.sellerId,
        eventId: body.experienceId,
        messages: {
          create: {
            message: body.message,
            senderId: userId,
            receiverId: existEvent.sellerId, // Add this line
          },
        },
      },
    });
    return {
      status: true,
      roomId: newMessageRoom.id,
      data: newMessageRoom,
      message: 'Message room created successfully.',
    };
  }

  async sendMessage(
    body: CreateMessageDto,
    userId: string,
    roomId: string,
    files: Express.Multer.File[],
  ) {
    const parsebody = createMessageSchema.safeParse(body);
    if (!parsebody.success) {
      throw new BadRequestException(parsebody.error.errors);
    }
    const existMessageRoom = await this.prisma.messageRoom.findUnique({
      where: {
        id: roomId,
      },
    });

    if (!existMessageRoom) {
      throw new NotFoundException('Message room not found');
    }

    const receiverId =
      existMessageRoom.senderId === userId
        ? existMessageRoom.receiverId
        : existMessageRoom.senderId;

    if (parsebody.data.type === 'TEXT' && parsebody.data.message) {
      const newMessage = await this.prisma.message.create({
        data: {
          message: parsebody.data.message,
          senderId: userId,
          receiverId: receiverId,
          roomId: roomId,
        },
      });

      return {
        status: true,
        data: newMessage,
        message: 'Message sent successfully.',
      };
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one media file is required.');
    }

    const uploadedResults = await Promise.all(
      files.map(async (file) => {
        const uploadResult = await this.uploadService.uploadFile(
          file,
          'messages',
        );
        const newMessage = await this.prisma.message.create({
          data: {
            message: '',
            attachment: uploadResult.Key,
            type: 'IMAGE',
            senderId: userId,
            receiverId: receiverId,
            roomId: roomId,
          },
        });
        console.log(uploadResult);
        return newMessage;
      }),
    );

    return {
      status: true,
      data: uploadedResults,
      message: 'Message sent successfully.',
    };
  }

  async getSingleRoom(id, query: PaginationQueryDto) {
    const parsebody = paginationQuerySchema.safeParse(query);

    if (!parsebody.success) {
      throw new BadRequestException(parsebody.error.errors);
    }

    const limit = parsebody.data.limit ? parseInt(parsebody.data.limit) : 10;
    const cursor = parsebody.data.cursor;

    const room = await this.prisma.messageRoom.findUnique({
      where: {
        id: id,
      },
      include: {
        messages: {
          take: limit,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: {
            sentAt: 'desc',
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Message room not found');
    }

    return {
      status: true,
      data: room,
      cursor: room.messages[room.messages.length - 1]?.id,
      message: 'Message room fetched successfully.',
    };
  }

  async getSidebar(userId: string, query: SidebarQuery) {
    const parsebody = SidebarQuerySchema.safeParse(query);

    if (!parsebody.success) {
      throw new BadRequestException(parsebody.error.errors);
    }
    const { search, cursor, limit = `10` } = parsebody.data;

    // Build where clause so that:
    // - Always restrict to rooms where current user is a participant
    // - If search is provided, filter by the OTHER participant's name
    let where: Prisma.MessageRoomWhereInput;
    if (search && search.trim() !== '') {
      where = {
        OR: [
          {
            AND: [
              { senderId: userId },
              { receiver: { name: { contains: search, mode: 'insensitive' } } },
            ],
          },
          {
            AND: [
              { receiverId: userId },
              { sender: { name: { contains: search, mode: 'insensitive' } } },
            ],
          },
        ],
      };
    } else {
      where = {
        OR: [{ senderId: userId }, { receiverId: userId }],
      };
    }

    const rooms = await this.prisma.messageRoom.findMany({
      where,
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },

        messages: {
          select: {
            id: true,
            message: true,
            isRead: true,
            sentAt: true,
          },
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip: cursor ? 1 : 0,
      take: parseInt(limit),
    });

    //rooms message sentAt descding
    rooms.sort((a, b) => {
      const dateA = new Date(a.messages[0].sentAt);
      const dateB = new Date(b.messages[0].sentAt);
      return dateB.getTime() - dateA.getTime();
    });

    return {
      status: true,
      data: rooms,
      cursor: rooms[rooms.length - 1]?.id,
      message: 'Message rooms fetched successfully.',
    };
  }

  async markAsRead(roomId: string, userId: string) {
    const exist = await this.prisma.messageRoom.findUnique({
      where: {
        id: roomId,
      },
    });

    if (!exist) {
      throw new NotFoundException('Message room not found');
    }

    const room = await this.prisma.messageRoom.update({
      where: {
        id: roomId,
      },
      data: {
        messages: {
          updateMany: {
            where: {
              receiverId: userId,
              isRead: false,
            },
            data: {
              isRead: true,
            },
          },
        },
      },
    });
    this.logger.log('Messages marked as read successfully.');
    return {
      status: true,
      data: room,
      message: 'Messages marked as read successfully.',
    };
  }

  async removeMessage(messageId: string, userId: string) {
    const exist = await this.prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!exist) {
      throw new NotFoundException('Message not found');
    }

    if (exist.senderId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this message.',
      );
    }

    if (exist.type === 'IMAGE' && exist.attachment) {
      await this.uploadService.deleteFile(exist.attachment);
      console.log('Attachment deleted');
    }

    const deletedMessage = await this.prisma.message.delete({
      where: {
        id: messageId,
      },
    });

    return {
      status: true,
      deletedMessage,
      message: 'Message deleted successfully.',
    };
  }

  async deleteRoom(roomId: string) {
    const exist = await this.prisma.messageRoom.findUnique({
      where: {
        id: roomId,
      },
    });

    if (!exist) {
      throw new NotFoundException('Message room not found');
    }

    //TODO: Remove all Attachments

    const messages = await this.prisma.message.deleteMany({
      where: {
        roomId: roomId,
      },
    });

    const deletedRoom = await this.prisma.messageRoom.delete({
      where: {
        id: roomId,
      },
    });

    return {
      status: true,
      messages,
      deletedRoom,
      message: 'Message room deleted successfully.',
    };
  }
}
