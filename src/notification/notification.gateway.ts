import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NOTIFICATION_CHANNEL, redisSub } from 'src/config/redis.config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(NotificationGateway.name);
  
  @WebSocketServer()
  server: Server;
  
  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (userId) client.join(userId);
  }

  extractUserId(client: Socket): string | null {
    try {
      // Prefer auth token param if provided
      let token: string | undefined = client.handshake.auth?.token;

      // Fallback: parse cookies for httpOnly access token
      if (!token) {
        const cookieHeader = client.handshake.headers?.cookie || '';
        const match = cookieHeader
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('accessToken='));
        if (match) {
          token = decodeURIComponent(match.split('=')[1] || '');
        }
      }

      if (!token) return null;

      // Verify token signature; fallback to decode if verify fails softly
      let payload: any | null = null;
      try {
        payload = this.jwtService.verify(token);
      } catch (e) {
        payload = this.jwtService.decode(token) as any;
      }
      if (!payload) return null;

      const sub = payload['sub'] || payload['userId'] || payload['uid'];
      return typeof sub === 'string' ? sub : null;
    } catch (e) {
      return null;
    }
  }

  async afterInit() {
    this.logger.log('WebSocket Server initialized and ready');
    this.logger.log('Subscribing to Redis PubSub channel');

    redisSub.subscribe(NOTIFICATION_CHANNEL, (err) => {
      if (err) {
        this.logger.error(`Redis subscription error: ${err.message}`, err.stack);
      }
    });

    redisSub.on('message', (channel, message) => {
      if (channel === NOTIFICATION_CHANNEL) {
        try {
          const data = JSON.parse(message);
          this.logger.debug(`Broadcasting notification to user: ${data.userId}`);
          this.server.to(data.userId).emit('notification', data);
        } catch (error) {
          this.logger.error(`Failed to parse notification message: ${error.message}`);
        }
      }
    });
  }
}
