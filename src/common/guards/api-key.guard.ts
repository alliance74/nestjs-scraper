import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly headerName = 'x-api-key';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = this.extractApiKey(request);
    const expectedKey = process.env.API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException('API key not configured');
    }

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    const headerKey = request.header(this.headerName);
    if (headerKey) {
      return headerKey;
    }

    const queryKey = request.query['api_key'];
    if (typeof queryKey === 'string') {
      return queryKey;
    }

    return undefined;
  }
}
