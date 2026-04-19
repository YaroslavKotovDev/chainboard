import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RoleName } from '@chainboard/types';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;       // userId
  address: string;   // wallet address
  sessionId: string;
  role: RoleName;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
