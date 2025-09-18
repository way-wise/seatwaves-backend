// // amenity.service.ts
// import { Injectable, NotAcceptableException } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import {
//   CreateAmenityDto,
//   createAmenitySchema,
//   UpdateAmenityDto,
//   updateAmenitySchema,
// } from './dto/create.dto';
// import { UploadService } from 'src/upload/upload.service';
// import { queryAmenitySchema } from './dto/query.dto';

// @Injectable()
// export class AmenityService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly uploadService: UploadService,
//   ) {}

//   async create(body: CreateAmenityDto, file?: Express.Multer.File) {
//     const parsebody = createAmenitySchema.safeParse(body);

//     if (!parsebody.success) {
//       throw new NotAcceptableException(parsebody.error.errors);
//     }

//     //Check if amenity already exists
//     const exists = await this.prisma.amenity.findFirst({
//       where: { name: parsebody.data.name },
//     });
//     if (exists) {
//       throw new NotAcceptableException('Amenity already exists');
//     }

//     let iconkey;
//     if (file) {
//       const uploadResult = await this.uploadService.uploadFile(
//         file,
//         'amenities',
//       );
//       iconkey = uploadResult.Key; // or `uploadResult.Location` if S3
//     }

//     const slug = parsebody.data.slug
//       ? parsebody.data.slug
//       : parsebody.data.name.substring(0, 30).toLowerCase().replace(/\s/g, '-');

//     const existsSlug = await this.prisma.amenity.findFirst({
//       where: { slug },
//     });

//     if (existsSlug) {
//       throw new NotAcceptableException('Amenity already exists');
//     }

//     const amenity = await this.prisma.amenity.create({
//       data: {
//         ...parsebody.data,
//         slug: slug,
//         icon: iconkey,
//       },
//     });
//     return {
//       status: true,
//       data: amenity,
//       message: 'Amenity created successfully',
//     };
//   }

//   async update(id: string, data: UpdateAmenityDto, file?: Express.Multer.File) {
//     const parsebody = updateAmenitySchema.safeParse(data);

//     if (!parsebody.success) {
//       throw new NotAcceptableException(parsebody.error.errors);
//     }

//     const amenity = await this.prisma.amenity.findUnique({ where: { id } });

//     if (data.name) {
//       const exists = await this.prisma.amenity.findFirst({
//         where: { name: parsebody.data.name },
//       });
//       if (exists && exists.id !== id) {
//         throw new NotAcceptableException('Amenity already exists');
//       }
//     }

//     if (!amenity) {
//       throw new NotAcceptableException('Amenity not found');
//     }

//     if (file && amenity.icon) {
//       await this.uploadService.deleteFile(amenity.icon);
//     }
//     let iconkey;

//     if (file) {
//       const uploadResult = await this.uploadService.uploadFile(
//         file,
//         'amenities',
//       );
//       iconkey = uploadResult.Key;
//     }

//     const update = await this.prisma.amenity.update({
//       where: { id },
//       data: {
//         ...parsebody.data,
//         icon: iconkey,
//       },
//     });
//     return {
//       status: true,
//       data: update,
//       message: 'Amenity updated successfully',
//     };
//   }

//   async findAll(query: any) {
//     const parseQuery = queryAmenitySchema.safeParse(query);

//     if (!parseQuery.success) {
//       throw new NotAcceptableException(parseQuery.error.errors);
//     }

//     let where: any = {};

//     if (query.search) {
//       where = {
//         OR: [
//           {
//             name: {
//               contains: query.search,
//               mode: 'insensitive',
//             },
//           },
//           {
//             description: {
//               contains: query.search,
//               mode: 'insensitive',
//             },
//           },
//           {
//             slug: {
//               contains: query.search,
//               mode: 'insensitive',
//             },
//           },
//         ],
//       };
//     }
//     const amenities = await this.prisma.amenity.findMany({
//       where,
//       orderBy: {
//         createdAt: 'desc',
//       },
//     });

//     return {
//       status: true,
//       data: amenities,
//     };
//   }

//   async findOne(id: string) {
//     const amenity = await this.prisma.amenity.findUnique({ where: { id } });

//     if (!amenity) {
//       throw new NotAcceptableException('Amenity not found');
//     }
//     return {
//       status: true,
//       data: amenity,
//     };
//   }

//   //Only remove no use amenity
//   async remove(id: string) {
//     const amenity = await this.prisma.amenity.findUnique({
//       where: { id },
//       include: {
//         experiences: true,
//       },
//     });

//     if (!amenity) {
//       throw new NotAcceptableException('Amenity not found');
//     }

//     if (amenity.experiences.length > 0) {
//       throw new NotAcceptableException('Amenity already in use in experience ');
//     }

//     if (amenity.icon) {
//       await this.uploadService.deleteFile(amenity.icon);
//     }
//     await this.prisma.amenity.delete({ where: { id } });
//     return {
//       status: true,
//       message: 'Amenity removed successfully',
//     };
//   }
// }
