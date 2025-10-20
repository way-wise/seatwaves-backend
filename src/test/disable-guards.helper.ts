/**
 * Helper to disable guards in unit tests
 * Guards should be tested separately, not in controller unit tests
 */

import { ExecutionContext } from '@nestjs/common';

/**
 * Mock guard that always returns true (allows access)
 * Use this to override guards in unit tests
 */
export const mockGuardTrue = {
  canActivate: jest.fn((context: ExecutionContext) => true),
};

/**
 * Mock guard that always returns false (denies access)
 */
export const mockGuardFalse = {
  canActivate: jest.fn((context: ExecutionContext) => false),
};

/**
 * Helper to override guards in test module
 * 
 * Usage:
 * ```typescript
 * import { overrideGuards } from '../test/disable-guards.helper';
 * 
 * const module = await Test.createTestingModule({
 *   controllers: [MyController],
 * })
 * .overrideGuard(AuthGuard('jwt')).useValue(mockGuardTrue)
 * .overrideGuard(PermissionsGuard).useValue(mockGuardTrue)
 * .compile();
 * ```
 */
