# Quick Fix: All Remaining Tests

## ✅ STATUS: 5/43 tests passing, 38 failing

## 🎯 Root Cause
Most failures are due to:
1. Missing service mocks in providers
2. Guards (PermissionsGuard) requiring dependencies

## 🚀 **QUICK FIX SOLUTION**

### For ALL Service Tests (`.service.spec.ts`):
Add this pattern:

```typescript
import { mockPrismaService } from '../test/test-utils';
import { PrismaService } from '../prisma/prisma.service';

// In providers array:
providers: [
  YourService,
  {
    provide: PrismaService,
    useValue: mockPrismaService,
  },
],
```

### For ALL Controller Tests With Guards:
Add guard overrides:

```typescript
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';

// After createTestingModule:
.overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
.overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
.compile();
```

---

## 📋 Files to Fix (Copy-Paste Ready)

### 1. Activity Service (`activity/activity.service.spec.ts`)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../test/test-utils';

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### 2. Blog Controller (`blog/blog.controller.spec.ts`)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockBlogService } from '../test/test-utils';

describe('BlogController', () => {
  let controller: BlogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        {
          provide: BlogService,
          useValue: mockBlogService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<BlogController>(BlogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

### 3. Dashboard Controller (`dashboard/dashboard.controller.spec.ts`)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockDashboardService } from '../test/test-utils';

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

### 4. Reports Controller (`reports/reports.controller.spec.ts`)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockReportsService } from '../test/test-utils';

describe('ReportsController', () => {
  let controller: ReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

---

## ⚡ APPLY ALL FIXES AT ONCE

Run this PowerShell command from the backend root:

```powershell
# Apply fixes to all service specs
Get-ChildItem -Path src -Filter "*.service.spec.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if (-not ($content -match "mockPrismaService")) {
        Write-Host "Needs fix: $($_.Name)"
    }
}
```

---

## 🎓 PATTERN REFERENCE

### Service Test Template:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, /* other mocks */ } from '../test/test-utils';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: PrismaService, useValue: mockPrismaService },
        // Add other dependencies as needed
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Controller Test Template (with guards):
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyController } from './my.controller';
import { MyService } from './my.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockMyService } from '../test/test-utils';

describe('MyController', () => {
  let controller: MyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyController],
      providers: [
        { provide: MyService, useValue: mockMyService },
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<MyController>(MyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

---

## 📊 After Applying Fixes

Expected result:
```
Test Suites: 43 passed, 43 total
Tests:       43+ passed, 43+ total
✅ All tests passing!
```

---

## 🆘 If Tests Still Fail

1. Check the error message for missing dependencies
2. Add the mock from `test-utils.ts`
3. If mock doesn't exist, add it to `test-utils.ts` first

**Example:**
```typescript
// If error says "Cannot resolve SomeNewService"
// Add to test-utils.ts:
export const mockSomeNewService = {
  someMethod: jest.fn(),
};

// Then use it in test:
{ provide: SomeNewService, useValue: mockSomeNewService }
```

---

## ✅ Quick Verification

After fixing, run:
```bash
pnpm test -- --passWithNoTests
```

For specific module:
```bash
pnpm test -- booking
pnpm test -- auth
pnpm test -- transaction
```

---

**TL;DR:** 
1. All services need `mockPrismaService`
2. All controllers with guards need `.overrideGuard()`
3. Use templates above for quick fixes
4. Run `pnpm test` to verify
