import { PrismaClient, PointRuleAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Define permissions grouped by domain
const permissionGroups: Record<string, string[]> = {
  category: [
    'category.create',
    'category.update',
    'category.delete',
    'category.read',
  ],
  event: [
    'event.create',
    'event.update',
    'event.delete',
    'event.read',
    'event.publish',
    'event.verify',
    'event.manage',
  ],
  booking: [
    'booking.create',
    'booking.read',
    'booking.cancel',
    'booking.manage', // refund, reassign, etc (admin/seller)
  ],
  user: [
    'user.read',
    'user.manage',
    'user.update',
    'user.delete',
    'user.wishlist.view',
    'user.bookings.view',
    'user.message.view',
    'user.profile.view',
    'user.notification.view',
    'user.settings.view',
    'user.helpcenter.view',
    'user.status',
  ], // manage = create/update/delete/ban
  // New groups to secure admin operations
  role: [
    'role.create',
    'role.read',
    'role.update',
    'role.delete',
    'role.assign',
    'role.revoke',
    'role.user.read',
    'role.permissions.read',
  ],
  verification: ['verification.read', 'verification.update'],
  amenity: [
    'amenity.create',
    'amenity.update',
    'amenity.delete',
    'amenity.read',
  ],
  blog: ['blog.create', 'blog.update', 'blog.delete', 'blog.read'],
  coupon: [
    'coupon.create',
    'coupon.update',
    'coupon.delete',
    'coupon.read',
    'coupon.redeem',
  ],
  feedback: ['feedback.read'],
  help: ['help.read', 'help.update', 'help.delete', 'help.create'],
  message: [
    'message.create',
    'message.read',
    'message.update',
    'message.delete',
    'message.initiate',
    'message.send',
    'message.delete.room',
  ],
  review: ['review.create', 'review.update', 'review.read', 'review.reply'],
  report: ['report.create', 'report.update', 'report.read', 'report.reply'],

  content: [
    'content.read',
    'content.update',
    'content.delete',
    'content.create',
    'content.home.create',
    'content.home.update',
    'content.about.create',
    'content.about.update',
    'content.testimonial.create',
    'content.testimonial.update',
    'content.testimonial.delete',
    'content.testimonial.read',
    'content.testimonial.update',
    // New Admin Settings content permissions
    'content.privacypolicy.create',
    'content.privacypolicy.update',
    'content.termsandservice.create',
    'content.termsandservice.update',
    'content.trustandsafety.create',
    'content.trustandsafety.update',
    'content.communityguidelines.create',
    'content.communityguidelines.update',
    'content.cancellationpolicy.create',
    'content.cancellationpolicy.update',
    'content.career.create',
    'content.career.update',
    'content.banner.create',
    'content.banner.update',
    'content.card.create',
    'content.card.update',
  ],
  admin: [
    'admin.dashboard.view',
    'admin.verification.view',
    'admin.category.view',
    'admin.event.view',
    'admin.booking.view',
    'admin.user.view',
    'admin.role.view',
    'admin.role.permissions.view',
    'admin.blog.view',
    'admin.coupon.view',
    'admin.amenity.view',
    'admin.feedback.view',
    'admin.event.view',
    'admin.participant.view',
    'admin.faq.view',
    'admin.transaction.view',
    'admin.activity.view',
    'admin.point.view',
    'admin.cms.view',
    'admin.balance.view',
    'admin.analysis.view',
    'admin.report.view',
  ],
  // Loyalty / Points permissions
  points: ['points.read', 'points.update', 'points.award', 'points.redeem'],
  seller: [
    'seller.calendar.view',
    'seller.dashboard.view',
    'seller.earnings.view',
    'seller.events.view',
    'seller.event.view',
    'seller.events.view',
    'seller.event.view',
    'seller.participants.view',
    'seller.booking.view',
    'seller.messages.view',
    'seller.reviews.view',
    'seller.settings.view',
    'seller.transactions.view',
    'seller.transaction.view',
  ],
};

const roles: Record<string, string[]> = {
  ADMIN: [
    // All permissions
    ...Object.values(permissionGroups).flat(),
  ],
  SELLER: [
    'event.create',
    'event.update',
    'event.delete',
    'event.read',
    'event.publish',
    'event.verify',
    'event.manage',
    'booking.read',
    'booking.manage',
    'event.create',
    'event.update',
    'event.delete',
    'event.read',
    'event.manage',
    'seller.calendar.view',
    'seller.dashboard.view',
    'seller.earnings.view',
    'seller.events.view',
    'seller.event.view',
    'seller.events.view',
    'seller.event.view',
    'seller.participants.view',
    'seller.booking.view',
    'seller.messages.view',
    'seller.reviews.view',
    'seller.settings.view',
    'seller.transactions.view',
    'seller.transaction.view',
    'message.create',
    'message.read',
    'message.update',
    'message.delete',
    'message.initiate',
    'message.send',
    'message.delete.room',
    'coupon.create',
    'coupon.update',
    'coupon.delete',
    'coupon.read',
    'coupon.redeem',
    'review.create',
    'review.update',
    'review.read',
    'review.reply',
    'user.read',
    'user.manage',
    'user.update',
    'user.delete',
    'user.wishlist.view',
    'user.bookings.view',
    'user.message.view',
    'user.profile.view',
    'user.notification.view',
    'user.settings.view',
    'user.helpcenter.view',
    'event.read',
    'booking.create',
    'booking.read',
    'booking.cancel',
    'category.read',
    'amenity.read',
    'coupon.read',
    'help.read',
    'message.create',
    'message.read',
    'message.update',
    'message.delete',
    'message.initiate',
    'message.send',
    'message.delete.room',
    'review.create',
    'review.update',
    'review.read',
    'review.reply',
    'user.read',
    'user.manage',
    'user.update',
    'user.delete',
    'user.wishlist.view',
    'user.bookings.view',
    'user.message.view',
    'user.profile.view',
    'user.notification.view',
    'user.settings.view',
    'user.helpcenter.view',
    'coupon.read',
    'report.read',
    'report.update',
    'report.delete',
    'report.manage',
  ],
  USER: [
    'event.read',
    'booking.create',
    'booking.read',
    'booking.cancel',
    'category.read',
    'amenity.read',
    'coupon.read',
    'help.read',
    'message.create',
    'message.read',
    'message.update',
    'message.delete',
    'message.initiate',
    'message.send',
    'message.delete.room',
    'review.create',
    'review.update',
    'review.read',
    'review.reply',
    'user.read',
    'user.manage',
    'user.update',
    'user.delete',
    'user.wishlist.view',
    'user.bookings.view',
    'user.message.view',
    'user.profile.view',
    'user.notification.view',
    'user.settings.view',
    'user.helpcenter.view',
    'coupon.read',
    'report.read',
    'report.create',
    'report.update',
    'report.delete',
    'report.manage',
  ],
};

async function main() {
  console.log('Seeding permissions and roles...');

  // Upsert permissions
  const allPermissions = Object.entries(permissionGroups).flatMap(
    ([group, names]) => names.map((name) => ({ name, group })),
  );

  const permissionMap = new Map<string, string>(); // name -> id
  for (const perm of allPermissions) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      create: { name: perm.name, group: perm.group },
      update: { group: perm.group },
    });
    permissionMap.set(p.name, p.id);
  }

  // Upsert roles
  const roleIdByName = new Map<string, string>();
  for (const roleName of Object.keys(roles)) {
    const r = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {},
    });
    roleIdByName.set(roleName, r.id);
  }

  // Attach permissions to roles (RolePermission)
  for (const [roleName, permNames] of Object.entries(roles)) {
    const roleId = roleIdByName.get(roleName)!;

    // Get existing rolePermissions
    const existing = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const existingSet = new Set(existing.map((e) => e.permissionId));

    const desiredIds = permNames
      .map((n) => permissionMap.get(n))
      .filter((id): id is string => Boolean(id));
    // Ensure we don't attempt to create duplicates within the same seeding run
    const uniqueDesiredIds = Array.from(new Set(desiredIds));

    // Create missing
    for (const pid of uniqueDesiredIds) {
      if (!existingSet.has(pid)) {
        await prisma.rolePermission.create({
          data: { roleId, permissionId: pid },
        });
        // Track newly created to prevent duplicate inserts later in the loop
        existingSet.add(pid);
      }
    }

    // Optionally remove extras not in the desired set to keep tight sync
    const desiredSet = new Set(uniqueDesiredIds);
    const toRemove = [...existingSet].filter((id) => !desiredSet.has(id));
    if (toRemove.length) {
      await prisma.rolePermission.deleteMany({
        where: { roleId, permissionId: { in: toRemove } },
      });
    }
  }

  // password hash
  const passwordHash = await bcrypt.hash('admin', 10);

  console.log(passwordHash);

  // Create or upsert a single admin user and assign the ADMIN role
  await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    create: {
      name: 'Admin',
      email: 'admin@admin.com',
      password: passwordHash,
      accounts: {
        create: {
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: 'admin@admin.com',
        },
      },

      roles: {
        // User.roles points to UserRoles[] (explicit join model). We must create a join row
        // and connect the Role by its unique name.
        create: {
          role: { connect: { name: 'ADMIN' } },
        },
      },
    },
    update: {},
  });

  // Seed Loyalty Tiers (SILVER, GOLD, DIAMOND)
  await seedLoyaltyTiers();

  // Seed default Point Rules (loyalty)
  await seedPointRules();

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ======================= Helpers =======================
async function seedLoyaltyTiers() {
  console.log('Seeding loyalty tiers...');

  const tiers: Array<{
    name: string;
    priority: number;
    minPoints: number;
    durationDays: number;
    active?: boolean;
    benefits?: Record<string, any>;
  }> = [
    {
      name: 'SILVER',
      priority: 1,
      minPoints: 0,
      durationDays: 365,
      active: true,
      benefits: { label: 'Base tier' },
    },
    {
      name: 'GOLD',
      priority: 2,
      minPoints: 5000, // adjust to your program
      durationDays: 365,
      active: true,
      benefits: { multiplier: 1.25 },
    },
    {
      name: 'DIAMOND',
      priority: 3,
      minPoints: 15000, // adjust to your program
      durationDays: 365,
      active: true,
      benefits: { multiplier: 1.5 },
    },
  ];

  for (const t of tiers) {
    await prisma.loyaltyTier.upsert({
      where: { name: t.name },
      create: {
        name: t.name,
        priority: t.priority,
        minPoints: t.minPoints,
        durationDays: t.durationDays,
        active: t.active ?? true,
        benefits: (t.benefits as any) || undefined,
      },
      update: {
        priority: t.priority,
        minPoints: t.minPoints,
        durationDays: t.durationDays,
        active: t.active ?? true,
        benefits: (t.benefits as any) || undefined,
      },
    });
  }
}

