import { Test, TestingModule } from '@nestjs/testing';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockHelpService } from '../test/test-utils';

describe('HelpController', () => {
  let controller: HelpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelpController],
      providers: [
        {
          provide: HelpService,
          useValue: mockHelpService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<HelpController>(HelpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
