import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/zodValidationPipe';
import { AuthService } from './auth.service';

import { APP_CLIENT_URL } from 'src/lib/configEnv';
import {
  ForgetPasswordDto,
  ForgetPasswordSchema,
} from './dto/forget.password.dto';
import { UserLoginDto, UserLoginSchema } from './dto/login.user.dto';
import {
  ChangePasswordDto,
  ChangePasswordSchema,
} from './dto/password.user.dto';
import { CreateUserDto, CreateUserSchema } from './dto/register.user.dto';
import { ResetPasswordDto, ResetPasswordSchema } from './dto/rest.password.dto';
import { VerifyOtpDto, verifyOtpSchema } from './dto/verifyotp.dto';
import { ResendOtpDto, resendOtpSchema } from './dto/resendotp.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ZodValidationPipe(UserLoginSchema))
  login(
    @Body() dto: UserLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signIn(dto, req, res);
  }
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  @UsePipes(new ZodValidationPipe(UserLoginSchema))
  signIn(
    @Body() dto: UserLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signInWeb(dto, req, res);
  }

  @Post('register')
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  register(@Body() dto: CreateUserDto) {
    return this.authService.signUp(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.authService.me(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  @UseGuards(AuthGuard('jwt'))
  refresh(@Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.authService.refreshTokens(req.user.userId);
  }

  //Change Password
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  changePassword(@Body() dto: ChangePasswordDto, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.authService.changePassword(dto, req.user.userId, req);
  }

  //Forget Password
  @HttpCode(HttpStatus.OK)
  @Post('/forgot-password')
  @UsePipes(new ZodValidationPipe(ForgetPasswordSchema))
  forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  //verify-otp
  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  @UsePipes(new ZodValidationPipe(verifyOtpSchema))
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.otp);
  }

  //verify 2 factor
  @HttpCode(HttpStatus.OK)
  @Post('verify-2fa')
  verify2fa(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.verify2fa(dto.otp, res, req);
  }

  //resend-otp
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resendOtpSchema))
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email, dto.type);
  }

  //verify-email and reset-password
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @UsePipes(new ZodValidationPipe(verifyOtpSchema))
  verifyEmail(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyEmail(dto.otp, res);
  }

  //reset-password
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto.token, dto.password, req);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.authService.logout(req.user.userId, res);
  }
  // auth.controller.ts

  @Post('/google/verify')
  async verifyGoogle(
    @Body('idToken') idToken: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const userInfo = await this.authService.verifyGoogleToken(idToken);
    if (!userInfo) throw new UnauthorizedException('User not found');
    const accessToken = await this.authService.socialLogin(
      userInfo, // Map this to your user structure
      'GOOGLE',
      res,
      req,
    );

    return res.json({ token: accessToken });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    const accessToken = await this.authService.socialLogin(
      req.user,
      'GOOGLE',
      res,
      req,
    );
    res.redirect(`${APP_CLIENT_URL}/oauth-callback?token=${accessToken}`);
    return accessToken;
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookRedirect(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    const accessToken = await this.authService.socialLogin(
      req.user,
      'FACEBOOK',
      res,
      req,
    );
  }
}
