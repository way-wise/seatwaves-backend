import { Test, TestingModule } from '@nestjs/testing';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { mockPointsService } from '../test/test-utils';

describe('PointsController', () => {
  let controller: PointsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsController],
      providers: [
        {
          provide: PointsService,
          useValue: mockPointsService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<PointsController>(PointsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
