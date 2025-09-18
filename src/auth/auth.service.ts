import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserLoginDto } from './dto/login.user.dto';
import { ChangePasswordDto } from './dto/password.user.dto';
import { CreateUserDto } from './dto/register.user.dto';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from 'src/email/email.service';
import { OtpType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async signUp(dto: CreateUserDto) {
    // Check if user exists first
    const existUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const hashPassword = await bcrypt.hash(dto.password, 12);

    // Find default USER role (initial role)
    const role = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!role) {
      throw new UnauthorizedException('Role not found');
    }

    // Use transaction for user creation and OTP operations
    const result = await this.prisma.$transaction(async (tx) => {
      const createUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          password: hashPassword,
          accounts: {
            create: {
              provider: 'credentials',
              type: 'credentials',
            },
          },
          roles: {
            create: {
              roleId: role.id,
            },
          },
          notificationSettings: {
            create: {
              newBooking: true,
            },
          },
        },
      });

      if (!createUser) {
        throw new UnauthorizedException('User not created');
      }

      // Clear existing OTPs for this user
      await tx.userOtp.deleteMany({
        where: { email: createUser.email },
      });

      // Generate OTP
      const otp = this.generateMixedOTP(6);

      // Save OTP
      const otpData = await tx.userOtp.create({
        data: {
          email: createUser.email,
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        },
      });

      if (!otpData) throw new UnauthorizedException('Failed to generate OTP');

      // Return user and OTP to send email outside transaction
      return { createUser, otp };
    });

    // Send OTP email outside transaction (avoid slowing down DB ops)
    await this.emailService.sendOTPEmail({
      to: result.createUser.email,
      subject: 'Verification OTP',
      text: `Your OTP for verification is ${result.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
      html: `Your OTP for verification is <b>${result.otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    });

    return {
      status: true,
      message:
        'User Registered Successfully. Please verify your email with the OTP sent.',
    };
  }

  async resendOtp(email: string, type: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Optional: block checks similar to forgotPassword
    if (user.status === 'BLOCKED') {
      if (user.blockedUntil && user.blockedUntil > new Date()) {
        const remainingMs = user.blockedUntil.getTime() - new Date().getTime();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new UnauthorizedException(
          `This Account is blocked. Try again in ${remainingMin} minutes.`,
        );
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE', blockedUntil: null },
        });
      }
    }

    // Remove previous OTPs of same type
    await this.prisma.userOtp.deleteMany({
      where: { email: user.email },
    });

    // Generate and save new OTP
    const otp = this.generateMixedOTP(6);
    const otpData = await this.prisma.userOtp.create({
      data: {
        email: user.email,
        otp,
        type: type as OtpType,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      },
    });

    if (!otpData) throw new UnauthorizedException('Failed to generate OTP');

    // Notify user
    const subjectMap = {
      VERIFY_EMAIL: 'Verification OTP',
      TWO_FACTOR: 'Two Factor OTP',
      RESET_PASSWORD: 'Password Reset OTP',
    } as const;
    const subject = subjectMap[type] || 'Your OTP';

    await this.emailService.sendOTPEmail({
      to: user.email,
      subject,
      text: `Your OTP is ${otpData.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
      html: `Your OTP is <b>${otpData.otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    });

    return { status: true, message: 'OTP sent successfully' };
  }

  async signIn(dto: UserLoginDto, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Email not registered');
    }

    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'credentials',
      },
    });

    if (!account || !user.password) {
      await this.logLoginAttempt(user.id, req, 'FAILED');
      throw new UnauthorizedException('Invalid login method');
    }

    // Check if blocked and unblock if time expired
    if (user.status === 'BLOCKED') {
      if (user.blockedUntil && user.blockedUntil > new Date()) {
        const remainingMs = user.blockedUntil.getTime() - new Date().getTime();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new UnauthorizedException(
          `This Account is blocked. Try again in ${remainingMin} minutes.`,
        );
      } else {
        // Time passed, unblock
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE', blockedUntil: null },
        });
      }
    }
    // Password match check
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.logLoginAttempt(user.id, req, 'FAILED');
      await this.checkLoginAttempts(user.id); // automatic blocking if 3 failed
      throw new UnauthorizedException('Invalid password');
    }

    if (!user.isEmailVerified) {
      //send verification email
      // Generate OTP

      // Clear existing OTPs for this user
      await this.prisma.userOtp.deleteMany({
        where: { email: user.email },
      });

      const otp = this.generateMixedOTP(6);

      // Save OTP
      const otpData = await this.prisma.userOtp.create({
        data: {
          email: user.email,
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        },
      });

      await this.emailService.sendOTPEmail({
        to: user.email,
        subject: 'Verification OTP',
        text: `Your OTP for verification is ${otpData.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
        html: `Your OTP for verification is <b>${otpData.otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
      });
    }

    if (user.isTwoFactorEnabled) {
      //send 2fa email
      await this.prisma.userOtp.deleteMany({
        where: { email: user.email, type: 'TWO_FACTOR' },
      });

      const otp = this.generateMixedOTP(6);

      // Save OTP
      const otpData = await this.prisma.userOtp.create({
        data: {
          email: user.email,
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
          type: 'TWO_FACTOR',
        },
      });

      await this.emailService.sendOTPEmail({
        to: user.email,
        subject: 'Two Factor OTP',
        text: `Your OTP for verification is ${otpData.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
        html: `Your OTP for verification is <b>${otpData.otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
      });
    }

    // Success
    await this.logLoginAttempt(user.id, req, 'SUCCESS');
    const accessToken = await this.generateTokens(user.id, user.status);
    const refreshToken = await this.generateRefreshToken(user.id, user.status);
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    //   sameSite: 'none',
    // });
    // res.cookie('accessToken', accessToken, {
    //   httpOnly: true,
    //   secure: true,
    //   maxAge: 24 * 60 * 60 * 1000,
    //   sameSite: 'none',
    // });
    return {
      status: true,
      message: 'Login Successfull',
      accessToken,
      refreshToken,
    };
  }
  async signInWeb(dto: UserLoginDto, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        sellerVerification: true,
        password: true,
        blockedUntil: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Email not registered');
    }

    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'credentials',
      },
    });

    if (!account || !user.password) {
      await this.logLoginAttempt(user.id, req, 'FAILED');
      throw new UnauthorizedException('Invalid login method');
    }

    // Check if blocked and unblock if time expired
    if (user.status === 'BLOCKED') {
      if (user.blockedUntil && user.blockedUntil > new Date()) {
        const remainingMs = user.blockedUntil.getTime() - new Date().getTime();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new UnauthorizedException(
          `This Account is blocked. Try again in ${remainingMin} minutes.`,
        );
      } else {
        // Time passed, unblock
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            status: 'ACTIVE',
            blockedUntil: null,
          },
        });
      }
    }
    // Password match check
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.logLoginAttempt(user.id, req, 'FAILED');
      await this.checkLoginAttempts(user.id); // automatic blocking if 3 failed
      throw new UnauthorizedException('Invalid password');
    }

    // if (!user.isEmailVerified) {
    //   //send verification email
    //   // Generate OTP

    //   // Clear existing OTPs for this user
    //   await this.prisma.userOtp.deleteMany({
    //     where: { email: user.email },
    //   });

    //   const otp = this.generateMixedOTP(6);

    //   // Save OTP
    //   const otpData = await this.prisma.userOtp.create({
    //     data: {
    //       email: user.email,
    //       otp,
    //       expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    //     },
    //   });

    //   await this.emailService.sendOTPEmail({
    //     to: user.email,
    //     subject: 'Verification OTP',
    //     text: `Your OTP for verification is ${otpData.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    //     html: `Your OTP for verification is <b>${otpData.otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    //   });

    //   // create token userId email and otptype
    //   const token = await this.generateOtpToken(
    //     user.status,
    //     user.email,
    //     'VERIFY_EMAIL',
    //   );

    //   // Avoid server-side redirect to prevent CORS issues; let client navigate
    //   return {
    //     status: true,
    //     message: 'Email verification required. OTP sent to your email.',
    //     redirectUrl: `${process.env.APP_CLIENT_URL}/verify-email?token=${encodeURIComponent(
    //       token,
    //     )}&email=${encodeURIComponent(user.email)}`,
    //   };
    // }

    // if (user.isTwoFactorEnabled) {
    //   //send 2fa email
    //   await this.prisma.userOtp.deleteMany({
    //     where: { email: user.email, type: 'TWO_FACTOR' },
    //   });

    //   const otp = this.generateMixedOTP(6);

    //   // Save OTP
    //   const otpData = await this.prisma.userOtp.create({
    //     data: {
    //       email: user.email,
    //       otp,
    //       expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    //       type: 'TWO_FACTOR',
    //     },
    //   });

    //   await this.emailService.sendOTPEmail({
    //     to: user.email,
    //     subject: 'Two Factor OTP',
    //     text: `Your OTP for verification is ${otpData.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    //     html: `Your OTP for verification is <b>${otpData.otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    //   });

    //   const token = await this.generateOtpToken(
    //     user.status,
    //     user.email,
    //     'TWO_FACTOR',
    //   );

    //   // Avoid server-side redirect; return JSON instruction for client navigation
    //   return {
    //     status: true,
    //     message: 'Two-factor authentication required. OTP sent to your email.',
    //     redirectUrl: `${process.env.APP_CLIENT_URL}/verify-otp?token=${encodeURIComponent(
    //       token,
    //     )}&email=${encodeURIComponent(user.email)}`,
    //   };
    // }

    // Success
    await this.logLoginAttempt(user.id, req, 'SUCCESS');
    const accessToken = await this.generateTokens(user.id, user.status);
    const refreshToken = await this.generateRefreshToken(user.id, user.status);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? 'waywisetech.com' : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? 'waywisetech.com' : 'localhost',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    // const ADMIN = user.roles.find((role) => role.role.name === 'ADMIN');
    // const SELLER = user.roles.find((role) => role.role.name === 'SELLER');

    // const redirect = ADMIN
    //   ? '/admin/dashboard'
    //   : SELLER && user.isEmailVerified === true
    //     ? '/seller/dashboard'
    //     : '/users/profile';

    return {
      status: true,
      message: 'Login Successfull',
      redirect: '/',
    };
  }

  async socialLogin(
    googleUser: any,
    provider: 'GOOGLE' | 'FACEBOOK' | 'APPLE',
    res: Response,
    req: Request,
  ) {
    const { email, name, picture, sub, id } = googleUser;
    const providerAccountId = sub || id;

    const existingAccount = await this.prisma.account.findFirst({
      where: { provider, providerAccountId },
      include: { user: true },
    });

    let user = existingAccount?.user;

    if (!user) {
      const role = await this.prisma.role.findUnique({
        where: { name: 'USER' },
      });

      if (!role) {
        throw new UnauthorizedException('Role not found');
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar: picture,
          isEmailVerified: true,
          accounts: {
            create: {
              provider,
              providerAccountId,
              type: 'oauth',
            },
          },
          roles: {
            create: {
              roleId: role.id,
            },
          },
        },
      });
    }

    const accessToken = await this.generateTokens(user.id, user.status);

    const refreshToken = await this.generateRefreshToken(user.id, user.status);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? 'waywisetech.com' : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? 'waywisetech.com' : 'localhost',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    await this.logLoginAttempt(user.id, req, 'SUCCESS');

    return {
      status: true,
      accessToken,
      refreshToken,
      message: 'Login Successfull',
    };
  }

  async me(userId: string) {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
        isEmailVerified: true,
        isSellerVerified: true,
        stripeOnboardingComplete: true,
        isTwoFactorEnabled: true,

        roles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!found) {
      throw new NotFoundException('This user does not exist');
    }

    const formatData = {
      ...found,
      roles: [...new Set(found.roles.map((r) => r.role.name))],
      permissions: [
        ...new Set(
          found.roles.flatMap((r) =>
            r.role.rolePermissions.flatMap((rp) => rp.permissions.name),
          ),
        ),
      ],
    };

    return {
      status: true,
      data: formatData,
    };
  }

  async refreshTokens(userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { userId: userId },
      include: {
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!account) {
      throw new UnauthorizedException();
    }

    if (account.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active');
    }

    let refreshToken = account.refreshToken;

    if (!refreshToken) {
      const newToken = await this.generateRefreshToken(
        account.user.id,
        account.user.status,
      );

      await this.prisma.account.update({
        where: { id: account.id },
        data: { refreshToken: newToken },
      });
      refreshToken = newToken;
    }

    const accessToken = await this.generateTokens(account.user.id, 'ACTIVE');

    return {
      status: true,
      accessToken,
      refreshToken,
      message: 'Token refreshed successfully',
    };
  }

  async logout(userId: string, res: Response) {
    // Clear cookies with matching attributes used when setting them
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? 'waywisetech.com' : 'localhost';
    const commonOpts = {
      httpOnly: true as const,
      secure: true as const,
      sameSite: 'lax' as const,
      domain: cookieDomain,
      path: '/',
    };

    // Primary: clearCookie with matching options
    res.clearCookie('refreshToken', commonOpts);
    res.clearCookie('accessToken', commonOpts);

    // Fallback for some browsers/CDNs: overwrite with immediate expiry
    res.cookie('refreshToken', '', { ...commonOpts, maxAge: 0 });
    res.cookie('accessToken', '', { ...commonOpts, maxAge: 0 });

    await this.prisma.account.updateMany({
      where: { userId: userId },
      data: { refreshToken: null },
    });
    return { status: true, message: 'Logged out successfully' };
  }

  async changePassword(data: ChangePasswordDto, userId: string, req: Request) {
    const { oldPassword, newPassword } = data;

    const found = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!found || found.status !== 'ACTIVE' || !found.password) {
      throw new UnauthorizedException('User is not valid or has no password');
    }

    const isMatch = await bcrypt.compare(oldPassword, found.password);
    if (!isMatch) {
      throw new UnauthorizedException('Old password does not match');
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        loginHistory: {
          create: {
            attempt: 'RESET_PASSWORD',
            ip: req.ip || '0.0.0.0',
            userAgent: req.headers['user-agent'] || '',
            country: (req.headers['cf-ipcountry'] as string) || '',
          },
        },
      },
    });

    const token = await this.jwtService.sign({ userId: found.id });
    return { status: true, token, message: 'Password changed successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if blocked and unblock if time expired
    if (user.status === 'BLOCKED') {
      if (user.blockedUntil && user.blockedUntil > new Date()) {
        const remainingMs = user.blockedUntil.getTime() - new Date().getTime();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new UnauthorizedException(
          `This Account is blocked. Try again in ${remainingMin} minutes.`,
        );
      } else {
        // Time passed, unblock
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            status: 'ACTIVE',
            blockedUntil: null,
          },
        });
      }
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active');
    }

    const account = await this.prisma.account.findFirst({
      where: { userId: user.id, provider: 'credentials' },
    });

    if (!account) {
      throw new UnauthorizedException(
        'No credential found, please try signing in with Google or Apple',
      );
    }

    // TODO: Send this token via email securely

    const otp = this.generateMixedOTP(6);

    await this.prisma.userOtp.deleteMany({ where: { email: user.email } });
    //Generate OTP and save in DB for verification
    const otpData = await this.prisma.userOtp.create({
      data: {
        email: user.email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    if (!otpData) throw new UnauthorizedException('Failed to generate OTP');

    // TODO: Send this token via email securely
    this.emailService.sendEmailToUser(user.id, {
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is ${otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
      html: `Your OTP for password reset is <b>${otp}</b>. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
    });

    return {
      status: true,
      message: 'Password reset OTP sent to your email.',
    };
  }

  async verifyEmail(otp: string, res: Response) {
    return await this.prisma.$transaction(async (tx) => {
      // Find OTP and validate
      const otpData = await tx.userOtp.findFirst({
        where: { otp, expiresAt: { gt: new Date() } },
      });

      if (!otpData) {
        throw new UnauthorizedException('Invalid OTP');
      }

      // Update user status and email verification in one atomic operation
      const user = await tx.user.update({
        where: { email: otpData.email },
        data: { status: 'ACTIVE', isEmailVerified: true },
      });

      // Delete all OTPs for this email
      await tx.userOtp.deleteMany({
        where: { email: otpData.email },
      });

      // Generate token after transaction commits successfully
      const accessToken = await this.generateTokens(user.id, user.status);
      const refreshToken = await this.generateRefreshToken(
        user.id,
        user.status,
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        domain:
          process.env.NODE_ENV === 'production'
            ? 'waywisetech.com'
            : 'localhost',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
      });
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true,
        domain:
          process.env.NODE_ENV === 'production'
            ? 'waywisetech.com'
            : 'localhost',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      return {
        status: true,
        accessToken,
        message: 'Email verified successfully',
      };
    });
  }

  async verifyOtp(otp: string) {
    if (!otp) {
      throw new UnauthorizedException('OTP is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Find the OTP entry which is still valid
      const otpRecord = await tx.userOtp.findFirst({
        where: {
          otp,
          expiresAt: { gt: new Date() },
        },
        select: {
          email: true,
        },
      });

      if (!otpRecord) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Find user by email from OTP record
      const user = await tx.user.findUnique({
        where: { email: otpRecord.email },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('This account is not active');
      }

      // Delete all OTPs for this email after successful verification
      await tx.userOtp.deleteMany({ where: { email: otpRecord.email } });

      // Generate JWT token (adjust expiry as needed)
      const token = await this.jwtService.signAsync(
        { email: user.email, userId: user.id },
        { expiresIn: '10m' },
      );

      return {
        status: true,
        token,
        message: 'OTP verified successfully',
      };
    });
  }

  async verify2fa(otp: string, res: Response, req: Request) {
    if (!otp) {
      throw new UnauthorizedException('OTP is required');
    }

    // Find the OTP entry which is still valid
    const otpRecord = await this.prisma.userOtp.findFirst({
      where: {
        otp,
        expiresAt: { gt: new Date() },
      },
      select: {
        email: true,
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Find user by email from OTP record
    const user = await this.prisma.user.findUnique({
      where: { email: otpRecord.email },
      select: {
        id: true,
        status: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active');
    }

    // Delete all OTPs for this email after successful verification
    await this.prisma.userOtp.deleteMany({ where: { email: otpRecord.email } });

    //accessToken
    const accessToken = await this.generateTokens(user.id, user.status);

    //refreshToken
    const refreshToken = await this.generateRefreshToken(user.id, user.status);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? 'waywisetech.com' : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? 'waywisetech.com' : 'localhost',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    await this.logLoginAttempt(user.id, req, 'SUCCESS');

    const redirect = user.roles.includes({ role: { name: 'ADMIN' } })
      ? '/admin'
      : '/';

    return {
      status: true,
      redirect: `${process.env.APP_CLIENT_URL}${redirect}`,
      message: '2FA verified successfully',
    };
  }

  async resetPassword(token: string, newPassword: string, req: Request) {
    let decodedToken: any;

    try {
      decodedToken = this.jwtService.verify(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Reset token has expired. Please request a new one.',
        );
      }
      throw new UnauthorizedException('Invalid reset token.');
    }

    if (!decodedToken.userId) {
      throw new UnauthorizedException('Invalid Reset Token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decodedToken.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid user');
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    // Check Old Password and New Password same
    if (user.password === hashed) {
      throw new UnauthorizedException(
        'New password cannot be same as old password',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        loginHistory: {
          create: {
            attempt: 'RESET_PASSWORD',
            ip: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            country: (req.headers['cf-ipcountry'] as string) || '',
          },
        },
      },
    });

    return {
      status: true,
      message: 'Password reset successfully. Now you can login',
    };
  }

  private async generateTokens(userId: string, status: string) {
    const payload = { userId, status };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });

    return accessToken;
  }

  private async generateOtpToken(status: string, email: string, type: string) {
    const payload = { status, email, type };

    const token = this.jwtService.sign(payload, { expiresIn: '10m' });

    return token;
  }

  private async generateRefreshToken(userId: string, status: string) {
    const refreshToken = this.jwtService.sign(
      { userId, status },
      { expiresIn: '7d' },
    );
    await this.prisma.account.updateMany({
      where: { userId },
      data: { refreshToken: refreshToken },
    });
    return refreshToken;
  }

  private async logLoginAttempt(
    userId: string,
    req: Request,
    attempt: 'SUCCESS' | 'FAILED',
  ) {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        attempt,
        ip: req.ip || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
        country: (req.headers['cf-ipcountry'] as string) || 'unknown',
      },
    });
  }

  //Check Last 3 attempts and block
  private async checkLoginAttempts(userId: string) {
    const attempts = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const failedAttempts = attempts.filter(
      (attempt) => attempt.attempt === 'FAILED',
    );

    if (failedAttempts.length >= 3) {
      const blockUntil = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'BLOCKED',
          blockedUntil: blockUntil,
        },
      });

      throw new UnauthorizedException(
        'Too many failed login attempts. Account is blocked for 15 minutes.',
      );
    }
  }

  async verifyGoogleToken(idToken: string) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID, // Must match the one used in Android
    });

    const payload = ticket.getPayload();
    return {
      email: payload?.email as string,
      name: payload?.name,
      picture: payload?.picture,
      sub: payload?.sub,
    };
  }

  private generateMixedOTP(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  }
}
