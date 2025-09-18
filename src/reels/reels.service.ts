// import {
//   BadRequestException,
//   ConflictException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { Prisma, ReelPlatform } from '@prisma/client';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { CreateReelsDto } from './dto/create.dto';
// import { QueryReelsDto } from './dto/query.dto';
// import { UpdateReelsDto } from './dto/update.dto';

// @Injectable()
// export class ReelsService {
//   constructor(private readonly prisma: PrismaService) {}

//   // Normalize input string to a pure videoId depending on platform.
//   private extractVideoId(input: string, platform: ReelPlatform): string {
//     const trimmed = input.trim();
//     try {
//       // If it's not a URL, treat as pure id
//       const isUrl = /^https?:\/\//i.test(trimmed);
//       if (!isUrl) return trimmed;
//       const url = new URL(trimmed);
//       const path = url.pathname;

//       if (platform === 'YOUTUBE') {
//         const v = url.searchParams.get('v');
//         if (v) return v;
//         // youtu.be/ID or /shorts/ID
//         const parts = path.split('/').filter(Boolean);
//         if (url.hostname.includes('youtu.be') && parts[0]) return parts[0];
//         const shortsIdx = parts.indexOf('shorts');
//         if (shortsIdx !== -1 && parts[shortsIdx + 1])
//           return parts[shortsIdx + 1];
//       }

//       if (platform === 'TIKTOK') {
//         // .../video/ID
//         const match = path.match(/\/video\/(\d+)/);
//         if (match?.[1]) return match[1];
//       }

//       if (platform === 'FACEBOOK') {
//         // /watch/?v=ID or /reel/ID
//         const v = url.searchParams.get('v');
//         if (v) return v;
//         const match = path.match(/\/(?:reel|videos)\/([\w-]+)/);
//         if (match?.[1]) return match[1];
//       }

//       // Fallback: last path segment
//       const segments = path.split('/').filter(Boolean);
//       if (segments.length) return segments[segments.length - 1];
//       return trimmed;
//     } catch {
//       return trimmed;
//     }
//   }

//   async create(dto: CreateReelsDto, createdById: string) {
//     const videoId = this.extractVideoId(dto.videoId, dto.platform);
//     try {
//       const created = await this.prisma.reels.create({
//         data: {
//           platform: dto.platform,
//           videoId,
//           title: dto.title,
//           description: dto.description,
//           thumbnail: dto.thumbnail,
//           duration: dto.duration ?? null,
//           isActive: dto.isActive ?? true,
//           createdById,
//           experienceId: dto.experienceId,
//         },
//       });
//       return created;
//     } catch (e) {
//       if (
//         e instanceof Prisma.PrismaClientKnownRequestError &&
//         e.code === 'P2002'
//       ) {
//         throw new ConflictException(
//           'Reel already exists for this platform/videoId',
//         );
//       }
//       throw e;
//     }
//   }

//   async findAll(query: QueryReelsDto) {
//     const {
//       cursor,
//       limit,
//       platform,
//       experienceId,
//       createdById,
//       isActive,
//       search,
//       createdAfter,
//       createdBefore,
//       sortBy,
//       sortOrder,
//     } = query;

//     const where: Prisma.ReelsWhereInput = {
//       deletedAt: null,
//       ...(platform ? { platform } : {}),
//       ...(experienceId ? { experienceId } : {}),
//       ...(createdById ? { createdById } : {}),
//       ...(typeof isActive === 'boolean' ? { isActive } : {}),
//       ...(search
//         ? {
//             OR: [
//               { title: { contains: search, mode: 'insensitive' } },
//               { description: { contains: search, mode: 'insensitive' } },
//             ],
//           }
//         : {}),
//       ...(createdAfter || createdBefore
//         ? {
//             createdAt: {
//               ...(createdAfter ? { gte: createdAfter } : {}),
//               ...(createdBefore ? { lte: createdBefore } : {}),
//             },
//           }
//         : {}),
//     };

//     const orderBy: Prisma.ReelsOrderByWithRelationInput[] = [
//       { [sortBy!]: sortOrder },
//       { id: sortOrder }, // ensure stable order for cursor pagination
//     ];

//     const take = Number(limit ?? 20) + 1; // fetch one extra to detect next page
//     const items = await this.prisma.reels.findMany({
//       where,
//       orderBy,
//       take,
//       ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
//     });

//     const hasNext = items.length > Number(limit ?? 20);
//     const data = hasNext ? items.slice(0, Number(limit ?? 20)) : items;
//     const nextCursor = hasNext ? data[data.length - 1]?.id : undefined;

//     return {
//       data,
//       pagination: {
//         hasNext,
//         nextCursor,
//       },
//     };
//   }

//   async findOne(id: string) {
//     const reel = await this.prisma.reels.findFirst({
//       where: { id, deletedAt: null },
//     });
//     if (!reel) throw new NotFoundException('Reel not found');
//     return reel;
//   }

//   async update(id: string, dto: UpdateReelsDto) {
//     const existing = await this.prisma.reels.findFirst({
//       where: { id, deletedAt: null },
//     });
//     if (!existing) throw new NotFoundException('Reel not found');

//     const data: Prisma.ReelsUpdateInput = { ...dto } as any;
//     if (dto.videoId && (dto as any).platform) {
//       data.videoId = this.extractVideoId(dto.videoId, (dto as any).platform);
//     } else if (dto.videoId) {
//       data.videoId = this.extractVideoId(dto.videoId, existing.platform);
//     }

//     try {
//       return await this.prisma.reels.update({ where: { id }, data });
//     } catch (e) {
//       if (
//         e instanceof Prisma.PrismaClientKnownRequestError &&
//         e.code === 'P2002'
//       ) {
//         throw new ConflictException(
//           'Reel already exists for this platform/videoId',
//         );
//       }
//       throw e;
//     }
//   }

//   async remove(id: string) {
//     const reel = await this.prisma.reels.findFirst({
//       where: { id, deletedAt: null },
//     });
//     if (!reel) throw new NotFoundException('Reel not found');
//     return this.prisma.reels.update({
//       where: { id },
//       data: { deletedAt: new Date() },
//     });
//   }

//   async restore(id: string) {
//     const reel = await this.prisma.reels.findUnique({ where: { id } });
//     if (!reel) throw new NotFoundException('Reel not found');
//     return this.prisma.reels.update({
//       where: { id },
//       data: { deletedAt: null },
//     });
//   }

//   async hardDelete(id: string) {
//     try {
//       return await this.prisma.reels.delete({ where: { id } });
//     } catch (e) {
//       if (
//         e instanceof Prisma.PrismaClientKnownRequestError &&
//         e.code === 'P2025'
//       ) {
//         throw new NotFoundException('Reel not found');
//       }
//       throw e;
//     }
//   }
// }
