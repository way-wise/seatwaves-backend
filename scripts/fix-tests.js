/**
 * Automated Test Fixer for SeatWaves Backend
 * Fixes common test patterns by adding mock providers
 */

const fs = require('fs');
const path = require('path');

// Map of service names to their mock names
const serviceMocks = {
  'AuthService': 'mockAuthService',
  'TransactionService': 'mockTransactionService',
  'BookingService': 'mockBookingService',
  'EventService': 'mockEventService',
  'StripeService': 'mockStripeService',
  'UsersService': 'mockUsersService',
  'NotificationService': 'mockNotificationService',
  'ReviewService': 'mockReviewService',
  'MessageService': 'mockMessageService',
  'PrismaService': 'mockPrismaService',
  'ConfigService': 'mockConfigService',
  'JwtService': 'mockJwtService',
  'EmailService': 'mockEmailService',
  'ActivityService': 'mockActivityService',
  'ContentService': 'mockContentService',
  'BlogService': 'mockBlogService',
  'CategoryService': 'mockCategoryService',
  'DashboardService': 'mockDashboardService',
  'ReportsService': 'mockReportsService',
  'FeedbackService': 'mockFeedbackService',
  'HelpService': 'mockHelpService',
  'WebhookService': 'mockWebhookService',
  'TasksService': 'mockTasksService',
  'UploadService': 'mockUploadService',
  'Reflector': 'mockReflector',
  'CacheService': 'mockCacheService',
};

// Guards to override
const guardsToOverride = [
  'AuthGuard',
  'PermissionsGuard',
  'ThrottlerGuard',
];

function findTestFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'coverage') {
        findTestFiles(filePath, fileList);
      }
    } else if (file.endsWith('.spec.ts') && !filePath.includes('test-utils')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function detectRequiredServices(content) {
  const required = [];
  
  // Check constructor calls and service references
  Object.keys(serviceMocks).forEach(service => {
    if (content.includes(service)) {
      required.push(service);
    }
  });

  return required;
}

function hasTestUtilsImport(content) {
  return content.includes('from \'../test/test-utils\'') ||
         content.includes('from \'../../test/test-utils\'') ||
         content.includes('from \'src/test/test-utils\'');
}

function hasProvidersArray(content) {
  return content.includes('providers: [') && content.includes('].compile()');
}

function fixTestFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Skip if already has test-utils import
  if (hasTestUtilsImport(content)) {
    console.log(`⏭️  Skipped (already fixed): ${path.basename(filePath)}`);
    return false;
  }

  // Detect required services
  const requiredServices = detectRequiredServices(content);
  
  if (requiredServices.length === 0) {
    console.log(`⏭️  Skipped (no services): ${path.basename(filePath)}`);
    return false;
  }

  // Determine correct relative path to test-utils
  const depth = filePath.split(path.sep).filter(p => p === 'src').length;
  const relativePath = depth > 1 ? '../../test/test-utils' : '../test/test-utils';

  // Get the mocks needed
  const mocksNeeded = requiredServices.map(s => serviceMocks[s]);
  const mocksImport = mocksNeeded.join(', ');

  // Add import for test-utils
  const importLine = `import { ${mocksImport} } from '${relativePath}';`;
  
  // Find where to insert (after last import)
  const importRegex = /import.*from.*;\n/g;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const insertIndex = content.indexOf(lastImport) + lastImport.length;
    content = content.slice(0, insertIndex) + importLine + '\n' + content.slice(insertIndex);
    modified = true;
  }

  // Add providers if not exists or update existing
  if (!hasProvidersArray(content)) {
    // Add providers array
    const providers = requiredServices.map(service => {
      return `        {\n          provide: ${service},\n          useValue: ${serviceMocks[service]},\n        }`;
    }).join(',\n');

    const controllersMatch = content.match(/controllers: \[(.*?)\]/);
    if (controllersMatch) {
      const replacement = `controllers: [${controllersMatch[1]}],\n      providers: [\n${providers},\n      ]`;
      content = content.replace(/controllers: \[(.*?)\]/, replacement);
      modified = true;
    }
  }

  // Add guard overrides for controllers with guards
  if (content.includes('Controller') && (content.includes('@UseGuards') || content.includes('PermissionsGuard'))) {
    const guardOverrides = `.overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })\n    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })`;
    
    if (!content.includes('.overrideGuard')) {
      content = content.replace(/\}\)\.compile\(\);/, `})
    ${guardOverrides}
    .compile();`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.basename(filePath)} (added ${requiredServices.length} mocks)`);
    return true;
  }

  return false;
}

// Main execution
console.log('🔧 Starting automated test fixer...\n');

const srcDir = path.join(__dirname, '..', 'src');
const testFiles = findTestFiles(srcDir);

console.log(`📁 Found ${testFiles.length} test files\n`);

let fixed = 0;
let skipped = 0;
let errors = 0;

testFiles.forEach(file => {
  try {
    if (fixTestFile(file)) {
      fixed++;
    } else {
      skipped++;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${path.basename(file)}: ${error.message}`);
    errors++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);
console.log(`\n🎉 Done! Run 'pnpm test' to verify.`);
