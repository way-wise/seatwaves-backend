// // service/experience.service.ts
// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   InternalServerErrorException,
//   Logger,
//   NotAcceptableException,
//   NotFoundException,
// } from '@nestjs/common';
// import {
//   EventStatus,
//   ExperienceStatus,
//   MediaType,
//   Prisma,
//   BookingStatus,
// } from '@prisma/client';
// import { addDays } from 'date-fns';
// import { EventService } from 'src/event/event.service';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { UploadService } from 'src/upload/upload.service';
// import { detailsSchema } from './dto/details.dto';
// import {
//   InitializeExperienceDto,
//   initializeExperienceSchema,
// } from './dto/experience.create.dto';
// import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';
// import { informationSchema } from './dto/information.dto';
// import { CheckKeySchema } from './dto/key.dto';
// import { locationSchemas } from './dto/location.dto';
// import { createMediaSchema } from './dto/media.dto';
// import { preferenceSchema } from './dto/preference.dto';
// import { priceandPolicySchema } from './dto/pricePolicy.dto';
// import { querySchema } from './dto/query.dto';
// import {
//   QueryExperienceDto,
//   queryExperienceSchema,
// } from './dto/query.experience.dto';
// import { scheduleSchema } from './dto/schedule.dto';
// import { addDaysUTC, endOfUTCDay, startOfUTCDay } from 'src/common/utc';
// import { adminQuerySchema } from './dto/admin.query.dto';
// import { NotificationService } from 'src/notification/notification.service';

// @Injectable()
// export class ExperienceService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly eventService: EventService,
//     private readonly uploadService: UploadService,
//     private readonly notificationService: NotificationService,
//   ) {}
//   private readonly logger = new Logger(ExperienceService.name);

//   async experienceCreate(data: InitializeExperienceDto, userId: string) {
//     const parseData = initializeExperienceSchema.safeParse(data);

//     if (!parseData.success) {
//       throw new BadRequestException(parseData.error.errors);
//     }

//     if (!userId) {
//       throw new ConflictException('Unauthorized');
//     }

//     //Check User
//     const user = await this.prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found.');
//     }

//     //TODO: Check if host

//     const category = await this.prisma.category.findUnique({
//       where: { id: parseData.data.categoryId },
//     });

//     if (!category) {
//       throw new NotFoundException('Category not found.');
//     }

//     let slug = data.name.substring(0, 30).toLowerCase().replace(/\s/g, '-');
//     const exists = await this.prisma.experience.findUnique({
//       where: { slug },
//     });
//     if (exists) {
//       slug = `${slug}-${new Date().getTime()}`;
//     }

//     const experience = await this.prisma.experience.create({
//       data: {
//         userId: userId,
//         name: parseData.data.name,
//         shortDesc: parseData.data.shortDesc,
//         slug: slug,
//         categoryId: parseData.data.categoryId,
//       },
//     });

//     if (!experience) {
//       throw new BadRequestException('Something went wrong.');
//     }

//     return {
//       status: true,
//       message: 'Experience initialized.',
//       data: experience,
//     };
//   }

//   async updateExperience(
//     id: string,
//     data: UpdateExperienceDto,
//     query: any,
//     userId: string,
//   ) {
//     if (!userId) {
//       throw new ConflictException('Unauthorized');
//     }

//     const experience = await this.prisma.experience.findUnique({
//       where: { id },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     if (experience.userId !== userId) {
//       throw new ForbiddenException('You are not authorized.');
//     }

//     if (!(experience.status === 'DRAFT')) {
//       throw new ForbiddenException(
//         'Your Experience is not in draft. you can not update this experience.',
//       );
//     }

//     const user = await this.prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found.');
//     }

//     //TODO: Check if host

//     const parsekey = CheckKeySchema.safeParse(query);
//     console.log(parsekey);
//     if (!parsekey.success) {
//       throw new BadRequestException(parsekey.error.errors);
//     }

//     if (parsekey.data.key === 'information') {
//       const parseData = informationSchema.safeParse(data);
//       if (!parseData.success) {
//         throw new BadRequestException(parseData.error.errors);
//       }

//       const experience = await this.prisma.experience.update({
//         where: {
//           id: id,
//         },
//         data: {
//           ...parseData.data,
//         },
//       });
//       return {
//         status: true,
//         message: 'Experience Information updated.',
//         data: experience,
//       };
//     }

//     if (parsekey.data.key === 'location') {
//       const parseData = locationSchemas.safeParse(data);
//       if (!parseData.success) {
//         throw new BadRequestException(parseData.error.errors);
//       }

//       const experience = await this.prisma.experience.update({
//         where: {
//           id: id,
//         },
//         data: {
//           ...parseData.data,
//         },
//       });
//       return {
//         status: true,
//         message: 'Experience Location updated.',
//         data: experience,
//       };
//     }

//     if (parsekey.data.key === 'schedule') {
//       const parseData = scheduleSchema.safeParse(data);
//       console.log('Experience Schedule', data);
//       console.log(parseData.error);
//       if (!parseData.success) {
//         throw new BadRequestException(parseData.error.errors);
//       }

//       // Duration is in hours (e.g. 1.5, 5, 12)

//       //calculate duration
//       const duration =
//         parseData.data.endDate.getTime() - parseData.data.startDate.getTime();
//       // Format start time
//       const startTime = parseData.data.startDate.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       });

//       // Format end time
//       const endTime = parseData.data.endDate.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//       });

//       if (parseData.data.scheduleType === 'RECURRING') {
//         if (!parseData.data.recurrenceRules) {
//           throw new BadRequestException('Recurrence Rule is required.');
//         }

//         if (parseData.data.recurrenceRules.frequency === 'DAILY') {
//           parseData.data.recurrenceRules.byday = [
//             'MO',
//             'TU',
//             'WE',
//             'TH',
//             'FR',
//             'SA',
//             'SU',
//           ];
//         }

//         const update = await this.prisma.experience.update({
//           where: {
//             id: id,
//           },
//           data: {
//             scheduleType: parseData.data.scheduleType,
//             startDate: parseData.data.startDate,
//             endDate: parseData.data.endDate,
//             startTime: startTime,
//             endTime: endTime,
//             timeslots: parseData.data.timeslots,
//             duration: duration,
//             openWindowDays: parseData.data.openWindowDays,
//             recurrenceRules: {
//               upsert: {
//                 where: {
//                   experienceId: id,
//                 },
//                 update: {
//                   ...parseData.data.recurrenceRules,
//                   openWindowDays: parseData.data.openWindowDays,
//                 },
//                 create: {
//                   ...parseData.data.recurrenceRules,
//                   openWindowDays: parseData.data.openWindowDays,
//                 },
//               },
//             },
//           },
//         });
//         this.logger.log('Experience Schedule updated.');
//         return {
//           status: true,
//           message: 'Experience Schedule updated.',
//           data: update,
//         };
//       }

//       // ONTIME schedule: remove any existing recurrence rules, then persist fields
//       await this.prisma.recurrenceRule.deleteMany({
//         where: { experienceId: id },
//       });
//       const update = await this.prisma.experience.update({
//         where: { id },
//         data: {
//           scheduleType: parseData.data.scheduleType,
//           startDate: parseData.data.startDate,
//           endDate: parseData.data.endDate,
//           startTime: startTime,
//           endTime: endTime,
//           timeslots: parseData.data.timeslots,
//           openWindowDays: parseData.data.openWindowDays,
//         },
//       });
//       return {
//         status: true,
//         message: 'Experience Schedule updated.',
//         data: update,
//       };
//     }

//     if (parsekey.data.key === 'policy') {
//       const parseData = priceandPolicySchema.safeParse(data);
//       if (!parseData.success) {
//         throw new BadRequestException(parseData.error.errors);
//       }

//       const experience = await this.prisma.experience.update({
//         where: {
//           id: id,
//         },
//         data: {
//           ...parseData.data,
//         },
//       });
//       return {
//         status: true,
//         message: 'Experience Price and Policy updated.',
//         data: experience,
//       };
//     }

//     if (parsekey.data.key === 'details') {
//       const parseData = detailsSchema.safeParse(data);
//       if (!parseData.success) {
//         throw new BadRequestException(parseData.error.errors);
//       }

//       const experience = await this.prisma.experience.update({
//         where: {
//           id: id,
//         },
//         data: {
//           ...parseData.data,
//         },
//       });
//       return {
//         status: true,
//         message: 'Experience Details updated.',
//         data: experience,
//       };
//     }

//     if (parsekey.data.key === 'preference') {
//       const parseData = preferenceSchema.safeParse(data);
//       if (!parseData.success) {
//         throw new BadRequestException(parseData.error.errors);
//       }

//       const experience = await this.prisma.experience.update({
//         where: {
//           id: id,
//         },
//         data: {
//           agreement: parseData.data.agreement,
//         },
//       });

//       if (parseData.data.amenityIds.length > 0) {
//         await this.prisma.experienceAmenity.deleteMany({
//           where: { experienceId: id },
//         });
//         for (const amenityId of parseData.data.amenityIds) {
//           await this.prisma.experienceAmenity.create({
//             data: {
//               experienceId: id,
//               amenityId: amenityId,
//             },
//           });
//         }
//       }
//       return {
//         status: true,
//         message: 'Experience Preference updated.',
//         data: experience,
//       };
//     }

//     throw new BadRequestException('Something went wrong.');
//   }

//   async toggleStatus(id: string, status: ExperienceStatus, message?: string) {
//     const experience = await this.prisma.experience.findUnique({
//       where: { id },
//       include: { events: true },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     if (experience.status === status) {
//       throw new BadRequestException('Experience status is already ' + status);
//     }

//     console.log('Experience status: ' + experience.status);
//     console.log('Status: ' + status);

//     // Only Experience status PENDING then switch to PUBLISHED
//     if (status === 'PUBLISHED') {
//       //Check Ready for Publish
//       const ready = await this.eventService.checkExperienceReadyForEvent(id);

//       if (!ready.status) {
//         throw new BadRequestException(ready.message);
//       }

//       //check if experience has events
//       if (experience.events.length === 0) {
//         // Initiate events if none exist and return a consistent JSON response
//         await this.eventService.initiateEvent(id);

//         // Optionally, mark as published immediately to keep status consistent
//         await this.prisma.experience.update({
//           where: { id },
//           data: { status: 'PUBLISHED' },
//         });

