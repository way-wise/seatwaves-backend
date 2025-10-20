/**
 * Test Utilities for SeatWaves Backend
 * Provides mock factories for common services used in unit tests
 */

import { PrismaService } from '../prisma/prisma.service';

/**
 * Mock PrismaService for unit tests
 */
export const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  transaction: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  ticket: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  notification: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  message: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

/**
 * Mock AuthService
 */
export const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  changePassword: jest.fn(),
};

/**
 * Mock TransactionService
 */
export const mockTransactionService = {
  createTransaction: jest.fn(),
  getTransactionById: jest.fn(),
  getAllTransactions: jest.fn(),
  updateTransactionStatus: jest.fn(),
  getSellerTransactions: jest.fn(),
  getTransactionAnalytics: jest.fn(),
  processHostPayout: jest.fn(),
};

/**
 * Mock BookingService
 */
export const mockBookingService = {
  createBooking: jest.fn(),
  getBooking: jest.fn(),
  getUserBookings: jest.fn(),
  updateBooking: jest.fn(),
  cancelBooking: jest.fn(),
  verifyBookingCode: jest.fn(),
};

/**
 * Mock EventService
 */
export const mockEventService = {
  createEvent: jest.fn(),
  getEvent: jest.fn(),
  getAllEvents: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  bulkUpload: jest.fn(),
};

/**
 * Mock StripeService
 */
export const mockStripeService = {
  createCheckoutSession: jest.fn(),
  createHostOnboardingLink: jest.fn(),
  getAccountStatus: jest.fn(),
  handleWebhook: jest.fn(),
  createTransfer: jest.fn(),
};

/**
 * Mock UsersService
 */
export const mockUsersService = {
  getUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  verifyHost: jest.fn(),
  getBusinessInfo: jest.fn(),
};

/**
 * Mock NotificationService
 */
export const mockNotificationService = {
  createNotification: jest.fn(),
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
};

/**
 * Mock ReviewService
 */
export const mockReviewService = {
  createReview: jest.fn(),
  getReviews: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
};

/**
 * Mock MessageService
 */
export const mockMessageService = {
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  deleteMessage: jest.fn(),
  getRooms: jest.fn(),
};

/**
 * Mock ConfigService
 */
export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      DATABASE_URL: 'postgresql://test',
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1d',
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      APP_CLIENT_URL: 'http://localhost:3000',
      DISABLE_LOCAL_STORAGE: 'false',
    };
    return config[key];
  }),
};

/**
 * Mock JwtService
 */
export const mockJwtService = {
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({ userId: 'test-user-id' })),
  decode: jest.fn(() => ({ userId: 'test-user-id' })),
};

/**
 * Mock EmailService
 */
export const mockEmailService = {
  sendEmailToUser: jest.fn(),
  sendEmail: jest.fn(),
};

/**
 * Mock ActivityService
 */
export const mockActivityService = {
  log: jest.fn(),
  getUserActivity: jest.fn(),
  getAdminActivityLogs: jest.fn(),
};

/**
 * Mock CacheService
 */
export const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

/**
 * Mock Reflector (for guards)
 */
export const mockReflector = {
  get: jest.fn(),
  getAll: jest.fn(),
  getAllAndOverride: jest.fn(),
  getAllAndMerge: jest.fn(),
};

/**
 * Mock UploadService
 */
export const mockUploadService = {
  uploadFile: jest.fn(),
  uploadFiles: jest.fn(),
  deleteFile: jest.fn(),
  makeUrlPublic: jest.fn(),
};

/**
 * Mock ContentService
 */
export const mockContentService = {
  getHeroSection: jest.fn(),
  createHeroSection: jest.fn(),
  updateHeroSection: jest.fn(),
  getTestimonials: jest.fn(),
  createTestimonial: jest.fn(),
};

/**
 * Mock BlogService
 */
export const mockBlogService = {
  createBlog: jest.fn(),
  getBlog: jest.fn(),
  getAllBlogs: jest.fn(),
  updateBlog: jest.fn(),
  deleteBlog: jest.fn(),
};

/**
 * Mock CategoryService
 */
export const mockCategoryService = {
  createCategory: jest.fn(),
  getCategory: jest.fn(),
  getAllCategories: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
};

/**
 * Mock DashboardService
 */
export const mockDashboardService = {
  getStats: jest.fn(),
  getRevenueStats: jest.fn(),
  getBookingStats: jest.fn(),
};

/**
 * Mock ReportsService
 */
export const mockReportsService = {
  createReport: jest.fn(),
  getReports: jest.fn(),
  updateReport: jest.fn(),
  deleteReport: jest.fn(),
};

/**
 * Mock FeedbackService
 */
export const mockFeedbackService = {
  createFeedback: jest.fn(),
  getFeedbacks: jest.fn(),
  deleteFeedback: jest.fn(),
};

/**
 * Mock HelpService
 */
export const mockHelpService = {
  getFAQs: jest.fn(),
  createFAQ: jest.fn(),
  updateFAQ: jest.fn(),
  deleteFAQ: jest.fn(),
};

/**
 * Mock WebhookService
 */
export const mockWebhookService = {
  handleStripeWebhook: jest.fn(),
  processWebhookEvent: jest.fn(),
};

/**
 * Mock TasksService
 */
export const mockTasksService = {
  handleCron: jest.fn(),
  expirePoints: jest.fn(),
};

/**
 * Mock RoleService
 */
export const mockRoleService = {
  createRole: jest.fn(),
  getRoles: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn(),
};

/**
 * Mock PointsService
 */
export const mockPointsService = {
  getPoints: jest.fn(),
  addPoints: jest.fn(),
  redeemPoints: jest.fn(),
};

/**
 * Mock Queue (BullMQ)
 */
export const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
  on: jest.fn(),
};

/**
 * Helper to reset all mocks
 */
export const resetAllMocks = () => {
  Object.values(mockPrismaService).forEach((mock: any) => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach((fn: any) => {
        if (jest.isMockFunction(fn)) fn.mockReset();
      });
    } else if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });

  [
    mockAuthService,
    mockTransactionService,
    mockBookingService,
    mockEventService,
    mockStripeService,
    mockUsersService,
    mockNotificationService,
    mockReviewService,
    mockMessageService,
    mockConfigService,
    mockJwtService,
    mockEmailService,
    mockActivityService,
    mockQueue,
    mockCacheService,
    mockReflector,
    mockUploadService,
    mockContentService,
    mockBlogService,
    mockCategoryService,
    mockDashboardService,
    mockReportsService,
    mockFeedbackService,
    mockHelpService,
    mockWebhookService,
    mockTasksService,
    mockRoleService,
    mockPointsService,
  ].forEach((service) => {
    Object.values(service).forEach((fn: any) => {
      if (jest.isMockFunction(fn)) fn.mockReset();
    });
  });
};

/**
 * Factory to create mock user
 */
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  status: 'ACTIVE',
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Factory to create mock booking
 */
export const createMockBooking = (overrides = {}) => ({
  id: 'booking-123',
  userId: 'user-123',
  ticketId: 'ticket-123',
  status: 'PENDING',
  total: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Factory to create mock transaction
 */
export const createMockTransaction = (overrides = {}) => ({
  id: 'txn-123',
  type: 'BOOKING_PAYMENT',
  status: 'SUCCESS',
  amount: 100,
  currency: 'USD',
  provider: 'STRIPE',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