async function seedPointRules() {
  console.log('Seeding point rules...');

  const defaults: Array<{
    action: PointRuleAction;
    name: string;
    basePoints: number;
    perUnit?: boolean;
    unitAmount?: number | null;
    expiryMonths?: number;
    active?: boolean;
    tierMultipliers?: Record<string, number>;
    metadata?: Record<string, any>;
  }> = [
    {
      action: PointRuleAction.BOOKING,
      name: 'Purchase Points',
      basePoints: 1,
      perUnit: true,
      unitAmount: 100, // 1 point per $1
      expiryMonths: 12,
      active: true,
      tierMultipliers: { SILVER: 1.0, GOLD: 1.25, DIAMOND: 1.5 },
    },
    {
      action: PointRuleAction.SIGNUP,
      name: 'Signup Bonus',
      basePoints: 500,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: true,
    },
    {
      action: PointRuleAction.REFERRAL_SIGNUP,
      name: 'Referral Signup',
      basePoints: 500,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: true,
    },
    {
      action: PointRuleAction.REFERRAL_PURCHASE,
      name: 'Referral Purchase',
      basePoints: 1,
      perUnit: true,
      unitAmount: 100,
      expiryMonths: 12,
      active: true,
    },
    {
      action: PointRuleAction.REVIEW_SUBMITTED,
      name: 'Review Submitted',
      basePoints: 100,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: true,
    },
    {
      action: PointRuleAction.BIRTHDAY_BONUS,
      name: 'Birthday Bonus',
      basePoints: 200,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: true,
    },
    {
      action: PointRuleAction.LOGIN_STREAK,
      name: 'Login Streak',
      basePoints: 10,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: true,
      metadata: { period: 'daily' },
    },
    {
      action: PointRuleAction.SOCIAL_SHARE,
      name: 'Social Share',
      basePoints: 5,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: true,
    },
    {
      action: PointRuleAction.MANUAL_ADJUSTMENT,
      name: 'Manual Adjustment',
      basePoints: 0,
      perUnit: false,
      unitAmount: null,
      expiryMonths: 12,
      active: false,
    },
  ];

  for (const d of defaults) {
    const existing = await prisma.pointRule.findFirst({
      where: { action: d.action, name: d.name },
    });
    if (!existing) {
      await prisma.pointRule.create({
        data: {
          action: d.action,
          name: d.name,
          basePoints: d.basePoints,
          perUnit: !!d.perUnit,
          unitAmount: typeof d.unitAmount === 'number' ? d.unitAmount : null,
          expiryMonths: d.expiryMonths ?? 12,
          active: d.active ?? true,
          tierMultipliers: d.tierMultipliers
            ? (d.tierMultipliers as any)
            : undefined,
          metadata: d.metadata ? (d.metadata as any) : undefined,
        },
      });
      continue;
    }
    await prisma.pointRule.update({
      where: { id: existing.id },
      data: {
        basePoints: d.basePoints,
        perUnit: !!d.perUnit,
        unitAmount: typeof d.unitAmount === 'number' ? d.unitAmount : null,
        expiryMonths: d.expiryMonths ?? existing.expiryMonths,
        active: d.active ?? existing.active,
        tierMultipliers: d.tierMultipliers
          ? (d.tierMultipliers as any)
          : existing.tierMultipliers,
        metadata: d.metadata ? (d.metadata as any) : existing.metadata,
      },
    });
  }
}