//         //send notification to host
//         await this.notificationService.sendNotification(experience.userId, {
//           title: 'Experience Published',
//           message: 'Your experience is published.',
//           type: 'EXPERIENCE',
//           experienceId: id,
//           userId: experience.userId,
//         });

//         return {
//           status: true,
//           message: 'Experience status updated successfully.',
//         };
//       }

//       //Update Status
//       await this.prisma.experience.update({
//         where: { id },
//         data: { status: 'PUBLISHED' },
//       });

//       //send notification to host
//       await this.notificationService.sendNotification(experience.userId, {
//         title: 'Experience Published',
//         message: 'Your experience is published.',
//         type: 'EXPERIENCE',
//         experienceId: id,
//         userId: experience.userId,
//       });

//       return {
//         status: true,
//         message: 'Experience status updated successfully.',
//       };
//     }

//     if (status === 'REJECTED') {
//       await this.prisma.experience.update({
//         where: { id },
//         data: { status: 'REJECTED' },
//       });

//       //send notification to host
//       await this.notificationService.sendNotification(experience.userId, {
//         title: 'Experience Rejected',
//         message: `${experience.name} experience is rejected. ${message}`,
//         type: 'EXPERIENCE',
//         experienceId: id,
//         userId: experience.userId,
//       });
//       return {
//         status: true,
//         message: 'Experience status updated successfully.',
//       };
//     }

//     // Fallback for unsupported transitions
//     throw new BadRequestException('Unsupported status transition');
//   }
//   async submitToAdmin(id: string, userId: string) {
//     const experience = await this.prisma.experience.findUnique({
//       where: { id },
//       include: { events: true, user: true },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     if (experience.status === 'PUBLISHED') {
//       throw new BadRequestException('Experience is already published.');
//     }

//     if (experience.user.id !== userId) {
//       throw new ForbiddenException('Experience does not belong to user.');
//     }

//     const ready = await this.eventService.checkExperienceReadyForEvent(id);

//     if (!ready.status) {
//       throw new BadRequestException(ready.message);
//     }

//     //Update Status
//     await this.prisma.experience.update({
//       where: { id },
//       data: { status: 'PENDING' },
//     });

//     //Send Notification to Admin
//     this.notificationService.sendNotification(userId, {
//       title: 'New Experience Submitted',
//       message: `${experience.user.name} has submitted a new experience for approval.`,
//       type: 'EXPERIENCE_SUBMITTED',
//     });
//     return {
//       status: true,
//       message: 'Experience submitted to admin. Please wait for admin approval.',
//     };
//   }

//   async uploadMedia(userId: string, body: any, files: Express.Multer.File[]) {
//     if (!userId) {
//       throw new ConflictException('UserId is required');
//     }

//     console.log('body', body);

//     const parsedBody = createMediaSchema.safeParse(body);
//     if (!parsedBody.success) {
//       throw new BadRequestException(parsedBody.error.errors);
//     }

//     const { experienceId, ...restData } = parsedBody.data;

//     const user = await this.prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found.');
//     }

//     // TODO: Check if host
//     // if (user.role !== 'HOST') {
//     //   throw new ForbiddenException('User is not a host.');
//     // }

//     const experience = await this.prisma.experience.findUnique({
//       where: { id: experienceId },
//       include: { user: true },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     if (experience.user.id !== userId) {
//       throw new ForbiddenException('Experience does not belong to user.');
//     }

//     if (!files || files.length === 0) {
//       throw new BadRequestException('At least one media file is required.');
//     }

//     const uploadedResults = await Promise.all(
//       files.map(async (file) => {
//         const uploadResult = await this.uploadService.uploadFile(
//           file,
//           'experience',
//         );

//         const media = await this.prisma.experienceMedia.create({
//           data: {
//             experienceId,
//             ...restData,
//             url: uploadResult.Key,
//           },
//         });

//         return uploadResult;
//       }),
//     );

//     //update cover image
//     await this.prisma.experience.update({
//       where: { id: experienceId },
//       data: { coverImage: uploadedResults[0].Key },
//     });

//     return {
//       status: true,
//       message: 'Media uploaded successfully.',
//       uploadedCount: uploadedResults.length,
//     };
//   }

//   async getMedia(id: string) {
//     const media = await this.prisma.experience.findUnique({
//       where: { id },
//       select: { media: true },
//     });

//     if (!media) {
//       throw new NotFoundException('Media not found.');
//     }

//     return {
//       status: true,
//       message: 'Media found.',
//       data: media,
//     };
//   }
//   async deleteMedia(id: string, userId: string) {
//     console.log(userId);
//     const media = await this.prisma.experienceMedia.findUnique({
//       where: { id },
//       include: { experience: { include: { user: true } } },
//     });

//     if (!media) {
//       throw new NotFoundException('Media not found.');
//     }

//     if (media.experience.user.id !== userId) {
//       throw new ForbiddenException(
//         'You are not authorized to delete this media.',
//       );
//     }

//     await this.uploadService.deleteFile(media.url);
//     await this.prisma.experienceMedia.delete({
//       where: { id },
//     });

//     return {
//       status: true,
//       message: 'Media deleted successfully.',
//       data: media,
//     };
//   }

//   async create(data: CreateExperienceDto, userId: string) {
//     let slug = data.slug
//       ? data.slug
//       : data.name.substring(0, 30).toLowerCase().replace(/\s/g, '-');

//     const exists = await this.prisma.experience.findUnique({
//       where: { slug },
//     });

//     if (exists) {
//       slug = `${slug}-${new Date().getTime()}`;
//     }

//     if (!userId) {
//       throw new ConflictException('UserId is required');
//     }
//     //Check User
//     const user = await this.prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found.');
//     }

//     if (user.status !== 'ACTIVE') {
//       throw new NotFoundException('User is not active.');
//     }

//     //TODO: CHECK ROLE

//     const category = await this.prisma.category.findUnique({
//       where: { id: data.categoryId },
//     });

//     if (!category) {
//       throw new NotFoundException('Category not found.');
//     }

//     const experience = await this.prisma.experience.create({
//       data: {
//         userId: userId,
//         name: data.name,
//         shortDesc: data.shortDesc,
//         address: data.address,
//         city: data.city,
//         state: data.state,
//         slug,
//         country: data.country,
//         zipCode: data.zipCode,
//         latitude: data.latitude,
//         longitude: data.longitude,
//         scheduleType: data.scheduleType,
//         cancelPolicy: data.cancelPolicy,
//         refundable: data.refundable,
//         cancellationFee: data.cancellationFee,
//         detailsDesc: data.detailsDesc,
//         includes: data.includes,
//         notes: data.notes,
//         guestRequirements: data.guestRequirements,
//         agreement: data.agreement,
//         categoryId: data.categoryId,
//         discount: data.discount,
//         discountType: data.discountType,
//         startDate: data.startDate,
//         endDate: data.endDate,
//         startTime: data.startTime,
//         endTime: data.endTime,
//         maxPerSlot: data.maxperSlot,
//         maxparticipants: data.maxparticipants,
//         maxGuest: data.maxGuest,
//         price: data.price,
//       },
//     });

//     if (!experience) {
//       throw new ForbiddenException('Experience not created.');
//     }

//     if (data.scheduleType === 'ONTIME') {
//       // // Create one event
//       // await this.eventService.createEventBasedOnScheduleType({
//       //   experienceId: experience.id,
//       //   title: experience.name,
//       //   date: data.startDate,
//       //   startTime: data.startTime,
//       //   endTime: data.endTime,
//       //   maxGuest: data.maxGuest,
//       //   maxperSlot: data.maxperSlot,
//       //   discount: data.discount,
//       //   discountType: data.discountType,
//       //   price: data.price,
//       //   activities: data.activities,
//       //   bookingLimit: data.bookingLimit,
//       //   status: data.eventStatus,
//       //   scheduleType: 'ONTIME', // or 'RECURRING' depending on your logic
//       //   isAvailable: true, // or false depending on your logic
//       // });
//       return { status: true, data: experience };
//     } else {
//       if (!data.recurrence) {
//         throw new BadRequestException('Recurrence rule is required');
//       }
//       // Create recurring events

//       // const recurringEvents = await this.eventService.createRecurringEvent({
//       //   experienceId: experience.id,
//       //   title: experience.name,
//       //   date: data.startDate, // Replace startDate with date
//       //   startTime: data.startTime,
//       //   endTime: data.endTime,
//       //   maxGuest: data.maxGuest,
//       //   maxperSlot: data.maxperSlot,
//       //   discount: data.discount,
//       //   discountType: data.discountType,
//       //   price: data.price,
//       //   activities: data.activities,
//       //   bookingLimit: data.bookingLimit,
//       //   status: data.eventStatus,
//       //   scheduleType: 'RECURRING', // or 'RECURRING' depending on your logic
//       //   isAvailable: true, // or false depending on your logic
//       //   recurrence: data.recurrence,
//       // });

//       return { status: true };
//     }
//   }

//   async findByLocation(
//     latitude: number,
//     longitude: number,
//     radius: string = '10',
//   ) {
//     if (!latitude || !longitude) {
//       throw new BadRequestException('Latitude and longitude are required');
//     }

//     const lat = parseFloat(String(latitude));
//     const lng = parseFloat(String(longitude));
//     const radiusInKm = parseFloat(radius);
//     const RADIUS_IN_DEGREES = radiusInKm / 111;

//     const where = {
//       latitude: {
//         gte: lat - RADIUS_IN_DEGREES,
//         lte: lat + RADIUS_IN_DEGREES,
//       },
//       longitude: {
//         gte: lng - RADIUS_IN_DEGREES,
//         lte: lng + RADIUS_IN_DEGREES,
//       },
//     };

//     const experiences = await this.prisma.experience.findMany({
//       where,
//       select: {
//         id: true,
//         name: true,
//         price: true,
//         slug: true,
//         address: true,
//         coverImage: true,
//         latitude: true,
//         longitude: true,
//         createdAt: true,
//         startDate: true,
//         endDate: true,
//         status: true,
//         averageRating: true,
//         category: {
//           select: { id: true, name: true, icon: true },
//         },
//         badges: {
//           select: { id: true, badge: true },
//         },
//         media: {
//           where: { type: 'IMAGE' },
//           select: { url: true },
//           take: 5,
//           orderBy: { uploadedAt: 'desc' },
//         },
//         _count: { select: { reviews: true } },
//       },
//     });

