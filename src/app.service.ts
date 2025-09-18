import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Server is running!';
  }

  checkHealth(): string {
    return 'Server is running!';
  }
}
