import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    if (
      !process.env.APPLE_CLIENT_ID ||
      !process.env.APPLE_TEAM_ID ||
      !process.env.APPLE_KEY_ID ||
      !process.env.APPLE_PRIVATE_KEY
    )
      throw new Error(
        'APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY environment variables must be set',
      );
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      callbackURL: 'http://localhost:8000/auth/apple/callback',
      scope: ['email', 'name'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: Function,
  ): Promise<any> {
    const user = {
      id: idToken.sub,
      email: idToken.email,
      name: `${idToken.firstName ?? ''} ${idToken.lastName ?? ''}`.trim(),
      provider: 'apple',
    };

    done(null, user);
  }
}