//     return {
//       status: true,
//       data: experiences,
//     };
//   }

//   async getExperienceById(id: string, req: Request) {
//     const experience = await this.prisma.experience.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         shortDesc: true,
//         detailsDesc: true,
//         city: true,
//         country: true,
//         state: true,
//         status: true,
//         address: true,
//         zipCode: true,
//         latitude: true,
//         longitude: true,
//         startDate: true,
//         endDate: true,
//         price: true,
//         userId: true,
//         categoryId: true,
//         scheduleType: true,
//         recurrenceRules: true,
//         notes: true,
//         activities: true,
//         cancelPolicy: true,
//         cancellationFee: true,
//         openWindowDays: true,
//         startTime: true,
//         endTime: true,
//         maxPerSlot: true,
//         maxGuest: true,
//         timeslots: true,
//         refundable: true,
//         averageRating: true,
//         maxparticipants: true,
//         discount: true,
//         discountType: true,
//         agreement: true,
//         guestRequirements: true,
//         badges: {
//           select: {
//             id: true,
//             badge: {
//               select: {
//                 id: true,
//                 name: true,
//                 icon: true,
//               },
//             },
//           },
//         },
//         category: {
//           select: { id: true, name: true, icon: true },
//         },
//         user: {
//           select: {
//             id: true,
//             name: true,
//             avatar: true,
//           },
//         },
//         _count: {
//           select: {
//             reviews: true,
//             media: true,
//           },
//         },
//         media: {
//           select: {
//             id: true,
//             type: true,
//             url: true,
//             title: true,
//             description: true,
//           },
//         },

//         amenities: {
//           select: {
//             amenity: {
//               select: {
//                 id: true,
//                 name: true,
//                 icon: true,
//               },
//             },
//           },
//         },
//         includes: true,
//         reviews: {
//           where: {
//             status: 'APPROVED',
//           },
//           orderBy: { createdAt: 'desc' },
//           take: 4,
//           select: {
//             id: true,
//             rating: true,
//             comment: true,

//             reviewee: {
//               select: {
//                 id: true,
//                 name: true,
//                 avatar: true,
//               },
//             },
//           },
//         },
//         events: {
//           select: {
//             id: true,
//             price: true,
//             discount: true,
//             date: true,
//           },
//         },
//       },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     const check = await this.eventService.checkExperienceReadyForEvent(id);

//     return { status: true, data: experience, ready: check };
//   }

//   // async update(id: string, data: UpdateExperienceDto, userId: string) {
//   //   const experience = await this.prisma.experience.findUnique({
//   //     where: { id },
//   //   });

//   //   if (!experience) {
//   //     throw new NotFoundException('Experience not found.');
//   //   }
//   //   if (experience.userId !== userId) {
//   //     throw new ForbiddenException(
//   //       'You are not authorized to update this experience.',
//   //     );
//   //   }

//   //   const updatedExperience = await this.prisma.experience.update({
//   //     where: { id },
//   //     data: {
//   //       ...data,
//   //       categoryId: data.categoryId,
//   //     },
//   //   });
//   //   return {
//   //     status: true,
//   //     data: updatedExperience,
//   //     message: 'Experience updated successfully.',
//   //   };
//   // }

//   async findAdminAllExperience(query: any) {
//     const parseQuery = adminQuerySchema.safeParse(query);
//     if (!parseQuery.success) {
//       throw new BadRequestException(parseQuery.error.message);
//     }

//     const {
//       page = '1',
//       limit = '10',
//       status,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//       search,
//       period = 'weekly',
//       from,
//       to,
//       view = 'all',
//     } = parseQuery.data;

//     const pageInt = parseInt(page);
//     const limitInt = parseInt(limit);
//     const skip = (pageInt - 1) * limitInt;

//     // Build base where clause
//     const where: Prisma.ExperienceWhereInput = {
//       deletedAt: null,
//       ...(status ? { status } : {}),
//     };
//     if (search) {
//       const s = String(search).trim();
//       if (s.includes('=')) {
//         const idx = s.indexOf('=');
//         const key = s.slice(0, idx).trim();
//         const val = s.slice(idx + 1).trim();
//         if (val) {
//           switch (key) {
//             case 'id':
//               (where as any).id = { equals: val };
//               break;
//             case 'name':
//               (where as any).name = { contains: val, mode: 'insensitive' };
//               break;
//             case 'address':
//               (where as any).address = { contains: val, mode: 'insensitive' };
//               break;
//             case 'city':
//               (where as any).city = { contains: val, mode: 'insensitive' };
//               break;
//             case 'country':
//               (where as any).country = { contains: val, mode: 'insensitive' };
//               break;
//             default:
//               (where as any).OR = [
//                 { id: { contains: s, mode: 'insensitive' } },
//                 { name: { contains: s, mode: 'insensitive' } },
//                 { address: { contains: s, mode: 'insensitive' } },
//                 { city: { contains: s, mode: 'insensitive' } },
//                 { country: { contains: s, mode: 'insensitive' } },
//               ];
//           }
//         }
//       } else {
//         (where as any).OR = [
//           { id: { contains: s, mode: 'insensitive' } },
//           { name: { contains: s, mode: 'insensitive' } },
//           { address: { contains: s, mode: 'insensitive' } },
//           { city: { contains: s, mode: 'insensitive' } },
//           { country: { contains: s, mode: 'insensitive' } },
//         ];
//       }
//     }

//     // Resolve date range for analytics window
//     const now = new Date();
//     let startAt: Date;
//     let endAt: Date;
//     const parseLocalYmd = (s: string) => {
//       // Expecting YYYY-MM-DD, parse in local time to avoid TZ offsets
//       const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
//       if (m) {
//         const y = Number(m[1]);
//         const mo = Number(m[2]) - 1;
//         const d = Number(m[3]);
//         return new Date(y, mo, d);
//       }
//       // Fallback
//       return new Date(s);
//     };

//     if (from || to) {
//       startAt = from
//         ? parseLocalYmd(from)
//         : new Date(now.getFullYear(), now.getMonth(), 1);
//       endAt = to ? parseLocalYmd(to) : now;
//       // Normalize to full-day boundaries
//       startAt.setHours(0, 0, 0, 0);
//       endAt.setHours(23, 59, 59, 999);
//     } else {
//       if (String(period).toLowerCase() === 'daily') {
//         startAt = new Date(now);
//         startAt.setHours(0, 0, 0, 0);
//         endAt = new Date(now);
//         endAt.setHours(23, 59, 59, 999);
//       } else if (String(period).toLowerCase() === 'weekly') {
//         const day = now.getDay();
//         const diffToMonday = (day + 6) % 7; // Monday as start
//         startAt = new Date(now);
//         startAt.setDate(now.getDate() - diffToMonday);
//         startAt.setHours(0, 0, 0, 0);
//         endAt = new Date(startAt);
//         endAt.setDate(startAt.getDate() + 6);
//         endAt.setHours(23, 59, 59, 999);
//       } else {
//         // monthly
//         startAt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
//         endAt = new Date(
//           now.getFullYear(),
//           now.getMonth() + 1,
//           0,
//           23,
//           59,
//           59,
//           999,
//         );
//       }
//     }

//     // If a custom date range was provided, constrain the list by createdAt
//     const whereWithDate: Prisma.ExperienceWhereInput = {
//       ...where,
//       ...(from || to
//         ? {
//             createdAt: {
//               gte: startAt,
//               lte: endAt,
//             },
//           }
//         : {}),
//     };

//     // Fetch paginated experiences for the admin list view
//     const [experiences, total] = await this.prisma.$transaction([
//       this.prisma.experience.findMany({
//         where: whereWithDate,
//         skip,
//         take: limitInt,
//         orderBy: { [sortBy]: sortOrder as any },
//         select: {
//           id: true,
//           name: true,
//           address: true,
//           createdAt: true,
//           status: true,
//           city: true,
//           price: true,
//           averageRating: true,
//           reviewCount: true,
//           bookingCount: true,
//           coverImage: true,
//           isFeatured: true,
//           media: {
//             where: { type: 'IMAGE' },
//             orderBy: { uploadedAt: 'desc' },
//             take: 1,
//             select: { url: true },
//           },
//           _count: { select: { reviews: true, events: true } },
//         },
//       }),
//       this.prisma.experience.count({ where: whereWithDate }),
//     ]);

//     // Compute metrics for the selected window across the page experiences
//     const expIds = experiences.map((e) => e.id);

//     const [bookingAgg, reviewAgg] = await this.prisma.$transaction([
//       // Bookings in window: count and total revenue
//       this.prisma.booking.groupBy({
//         by: ['experienceId'],
//         where: {
//           experienceId: { in: expIds.length ? expIds : [''] },
//           createdAt: { gte: startAt, lte: endAt },
//           status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
//         },
//         orderBy: { experienceId: 'asc' },
//         _count: { _all: true },
//         _sum: { total: true },
//       }),
//       // Reviews in window: count and average rating
//       this.prisma.review.groupBy({
//         by: ['experienceId'],
//         where: {
//           experienceId: { in: expIds.length ? expIds : [''] },
//           createdAt: { gte: startAt, lte: endAt },
//           status: 'APPROVED',
//         },
//         orderBy: { experienceId: 'asc' },
//         _count: { _all: true },
//         _avg: { rating: true },
//       }),
//     ]);

//     const bookingMap = new Map(
//       bookingAgg.map((b: any) => [
//         b.experienceId,
//         {
//           count: Number(b._count?._all || 0),
//           revenue: Number(b._sum?.total || 0),
//         },
//       ]),
//     );
//     const reviewMap = new Map(
//       reviewAgg.map((r: any) => [
//         r.experienceId,
//         {
//           count: Number(r._count?._all || 0),
//           avg: Number(r._avg?.rating || 0),
//         },
//       ]),
//     );

//     const enriched = experiences.map((e) => {
//       const b = bookingMap.get(e.id) || { count: 0, revenue: 0 };
//       const r = reviewMap.get(e.id) || { count: 0, avg: 0 };
//       const cover = e.media?.[0]?.url || e.coverImage || null;
//       return {
//         ...e,
//         coverImage: cover,
//         windowBookingCount: b.count,
//         windowRevenue: b.revenue,
//         windowReviewCount: r.count,
//         windowAvgRating: r.avg,
//       };
//     });

//     // Switch-case view handling with database-driven queries
//     const viewKey = String(view || 'all').toLowerCase();
//     const limitCap = 100;
//     const limitIntCapped = Math.min(limitInt, limitCap);

//     switch (viewKey) {
//       case 'trending': {
//         // Use review aggregation to find top-rated experiences in the window
//         const reviewAgg = await this.prisma.review.groupBy({
//           by: ['experienceId'],
//           where: {
//             createdAt: { gte: startAt, lte: endAt },
//             status: 'APPROVED',
//           },
//           orderBy: [{ _avg: { rating: 'desc' } }, { experienceId: 'asc' }],
//           _count: { _all: true },
//           _avg: { rating: true },
//         });

//         const filteredAll = reviewAgg.filter(
//           (r: any) =>
//             Number(r._count?._all || 0) >= 3 &&
//             Number(r._avg?.rating || 0) >= 4,
//         );
//         const filteredTotal = filteredAll.length;
//         const idsPage = filteredAll
//           .slice((pageInt - 1) * limitInt, (pageInt - 1) * limitInt + limitInt)
//           .map((r: any) => r.experienceId);
//         const ids = idsPage;
//         if (ids.length === 0) {
//           return {
//             status: true,
//             data: [],
//             pagination: {
//               page: pageInt,
//               limit: limitInt,
//               total: filteredTotal,
//             },
//             window: { startAt, endAt, period: period || 'custom' },
//           };
//         }

//         const items = await this.prisma.experience.findMany({
//           where: { ...where, id: { in: ids } },
//           select: {
//             id: true,
//             name: true,
//             address: true,
//             createdAt: true,
//             status: true,
//             city: true,
//             price: true,
//             averageRating: true,
//             reviewCount: true,
//             bookingCount: true,
//             coverImage: true,
//             media: {
//               where: { type: 'IMAGE' },
//               orderBy: { uploadedAt: 'desc' },
//               take: 1,
//               select: { url: true },
//             },
//             _count: { select: { reviews: true, events: true } },
//           },
//         });

//         // Preserve order based on aggregation slice
//         const orderMap = new Map(ids.map((id, idx) => [id, idx]));
//         const ordered = items.sort(
//           (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
//         );
//         // Return typed items for a single-table UI
//         const typed = ordered.map((e) => ({ ...e, type: 'TRENDING' as const }));
//         return {
//           status: true,
//           data: typed,
//           pagination: { page: pageInt, limit: limitInt, total: filteredTotal },
//           window: { startAt, endAt, period: period || 'custom' },
//         };
//       }

//       case 'underperforming': {
//         // Find experiences with zero bookings in window (published/announcement)
//         const bookedAgg = await this.prisma.booking.groupBy({
//           by: ['experienceId'],
//           where: {
//             createdAt: { gte: startAt, lte: endAt },
//             status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
//           },
//           orderBy: { experienceId: 'asc' },
//           _count: { _all: true },
//         });
//         const bookedIds = bookedAgg.map((b: any) => b.experienceId);

//         // Low rating in window
//         const lowRatingAgg = await this.prisma.review.groupBy({
//           by: ['experienceId'],
//           where: {
//             createdAt: { gte: startAt, lte: endAt },
//             status: 'APPROVED',
//           },
//           orderBy: { experienceId: 'asc' },
//           _avg: { rating: true },
//         });
//         const lowRatedIds = lowRatingAgg
//           .filter((r: any) => Number(r._avg?.rating || 0) < 3.5)
//           .map((r: any) => r.experienceId);

//         // Unbooked published/announcement experiences
//         const unbooked = await this.prisma.experience.findMany({
//           where: {
//             ...where,
//             status: { in: ['PUBLISHED', 'ANOUNCEMENT'] as any },
//             id: bookedIds.length ? { notIn: bookedIds } : undefined,
//           },
//           orderBy: { createdAt: 'desc' },
//           take: limitIntCapped,
//           select: {
//             id: true,
//             name: true,
//             address: true,
//             createdAt: true,
//             status: true,
//             city: true,
//             price: true,
//             averageRating: true,
//             reviewCount: true,
//             bookingCount: true,
//             coverImage: true,
//             _count: { select: { reviews: true, events: true } },
//           },
//         });

//         const lowRated = lowRatedIds.length
//           ? await this.prisma.experience.findMany({
//               where: { ...where, id: { in: lowRatedIds } },
//               orderBy: { createdAt: 'desc' },
//               take: limitIntCapped,
//               select: {
//                 id: true,
//                 name: true,
//                 address: true,
//                 createdAt: true,
//                 status: true,
//                 city: true,
//                 price: true,
//                 averageRating: true,
//                 reviewCount: true,
//                 bookingCount: true,
//                 coverImage: true,

//                 _count: { select: { reviews: true, events: true } },
//               },
//             })
//           : [];

//         // Merge for full set
//         const seen = new Set<string>();
//         const mergedAll: any[] = [];
//         for (const e of [...unbooked, ...lowRated]) {
//           if (!seen.has(e.id)) {
//             seen.add(e.id);
//             mergedAll.push(e);
//           }
//         }

//         // Paginate merged set
//         const filteredTotal = mergedAll.length;
//         const paged = mergedAll.slice(
//           (pageInt - 1) * limitInt,
//           (pageInt - 1) * limitInt + limitInt,
//         );
//         const typed = paged.map((e) => ({
//           ...e,
//           type: 'UNDERPERFORMING' as const,
//         }));
//         return {
//           status: true,
//           data: typed,
//           pagination: { page: pageInt, limit: limitInt, total: filteredTotal },
//           window: { startAt, endAt, period: period || 'custom' },
//         };
//       }

//       case 'all':
//       default: {
//         // Add type to each enriched item for a single-table UI
//         const isTrending = (e: any) =>
//           e.windowAvgRating >= 4.0 && e.windowReviewCount >= 3;
//         const isUnderperforming = (e: any) =>
//           (e.status === 'PUBLISHED' || e.status === 'ANOUNCEMENT') &&
//           (e.windowBookingCount === 0 || e.windowAvgRating < 3.5);

//         // Tag each item as TRENDING, UNDERPERFORMING, or NORMAL
//         const dataWithType = enriched.map((e) => ({
//           ...e,
//           type: isTrending(e)
//             ? ('TRENDING' as const)
//             : isUnderperforming(e)
//               ? ('UNDERPERFORMING' as const)
//               : ('NORMAL' as const),
//         }));

//         return {
//           status: true,
//           data: dataWithType,
//           pagination: {
//             page: pageInt,
//             limit: limitInt,
//             total,
//           },
//           window: { startAt, endAt, period: period || 'custom' },
//         };
//       }
//     }
//   }

//   async findAllAdminByUser(id: string, query: any) {
//     const parseQuery = querySchema.safeParse(query);
//     if (!parseQuery.success) {
//       throw new BadRequestException(parseQuery.error.message);
//     }

//     const {
//       page = '1',
//       limit = '10',
//       category,
//       status,
//       rating,
//       priceMin,
//       priceMax,
//       search,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//     } = parseQuery.data;

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     console.log(skip);

//     const where: any = {
//       deletedAt: null,
//       userId: id,
//     };

//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: 'insensitive' } },
//         { address: { contains: search, mode: 'insensitive' } },
//       ];
//     }

//     if (category) {
//       where.categoryId = category;
//     }

//     if (status) {
//       where.status = status;
//     }

//     if (rating) {
//       where.averageRating = { gte: parseFloat(rating as string) };
//     }

//     if (priceMin || priceMax) {
//       where.Event = {
//         some: {
//           priceperperson: {},
//         },
//       };
//       if (priceMin)
//         (where.price as Prisma.DecimalFilter).gte = parseFloat(
//           priceMin as string,
//         );
//       if (priceMax)
//         (where.price as Prisma.DecimalFilter).lte = parseFloat(
//           priceMax as string,
//         );
//     }

//     const [experiences, total] = await this.prisma.$transaction([
//       this.prisma.experience.findMany({
//         where,
//         skip: skip,
//         take: parseInt(limit),
//         orderBy: {
//           [sortBy]: sortOrder,
//         },
//         select: {
//           id: true,
//           name: true,
//           address: true,
//           createdAt: true,
//           status: true,
//           city: true,
//           price: true,
//           averageRating: true,
//           media: {
//             where: {
//               type: 'IMAGE',
//             },
//             orderBy: { uploadedAt: 'desc' },
//             select: {
//               url: true,
//             },
//           },
//           reviews: {
//             select: {
//               rating: true,
//             },
//           },
//           _count: {
//             select: {
//               reviews: true,
//             },
//           },
//         },
//       }),
//       this.prisma.experience.count({ where }),
//     ]);

//     const hasNext = skip + parseInt(limit) < total;
//     const hasPrev = skip > 0;
//     return {
//       status: true,
//       data: experiences,
//       total,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       totalPages: Math.ceil(total / parseInt(limit)),
//       hasNext,
//       hasPrev,
//     };
//   }

//   async findAllByHost(id: string, query: any) {
//     console.log('parseQuery', query);
//     const parseQuery = querySchema.safeParse(query);
//     if (!parseQuery.success) {
//       throw new BadRequestException(parseQuery.error.message);
//     }

//     const {
//       page = '1',
//       limit = '10',
//       category,
//       status,
//       rating,
//       priceMin,
//       priceMax,
//       search,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//     } = parseQuery.data;

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     console.log(skip);

//     const where: any = {
//       deletedAt: null,
//       userId: id,
//     };

//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: 'insensitive' } },
//         { address: { contains: search, mode: 'insensitive' } },
//       ];
//     }

//     if (category) {
//       where.categoryId = category;
//     }

//     if (status) {
//       where.status = status;
//     }

//     if (rating) {
//       where.averageRating = { gte: parseFloat(rating as string) };
//     }

//     if (priceMin || priceMax) {
//       where.Event = {
//         some: {
//           priceperperson: {},
//         },
//       };
//       if (priceMin)
//         (where.price as Prisma.DecimalFilter).gte = parseFloat(
//           priceMin as string,
//         );
//       if (priceMax)
//         (where.price as Prisma.DecimalFilter).lte = parseFloat(
//           priceMax as string,
//         );
//     }

//     const [experiences, total] = await this.prisma.$transaction([
//       this.prisma.experience.findMany({
//         where,
//         skip: skip,
//         take: parseInt(limit),
//         orderBy: {
//           [sortBy]: sortOrder,
//         },
//         select: {
//           id: true,
//           name: true,
//           address: true,
//           createdAt: true,
//           status: true,
//           city: true,
//           price: true,
//           averageRating: true,
//           media: {
//             where: {
//               type: 'IMAGE',
//             },
//             orderBy: { uploadedAt: 'desc' },
//             select: {
//               url: true,
//             },
//           },
//           reviews: {
//             select: {
//               rating: true,
//             },
//           },
//           _count: {
//             select: {
//               reviews: true,
//             },
//           },
//         },
//       }),
//       this.prisma.experience.count({ where }),
//     ]);

//     const hasNext = skip + parseInt(limit) < total;
//     const hasPrev = skip > 0;
//     return {
//       status: true,
//       data: experiences,
//       total,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       totalPages: Math.ceil(total / parseInt(limit)),
//       hasNext,
//       hasPrev,
//     };
//   }

//   async findAll(query: any) {
//     const {
//       city,
//       country,
//       state,
//       categoryId,
//       startDateFrom,
//       startDateTo,
//       time, // e.g., '09:00'
//       q, // for general search
//     } = query;

//     const where: Prisma.ExperienceWhereInput = {
//       deletedAt: null,
//       ...(q && {
//         OR: [
//           { name: { contains: q, mode: 'insensitive' } },
//           { shortDescription: { contains: q, mode: 'insensitive' } },
//           { city: { contains: q, mode: 'insensitive' } },
//           { country: { contains: q, mode: 'insensitive' } },
//         ],
//       }),
//       ...(city && { city: { equals: city, mode: 'insensitive' } }),
//       ...(country && { country: { equals: country, mode: 'insensitive' } }),
//       ...(state && { state: { equals: state, mode: 'insensitive' } }),
//       ...(categoryId && { categoryId }),

//       ...(startDateFrom || startDateTo
//         ? {
//             Event: {
//               some: {
//                 startDate: {
//                   ...(startDateFrom && { gte: new Date(startDateFrom) }),
//                   ...(startDateTo && { lte: new Date(startDateTo) }),
//                 },
//               },
//             },
//           }
//         : {}),
//     };

//     const experiences = await this.prisma.experience.findMany({
//       where,
//       include: {
//         category: {
//           select: { id: true, name: true, icon: true },
//         },
//         badges: {
//           select: { id: true, badge: true },
//         },
//         reviews: {
//           select: { id: true, rating: true },
//         },
//         events: {
//           select: { id: true, price: true, discount: true },
//         },
//       },
//       orderBy: { createdAt: 'desc' },
//     });
//     return { status: true, data: experiences };
//   }

//   async remove(id: string) {
//     const experience = await this.prisma.experience.findUnique({
//       where: { id },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     const deletedExperience = await this.prisma.experience.update({
//       where: { id },
//       data: { deletedAt: new Date() },
//     });
//     return {
//       status: true,
//       data: deletedExperience,
//       message: 'Experience deleted successfully.',
//     };
//   }

//   async experienceSearch(
//     query: QueryExperienceDto,
//   ): Promise<{ status: boolean; data: any[] }> {
//     try {
//       const parseQuery = queryExperienceSchema.safeParse(query);
//       if (!parseQuery.success) {
//         throw new NotAcceptableException(parseQuery.error.errors);
//       }

//       const {
//         search,
//         category,
//         rating,
//         priceMin,
//         priceMax,
//         address,
//         startDate,
//         endDate,
//         lattitude,
//         longitude,
//         sortBy,
//         sortOrder,
//       } = parseQuery.data;

//       console.log(query);

//       const where: any = {
//         deletedAt: null,
//         status: ExperienceStatus.PUBLISHED,
//       };

//       if (search) {
//         where.OR = [
//           { name: { contains: search, mode: 'insensitive' } },
//           { address: { contains: search, mode: 'insensitive' } },
//           { shortDesc: { contains: search, mode: 'insensitive' } },
//           { category: { name: { contains: search, mode: 'insensitive' } } },
//         ];
//       }

//       if (category) {
//         where.categoryId = category;
//       }

//       if (rating) {
//         where.averageRating = { gte: Number(rating) };
//       }

//       if (priceMin && priceMax) {
//         where.price = { gte: priceMin, lte: priceMax };
//       }

//       if (address) {
//         where.address = { contains: address, mode: 'insensitive' };
//       }

//       console.log('startDate', startDate, ' endDate', endDate);
//       if (startDate && endDate) {
//         const start = new Date(startDate);
//         const end = new Date(endDate);
//         end.setDate(end.getDate() + 1);

//         where.OR = [
//           {
//             events: {
//               some: {
//                 date: {
//                   gte: start,
//                   lt: end,
//                 },
//               },
//             },
//           },
//         ];
//       } else if (startDate) {
//         const start = new Date(startDate);
//         const nextDay = new Date(start);
//         nextDay.setDate(start.getDate() + 1);

//         where.OR = [
//           {
//             events: {
//               some: {
//                 date: {
//                   gte: start,
//                   lt: nextDay,
//                 },
//               },
//             },
//           },
//         ];
//       }

//       if (lattitude && longitude) {
//         where.location = {
//           latitude: {
//             gte: Number(lattitude) - 0.1,
//             lte: Number(lattitude) + 0.1,
//           },
//           longitude: {
//             gte: Number(longitude) - 0.1,
//             lte: Number(longitude) + 0.1,
//           },
//         };
//       }

//       const orderBy: any = {};

//       if (sortBy && sortOrder) {
//         orderBy[sortBy] = sortOrder;
//       }

//       const experiences = await this.prisma.experience.findMany({
//         where,
//         orderBy,
//         select: {
//           id: true,
//           name: true,
//           price: true,
//           slug: true,
//           address: true,
//           latitude: true,
//           longitude: true,
//           createdAt: true,
//           startDate: true,
//           endDate: true,
//           status: true,
//           averageRating: true,

//           category: {
//             select: { id: true, name: true, icon: true },
//           },
//           badges: {
//             select: { id: true, badge: true },
//           },
//           media: {
//             where: { type: 'IMAGE' },
//             select: { url: true },
//             take: 5,
//             orderBy: { uploadedAt: 'desc' },
//           },
//           _count: { select: { reviews: true } },
//         },
//       });

//       return { status: true, data: experiences };
//     } catch (error) {
//       this.logger.error('Error in experienceSearch:', error);
//       throw new InternalServerErrorException('Error searching experiences');
//     }
//   }

//   async findAllPublic(query: any = {}) {
//     try {
//       const {
//         limit = 30,
//         cursor,
//         sortBy = 'rating', // smart, rating, booking, recent, upcoming
//         categoryId,
//         minRating,
//         maxPrice,
//         city,
//         search,
//       } = query;

//       console.log('query', query);

//       const take = Math.min(parseInt(limit), 50); // Max 50 items per page
//       const today = new Date();

//       // Base where clause for published experiences
//       const baseWhere: any = {
//         deletedAt: null,
//         status: {
//           in: ['PUBLISHED', 'ANOUNCEMENT'],
//         },
//         // isActive: true,
//       };

//       // Apply filters
//       if (categoryId) {
//         baseWhere.categoryId = categoryId;
//       }

//       if (minRating) {
//         baseWhere.averageRating = { gte: parseFloat(minRating) };
//       }

//       if (maxPrice) {
//         baseWhere.price = { lte: parseFloat(maxPrice) };
//       }

//       if (city) {
//         baseWhere.city = { contains: city, mode: 'insensitive' };
//       }

//       if (search) {
//         baseWhere.OR = [
//           { name: { contains: search, mode: 'insensitive' } },
//           { shortDesc: { contains: search, mode: 'insensitive' } },
//           { detailsDesc: { contains: search, mode: 'insensitive' } },
//         ];
//       }

//       // Cursor pagination setup
//       const cursorCondition = cursor ? { id: { gt: cursor } } : {};
//       const whereClause = { ...baseWhere, ...cursorCondition };

//       // Define order by based on sortBy parameter
//       let orderBy: any;
//       switch (sortBy) {
//         case 'rating':
//           orderBy = [{ averageRating: 'desc' }, { id: 'asc' }];
//           break;
//         case 'booking':
//           orderBy = [{ bookingCount: 'desc' }, { id: 'asc' }];
//           break;
//         case 'recent':
//           orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];
//           break;
//         case 'upcoming':
//           orderBy = [{ startDate: 'asc' }, { id: 'asc' }];
//           break;
//         case 'smart':
//         default:
//           // Smart sorting: combination of factors
//           orderBy = [
//             { averageRating: 'desc' },
//             { bookingCount: 'desc' },
//             { createdAt: 'desc' },
//             { id: 'asc' },
//           ];
//           break;
//       }

//       // Single optimized query with all data
//       const experiences = await this.prisma.experience.findMany({
//         where: whereClause,
//         orderBy,
//         take: take + 1, // Fetch one extra to check if there's a next page
//         select: {
//           id: true,
//           name: true,
//           shortDesc: true,
//           price: true,
//           slug: true,
//           address: true,
//           city: true,
//           state: true,
//           latitude: true,
//           longitude: true,
//           createdAt: true,
//           startDate: true,
//           endDate: true,
//           status: true,
//           averageRating: true,
//           reviewCount: true,
//           bookingCount: true,
//           scheduleType: true,
//           coverImage: true,
//           category: {
//             select: { id: true, name: true, slug: true, icon: true },
//           },
//           user: {
//             select: {
//               id: true,
//               name: true,
//               avatar: true,
//               stripeOnboardingComplete: true,
//             },
//           },
//           badges: {
//             select: {
//               id: true,
//               badge: {
//                 select: { id: true, name: true, icon: true },
//               },
//             },
//           },
//           media: {
//             where: { type: 'IMAGE' },
//             select: { id: true, url: true, type: true },
//             take: 3,
//             orderBy: { uploadedAt: 'desc' },
//           },
//           events: {
//             where: {
//               date: { gte: today },
//               status: 'SCHEDULE',
//             },
//             select: {
//               id: true,
//               date: true,
//               startTime: true,
//               endTime: true,
//               price: true,
//               maxGuest: true,
//             },
//             orderBy: { date: 'asc' },
//             take: 3, // Next 3 upcoming events
//           },
//           _count: {
//             select: {
//               reviews: true,
//               bookings: true,
//               events: {
//                 where: {
//                   date: { gte: today },
//                   status: EventStatus.SCHEDULE,
//                 },
//               },
//             },
//           },
//         },
//       });

//       // Separate data and pagination info
//       const hasNextPage = experiences.length > take;
//       const data = hasNextPage ? experiences.slice(0, -1) : experiences;
//       const nextCursor = hasNextPage ? data[data.length - 1]?.id : null;

//       // Calculate smart score for each experience (for analytics)
//       const enrichedData = data.map((exp) => {
//         const ratingScore = (exp.averageRating || 0) * 0.3;
//         const bookingScore = Math.min((exp.bookingCount || 0) / 10, 5) * 0.25;
//         const recentScore = this.calculateRecencyScore(exp.createdAt) * 0.2;
//         const availabilityScore = exp._count.events > 0 ? 2 : 0;
//         const hostScore = exp.user.stripeOnboardingComplete ? 1 : 0;

//         const smartScore =
//           ratingScore +
//           bookingScore +
//           recentScore +
//           availabilityScore +
//           hostScore;

//         return {
//           ...exp,
//           smartScore: Math.round(smartScore * 100) / 100,
//           hasUpcomingEvents: exp._count.events > 0,
//           nextEventDate: exp.events[0]?.date || null,
//           startingPrice:
//             exp.events.length > 0
//               ? Math.min(...exp.events.map((e) => Number(e.price)))
//               : Number(exp.price),
//         };
//       });

//       // Get previous cursor for backward pagination
//       let prevCursor: string | null = null;
//       if (cursor) {
//         const prevExperience = await this.prisma.experience.findFirst({
//           where: {
//             ...baseWhere,
//             id: { lt: cursor },
//           },
//           orderBy: { id: 'desc' },
//           select: { id: true },
//         });
//         prevCursor = prevExperience?.id || null;
//       }

//       this.logger.log(
//         `Retrieved ${data.length} experiences with sortBy: ${sortBy}, cursor: ${cursor}`,
//       );

//       return {
//         status: true,
//         data: enrichedData,
//         pagination: {
//           hasNextPage,
//           hasPrevPage: !!cursor,
//           nextCursor,
//           prevCursor,
//           totalCount: data.length,
//           limit: take,
//         },
//         filters: {
//           sortBy,
//           categoryId,
//           minRating,
//           maxPrice,
//           city,
//           search,
//         },
//       };
//     } catch (error) {
//       this.logger.error('[findAllPublic] Error:', error);
//       throw new InternalServerErrorException(
//         'Failed to fetch public experiences',
//       );
//     }
//   }

//   /**
//    * Calculate recency score based on creation date
//    * More recent experiences get higher scores
//    */
//   private calculateRecencyScore(createdAt: Date): number {
//     const now = new Date();
//     const daysDiff =
//       (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

//     if (daysDiff <= 7) return 5; // Very recent
//     if (daysDiff <= 30) return 3; // Recent
//     if (daysDiff <= 90) return 2; // Moderately recent
//     if (daysDiff <= 180) return 1; // Older
//     return 0.5; // Very old
//   }

//   //get All hot experiences
//   async findHotExperiences(query: any) {
//     const parseQuery = querySchema.safeParse(query);
//     if (!parseQuery.success) {
//       throw new BadRequestException(parseQuery.error.message);
//     }

//     const {
//       limit = '10',
//       page = '1',
//       category,
//       startDate,
//       location,
//       endDate,
//       search,
//       cursor,
//       sortBy = 'bookingCount',
//       sortOrder = 'desc',
//     } = parseQuery.data;

//     //Filter, Serach and Sort
//     let where: Prisma.ExperienceWhereInput = {
//       deletedAt: null,
//       status: 'PUBLISHED',
//     };

//     if (category) where.categoryId = category;
//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: 'insensitive' } },
//         { address: { contains: search, mode: 'insensitive' } },
//       ];
//     }
//     if (location) {
//       where.OR = [
//         { address: { contains: location, mode: 'insensitive' } },
//         { city: { contains: location, mode: 'insensitive' } },
//         { country: { contains: location, mode: 'insensitive' } },
//         { state: { contains: location, mode: 'insensitive' } },
//       ];
//     }

//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       end.setDate(end.getDate() + 1);

//       where.OR = [
//         {
//           events: {
//             some: {
//               date: {
//                 gte: start,
//                 lt: end,
//               },
//             },
//           },
//         },
//       ];
//     } else if (startDate) {
//       const start = new Date(startDate);
//       const nextDay = new Date(start);
//       nextDay.setDate(start.getDate() + 1);

//       where.OR = [
//         {
//           events: {
//             some: {
//               date: {
//                 gte: start,
//                 lt: nextDay,
//               },
//             },
//           },
//         },
//       ];
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [experiences, count] = await this.prisma.$transaction([
//       this.prisma.experience.findMany({
//         where,
//         orderBy: {
//           [sortBy]: sortOrder,
//         },
//         skip,
//         take: Number(limit),
//         cursor: cursor ? { id: cursor } : undefined,
//         select: {
//           id: true,
//           name: true,
//           price: true,
//           slug: true,
//           address: true,
//           latitude: true,
//           longitude: true,
//           createdAt: true,
//           startDate: true,
//           endDate: true,
//           status: true,
//           averageRating: true,
//           category: {
//             select: { id: true, name: true, icon: true },
//           },
//           badges: {
//             select: { id: true, badge: true },
//           },
//           media: {
//             where: { type: 'IMAGE' },
//             select: { url: true },
//             take: 5,
//             orderBy: { uploadedAt: 'desc' },
//           },
//           _count: { select: { reviews: true } },
//         },
//       }),
//       this.prisma.experience.count({
//         where,
//       }),
//     ]);

//     return {
//       status: true,
//       data: experiences,
//       meta: {
//         total: count,
//         limit,
//         page,
//         cursor:
//           experiences.length > 0
//             ? experiences[experiences.length - 1].id
//             : null,
//       },
//     };
//   }

//   /**
//    * Get explore experiences with optimized queries and caching
//    * Returns: recommended (latest), popular (by bookings), trending (by rating), special offers
//    */
//   async findExploreExperiences(query: any = {}) {
//     try {
//       const { limit = 10, categoryId, city } = query;
//       const fetchLimit = Math.min(parseInt(limit), 20); // Max 20 per section
//       const today = new Date();

//       // Base where clause for all queries
//       const baseWhere: any = {
//         deletedAt: null,
//         status: {
//           in: ['PUBLISHED', 'ANOUNCEMENT'],
//         },
//         // Only include experiences with upcoming events or non-recurring
//         OR: [
//           {
//             events: {
//               some: {
//                 date: { gte: today },
//                 status: EventStatus.SCHEDULE,
//               },
//             },
//           },
//         ],
//       };

//       // Apply optional filters
//       if (categoryId) {
//         baseWhere.categoryId = categoryId;
//       }
//       if (city) {
//         baseWhere.city = { contains: city, mode: 'insensitive' };
//       }

//       // Optimized select fields for performance
//       const selectFields = {
//         id: true,
//         name: true,
//         shortDesc: true,
//         slug: true,
//         price: true,
//         city: true,
//         state: true,
//         coverImage: true,
//         averageRating: true,
//         reviewCount: true,
//         bookingCount: true,
//         createdAt: true,
//         discount: true,
//         latitude: true,
//         longitude: true,
//         scheduleType: true,
//         media: {
//           where: { type: MediaType.IMAGE },
//           select: { url: true },
//           take: 5,
//           orderBy: { uploadedAt: 'desc' as const },
//         },
//         category: {
//           select: { id: true, name: true, slug: true, icon: true },
//         },
//         user: {
//           select: {
//             id: true,
//             name: true,
//             avatar: true,
//             stripeOnboardingComplete: true,
//           },
//         },
//         events: {
//           where: {
//             date: { gte: today },
//             status: EventStatus.SCHEDULE,
//           },
//           select: {
//             id: true,
//             date: true,
//             price: true,
//           },
//           orderBy: { date: 'asc' as const },
//           take: 1, // Next upcoming event
//         },
//         _count: {
//           select: {
//             events: {
//               where: {
//                 date: { gte: today },
//                 status: EventStatus.SCHEDULE,
//               },
//             },
//           },
//         },
//       };

//       // Execute all queries in parallel for better performance
//       const [recommended, popular, trending, specialOffers] = await Promise.all(
//         [
//           // Recommended: Latest created with good ratings
//           this.prisma.experience.findMany({
//             where: {
//               ...baseWhere,
//               averageRating: { gte: 3.0 }, // Only recommend quality experiences
//             },
//             orderBy: [{ createdAt: 'desc' }, { averageRating: 'desc' }],
//             select: selectFields,
//             take: fetchLimit,
//           }),

//           // Popular: Most bookings
//           this.prisma.experience.findMany({
//             where: {
//               ...baseWhere,
//               bookingCount: { gt: 0 },
//             },
//             orderBy: [{ bookingCount: 'desc' }, { averageRating: 'desc' }],
//             select: selectFields,
//             take: fetchLimit,
//           }),

//           // Trending: Best ratings with recent activity
//           this.prisma.experience.findMany({
//             where: {
//               ...baseWhere,
//               averageRating: { gte: 4.0 },
//               reviewCount: { gte: 3 },
//             },
//             orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
//             select: selectFields,
//             take: fetchLimit,
//           }),

//           // Special Offers: Experiences with discounts
//           this.prisma.experience.findMany({
//             where: {
//               ...baseWhere,
//               discount: { gt: 0 },
//             },
//             orderBy: [{ discount: 'desc' }, { averageRating: 'desc' }],
//             select: selectFields,
//             take: fetchLimit,
//           }),
//         ],
//       );

//       // Enrich data with calculated fields
//       const enrichData = (experiences: any[]) => {
//         return experiences.map((exp) => ({
//           ...exp,
//           hasUpcomingEvents: exp._count.events > 0,
//           nextEventDate: exp.events[0]?.date || null,
//           startingPrice:
//             exp.events.length > 0
//               ? Math.min(...exp.events.map((e) => Number(e.price)))
//               : Number(exp.price),
//           discountedPrice: exp.discount
//             ? Number(exp.price) * (1 - exp.discount / 100)
//             : null,
//         }));
//       };

//       const result = {
//         status: true,
//         data: {
//           recommended: enrichData(recommended),
//           popular: enrichData(popular),
//           trending: enrichData(trending),
//           specialOffers: enrichData(specialOffers),
//         },
//         meta: {
//           totalSections: 4,
//           itemsPerSection: fetchLimit,
//           filters: { categoryId, city, limit },
//           generatedAt: new Date().toISOString(),
//         },
//       };

//       this.logger.log(
//         `[findExploreExperiences] Retrieved explore data: recommended=${recommended.length}, popular=${popular.length}, trending=${trending.length}, offers=${specialOffers.length}`,
//       );

//       return result;
//     } catch (error) {
//       this.logger.error('[findExploreExperiences] Error:', error);
//       throw new InternalServerErrorException(
//         'Failed to fetch explore experiences',
//       );
//     }
//   }

//   async findPublicBySlug(slug: string) {
//     const experience = await this.prisma.experience.findFirst({
//       where: {
//         slug: slug,
//         deletedAt: null,
//       },
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         shortDesc: true,
//         detailsDesc: true,
//         city: true,
//         country: true,
//         state: true,
//         status: true,
//         address: true,
//         zipCode: true,
//         latitude: true,
//         longitude: true,
//         startDate: true,
//         endDate: true,
//         price: true,
//         userId: true,
//         categoryId: true,
//         scheduleType: true,
//         recurrenceRules: true,
//         notes: true,
//         activities: true,
//         cancelPolicy: true,
//         cancellationFee: true,
//         latePolicy: true,
//         reschedulePolicy: true,
//         startTime: true,
//         endTime: true,
//         maxPerSlot: true,
//         maxGuest: true,
//         timeslots: true,
//         refundable: true,
//         averageRating: true,
//         badges: {
//           select: {
//             id: true,
//             badge: {
//               select: {
//                 id: true,
//                 name: true,
//                 icon: true,
//               },
//             },
//           },
//         },
//         category: {
//           select: { id: true, name: true, icon: true },
//         },
//         user: {
//           select: {
//             id: true,
//             name: true,
//             avatar: true,
//             bio: true,
//             about: true,
//             createdAt: true,
//           },
//         },
//         _count: {
//           select: {
//             reviews: true,
//             media: true,
//           },
//         },
//         media: {
//           select: {
//             id: true,
//             type: true,
//             url: true,
//             title: true,
//             description: true,
//           },
//         },
//         amenities: {
//           select: {
//             id: true,
//             amenity: {
//               select: {
//                 id: true,
//                 name: true,
//                 icon: true,
//               },
//             },
//           },
//         },
//         includes: true,
//         reviews: {
//           where: {
//             status: 'APPROVED',
//           },
//           orderBy: { createdAt: 'desc' },
//           take: 4,
//           select: {
//             id: true,
//             rating: true,
//             comment: true,

//             reviewee: {
//               select: {
//                 id: true,
//                 name: true,
//                 avatar: true,
//               },
//             },
//           },
//         },
//         reels: {
//           where: {
//             deletedAt: null,
//           },
//           take: 6,
//           orderBy: { createdAt: 'desc' },
//           select: {
//             id: true,
//             platform: true,
//             thumbnail: true,
//             videoId: true,
//             title: true,
//             description: true,
//             createdAt: true,
//           },
//         },
//         events: {
//           where: {
//             // isAvailable: true,
//             date: {
//               gte: new Date(),
//             },
//           },
//           select: {
//             id: true,
//             price: true,
//             discount: true,
//             date: true,
//             startTime: true,
//             endTime: true,
//             status: true,
//           },
//         },
//       },
//     });

//     if (!experience) {
//       throw new NotFoundException('Experience not found.');
//     }

//     //experience host other experiences
//     const hostExperiences = await this.prisma.experience.findMany({
//       where: {
//         userId: experience.userId,
//         deletedAt: null,
//         NOT: { id: experience.id },
//         status: 'PUBLISHED',
//       },
//       orderBy: { createdAt: 'desc' },
//       take: 4,
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         address: true,
//         price: true,
//         startDate: true,
//         endDate: true,
//         latitude: true,
//         longitude: true,
//         averageRating: true,
//         badges: {
//           select: { badge: { select: { name: true, icon: true } } },
//         },
//         _count: { select: { reviews: true } },
//         media: {
//           orderBy: { uploadedAt: 'desc' },
//           where: { type: 'IMAGE' },
//           take: 1,
//           select: { url: true },
//         },
//       },
//     });

//     // Get all related experiences
//     const relatedExperiences = await this.prisma.experience.findMany({
//       where: {
//         categoryId: experience.categoryId,
//         NOT: { id: experience.id },
//         deletedAt: null,
//         status: 'PUBLISHED',
//       },
//       orderBy: { createdAt: 'desc' },
//       take: 4,
//       select: {
//         id: true,
//         name: true,
//         slug: true,
//         address: true,
//         price: true,
//         startDate: true,
//         endDate: true,
//         latitude: true,
//         longitude: true,
//         averageRating: true,
//         badges: {
//           select: { badge: { select: { name: true, icon: true } } },
//         },
//         _count: { select: { reviews: true } },
//         media: {
//           orderBy: { uploadedAt: 'desc' },
//           where: { type: 'IMAGE' },
//           take: 1,
//           select: { url: true },
//         },
//       },
//     });
//     //get Related Blogs based on category
//     const relatedBlogs = await this.prisma.blog.findMany({
//       where: {
//         categories: {
//           some: {
//             id: experience.categoryId,
//           },
//         },
//         NOT: { id: experience.id },
//         isDeleted: false,
//         status: 'PUBLISHED',
//       },
//       orderBy: { createdAt: 'desc' },
//       take: 4,
//       select: {
//         id: true,
//         title: true,
//         slug: true,

//         coverImage: true,
//         publishedAt: true,
//         categories: {
//           where: { id: experience.categoryId },
//           select: { id: true, name: true, icon: true },
//         },
//         author: {
//           select: {
//             id: true,
//             name: true,
//             avatar: true,
//           },
//         },
//       },
//     });
//     const review = await this.getReviwStats(experience.id);

//     return {
//       status: true,
//       data: experience,
//       relatedExperiences,
//       hostExperiences,
//       relatedBlogs,
//       reviewStats: review.data,
//     };
//   }

//   private async getCalendarView(eventId: string, days = 30) {
//     const today = new Date();
//     const endDate = addDays(today, days);

//     // 1. Fetch all EventInstances in range
//     const instances = await this.prisma.events.findMany({
//       where: {
//         id: eventId,
//         date: {
//           gte: today,
//           lte: endDate,
//         },
//       },
//       orderBy: { date: 'asc' },
//     });

//     const calendarData = instances.map((instance) => ({
//       id: instance.id,
//       date: instance.date.toISOString().split('T')[0], // YYYY-MM-DD string
//       isAvailable: instance.isAvailable,
//       price: instance.price, // fallback price from Event if needed
//       status: instance.status,
//     }));

//     return calendarData;
//   }

//   async updateAllCoverImage() {
//     const experiences = await this.prisma.experience.findMany({
//       where: {
//         coverImage: null,
//       },
//     });

//     for (const experience of experiences) {
//       const coverImage = await this.prisma.experienceMedia.findFirst({
//         where: {
//           experienceId: experience.id,
//           type: 'IMAGE',
//         },
//       });

//       if (coverImage) {
//         await this.prisma.experience.update({
//           where: { id: experience.id },
//           data: { coverImage: coverImage.url },
//         });
//       }
//     }
//     return {
//       status: true,
//       message: 'All cover images updated successfully.',
//     };
//   }

//   async getAvailableExperiences(userId: string) {
//     const experiences = await this.prisma.experience.findMany({
//       where: {
//         userId,
//         status: 'PUBLISHED',
//         deletedAt: null,
//       },
//       select: {
//         id: true,
//         name: true,
//       },
//     });
//     return {
//       status: true,
//       data: experiences,
//     };
//   }

//   // async generateRecurringEvents() {
//   //   const today = startOfUTCDay(new Date());
//   //   // Fetch recurring experiences with minimal needed fields
//   //   const experiences = await this.prisma.experience.findMany({
//   //     where: {
//   //       deletedAt: null,
//   //       status: 'PUBLISHED',
//   //       scheduleType: 'RECURRING',
//   //     },
//   //     select: {
//   //       id: true,
//   //       openWindowDays: true,
//   //       startTime: true,
//   //       endTime: true,
//   //       endDate: true,
//   //       maxGuest: true,
//   //       maxPerSlot: true,
//   //       price: true,
//   //       discount: true,
//   //       discountType: true,
//   //       activities: true,
//   //       timeslots: true,
//   //       recurrenceRules: true,
//   //       events: {
//   //         take: 1,
//   //         orderBy: { date: 'desc' },
//   //         select: {
//   //           id: true,
//   //           date: true,
//   //           isAvailable: true,
//   //           price: true,
//   //           status: true,
//   //         },
//   //       },
//   //     },
//   //   });
//   //   if (!experiences.length) return;

//   //   console.log('Experience length', experiences.length);

//   //   const weekdayCode = (
//   //     d: Date,
//   //   ): 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' => {
//   //     const wd = d.getUTCDay();
//   //     return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][wd] as any;
//   //   };

//   //   for (const exp of experiences) {
//   //     // Basic guards
//   //     const rule: any = exp.recurrenceRules;
//   //     if (!rule || !Array.isArray(rule.byday) || rule.byday.length === 0) {
//   //       continue; // nothing to generate without byday
//   //     }

//   //     const windowDays =
//   //       typeof exp.openWindowDays === 'number' && exp.openWindowDays > 0
//   //         ? exp.openWindowDays
//   //         : 30; // sensible default window

//   //     // Compute max generation date cap
//   //     const until = rule.until ? new Date(rule.until) : null;
//   //     const windowLimit = addDaysUTC(today, windowDays);

//   //     const maxDate = [until, windowLimit]
//   //       .filter(Boolean)
//   //       .reduce(
//   //         (a: Date | null, b: Date | null) =>
//   //           a && b ? (a < b ? a : b) : a || b,
//   //         null as any,
//   //       );

//   //     if (!maxDate) continue;

//   //     // Find last generated event for this experience
//   //     const lastEvent = await this.prisma.events.findFirst({
//   //       where: { experienceId: exp.id },
//   //       orderBy: { date: 'desc' },
//   //       select: { date: true },
//   //     });

//   //     let startDate = lastEvent
//   //       ? addDaysUTC(startOfUTCDay(new Date(lastEvent.date)), 1)
//   //       : today;

//   //     const newEvents: any[] = [];

//   //     // Generate dates that match byday between startDate and maxDate
//   //     for (
//   //       let d = startOfUTCDay(startDate);
//   //       d <= maxDate;
//   //       d = addDaysUTC(d, 1)
//   //     ) {
//   //       const code = weekdayCode(d);
//   //       if (rule.byday.includes(code)) {
//   //         newEvents.push({
//   //           experienceId: exp.id,
//   //           date: d,
//   //           startTime: exp.startTime ?? null,
//   //           endTime: exp.endTime ?? null,
//   //           maxGuest: exp.maxGuest ?? 0,
//   //           maxperSlot: exp.maxPerSlot ?? null,
//   //           price: exp.price,
//   //           discount: exp.discount,
//   //           discountType: exp.discountType,
//   //           activities: exp.activities ?? undefined,
//   //           timeslots: exp.timeslots ?? undefined,
//   //           // status defaults to SCHEDULE
//   //           // isAvailable defaults to true
//   //         });
//   //       }
//   //     }

//   //     // if (newEvents.length) {
//   //     //   await this.prisma.events.createMany({
//   //     //     data: newEvents,
//   //     //     skipDuplicates: true, // prevent duplicates via unique(experienceId, date, startTime)
//   //     //   });
//   //     // }

//   //     return {
//   //       status: true,
//   //       generatedEvents: newEvents,
//   //       message: 'Recurring events generated successfully.',
//   //     };
//   //   }
//   // }

//   async generateRecurringEvents() {
//     const today = startOfUTCDay(new Date());

//     const experiences = await this.prisma.experience.findMany({
//       where: {
//         deletedAt: null,
//         status: 'PUBLISHED',
//         scheduleType: 'RECURRING',
//       },
//       select: {
//         id: true,
//         openWindowDays: true,
//         startTime: true,
//         endTime: true,
//         endDate: true,
//         maxGuest: true,
//         maxPerSlot: true,
//         price: true,
//         discount: true,
//         discountType: true,
//         activities: true,
//         timeslots: true,
//         recurrenceRules: true,
//         events: {
//           take: 1,
//           orderBy: { date: 'desc' },
//           select: { date: true },
//         },
//       },
//     });

//     if (!experiences.length) return;

//     const weekdayCode = (
//       d: Date,
//     ): 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' =>
//       ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getUTCDay()] as any;

//     const results: any[] = [];

//     for (const exp of experiences) {
//       const rule: any = exp.recurrenceRules;
//       if (!rule || !Array.isArray(rule.byday) || rule.byday.length === 0)
//         continue;

//       const windowDays =
//         exp.openWindowDays && exp.openWindowDays > 0 ? exp.openWindowDays : 30;
//       const until = rule.until ? new Date(rule.until) : null;
//       const windowLimit = addDaysUTC(today, windowDays);

//       const maxDate = [until, windowLimit]
//         .filter(Boolean)
//         .reduce(
//           (a: Date | null, b: Date | null) =>
//             a && b ? (a < b ? a : b) : a || b,
//           null,
//         );
//       if (!maxDate) continue;

//       const lastEventDate = exp.events[0]?.date || null;
//       let startDate = lastEventDate
//         ? addDaysUTC(startOfUTCDay(new Date(lastEventDate)), 1)
//         : today;

//       if (startDate < today) startDate = today; // prevent generating in the past

//       const newEvents: any[] = [];

//       for (
//         let d = startOfUTCDay(startDate);
//         d <= maxDate;
//         d = addDaysUTC(d, 1)
//       ) {
//         const code = weekdayCode(d);
//         if (rule.byday.includes(code)) {
//           newEvents.push({
//             experienceId: exp.id,
//             date: d,
//             startTime: exp.startTime ?? null,
//             endTime: exp.endTime ?? null,
//             maxGuest: exp.maxGuest ?? 0,
//             maxPerSlot: exp.maxPerSlot ?? null,
//             price: exp.price,
//             discount: exp.discount,
//             discountType: exp.discountType,
//             activities: exp.activities ?? undefined,
//             timeslots: exp.timeslots ?? undefined,
//           });
//         }
//       }

//       // if (newEvents.length) {
//       //   await this.prisma.events.createMany({
//       //     data: newEvents,
//       //     skipDuplicates: true,
//       //   });
//       //   results.push({ experienceId: exp.id, count: newEvents.length });
//       // }

//       results.push({ experienceId: exp.id, count: newEvents.length });
//     }

//     return {
//       status: true,
//       message: 'Recurring events generated successfully.',
//       results,
//     };
//   }

//   async getFeaturedExperiences(query: any) {
//     const {
//       page = '1',
//       limit = '10',
//       search,
//       sort = 'createdAt',
//       sortOrder = 'desc',
//     } = query;
//     const pageInt = parseInt(page);
//     const limitInt = parseInt(limit);

//     const skip = (pageInt - 1) * limitInt;
//     let where: any = {};

//     if (search) {
//       where.OR = [
//         { experience: { name: { contains: search, mode: 'insensitive' } } },
//         { experience: { address: { contains: search, mode: 'insensitive' } } },
//       ];
//     }

//     // Ensure featured experiences point to active/public experiences only
//     where = {
//       ...where,
//       experience: {
//         ...(where.experience || {}),
//         deletedAt: null,
//         status: { in: ['PUBLISHED', 'ANOUNCEMENT'] },
//       },
//     };

//     // Normalize and validate sort keys
//     // Accept inputs like 'createdAt' (featured table) or 'experience.createdAt'
//     const allowedExperienceSorts = new Set([
//       'createdAt',
//       'price',
//       'averageRating',
//       'reviewCount',
//       'bookingCount',
//       'city',
//       'country',
//       'name',
//     ]);

//     const rawSort: string = String(sort || '').trim();
//     const isDesc = String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';

//     // If the client passes 'experience.createdAt', map to 'createdAt' under experience relation
//     let normalizedExpSort = rawSort.startsWith('experience.')
//       ? rawSort.split('.').slice(1).join('.')
//       : rawSort;

//     // Construct orderBy safely
//     let orderBy: any;
//     if (normalizedExpSort === 'createdAt' || normalizedExpSort === '') {
//       // default: sort by featuredExperience.createdAt
//       orderBy = { createdAt: isDesc };
//     } else if (allowedExperienceSorts.has(normalizedExpSort)) {
//       // sort by a field of related experience
//       orderBy = { experience: { [normalizedExpSort]: isDesc } } as any;
//     } else {
//       // fallback to featuredExperience.createdAt to avoid Prisma error
//       orderBy = { createdAt: isDesc };
//     }

//     const [items, total] = await this.prisma.$transaction([
//       this.prisma.featuredExperience.findMany({
//         where,
//         skip,
//         take: limitInt,
//         orderBy,
//         include: {
//           experience: {
//             select: {
//               id: true,
//               name: true,
//               address: true,
//               city: true,
//               country: true,
//               status: true,
//               createdAt: true,
//               price: true,
//               averageRating: true,
//               reviewCount: true,
//               bookingCount: true,
//               coverImage: true,
//               isFeatured: true,
//               category: { select: { id: true, name: true, icon: true } },
//               media: {
//                 where: { type: 'IMAGE' },
//                 orderBy: { uploadedAt: 'desc' },
//                 take: 1,
//                 select: { url: true },
//               },
//               _count: { select: { reviews: true, events: true } },
//             },
//           },
//         },
//       }),
//       this.prisma.featuredExperience.count({ where }),
//     ]);

//     // Flatten structure to expose experience along with featured metadata
//     const data = items.map((it) => ({
//       id: it.id,
//       featuredAt: it.createdAt,
//       experience: it.experience,
//     }));

//     return {
//       status: true,
//       data,
//       total,
//       page: pageInt,
//       limit: limitInt,
//       totalPages: Math.ceil(total / limitInt),
//     };
//   }

//   async addFeaturedExperience(id: string) {
//     const experience = await this.prisma.experience.findUnique({
//       where: {
//         id,
//       },
//     });
//     if (!experience) {
//       throw new Error('Experience not found');
//     }

//     if (experience.status !== 'PUBLISHED') {
//       throw new Error('Experience is not published');
//     }

//     const featuredExperience = await this.prisma.featuredExperience.findUnique({
//       where: {
//         experienceId: id,
//       },
//     });

//     if (featuredExperience) {
//       throw new Error('Experience already featured');
//     }

//     const featured = await this.prisma.featuredExperience.create({
//       data: {
//         experienceId: id,
//       },
//     });
//     await this.prisma.experience.update({
//       where: {
//         id,
//       },
//       data: {
//         isFeatured: true,
//       },
//     });

//     return {
//       status: true,
//       data: featured,
//       message: 'Experience featured successfully',
//     };
//   }

//   async removeFeaturedExperience(id: string) {
//     const exist = await this.prisma.featuredExperience.findUnique({
//       where: { experienceId: id },
//     });
//     if (!exist) {
//       throw new Error('Experience not featured');
//     }
//     await this.prisma.featuredExperience.delete({
//       where: { experienceId: id },
//     });
//     await this.prisma.experience.update({
//       where: {
//         id,
//       },
//       data: {
//         isFeatured: false,
//       },
//     });
//     return {
//       status: true,
//       message: 'Experience unfeatured successfully',
//     };
//   }

//   private async getReviwStats(experienceId: string) {
//     const where: any = { experienceId };

//     const [aggregate, grouped] = await this.prisma.$transaction([
//       this.prisma.review.aggregate({
//         where,
//         _avg: { rating: true },
//         _sum: { rating: true },
//         _count: true,
//       }),
//       this.prisma.review.groupBy({
//         where,
//         by: ['rating'],
//         orderBy: { rating: 'asc' },
//         _count: { rating: true },
//       }),
//     ]);

//     const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
//     grouped.forEach((g: any) => {
//       const r = Number(g.rating);
//       if (r >= 1 && r <= 5) {
//         starCounts[r] = g._count?.rating ?? 0;
//       }
//     });

//     const total = (aggregate as any)._count ?? 0;
//     const totalRating = (aggregate as any)._sum?.rating ?? 0;
//     const avg = (aggregate as any)._avg?.rating ?? 0;

//     return {
//       status: true,
//       data: {
//         averageRating: Number((avg || 0).toFixed(2)),
//         totalRating: Number(totalRating || 0),
//         total: Number(total || 0),
//         oneStar: starCounts[1],
//         twoStar: starCounts[2],
//         threeStar: starCounts[3],
//         fourStar: starCounts[4],
//         fiveStar: starCounts[5],
//       },
//     };
//   }
// }
