import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { Request } from 'express';

import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService, type AuthUser, type NonceResponse, type VerifyResponse } from './auth.service';
import { NonceRequestDto } from './dto/nonce-request.dto';
import { VerifySignatureDto } from './dto/verify-signature.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a SIWE nonce for wallet signing' })
  @ApiResponse({ status: 200, description: 'Nonce generated' })
  async getNonce(
    @Body(ZodValidationPipe) dto: NonceRequestDto,
  ): Promise<NonceResponse> {
    return this.authService.generateNonce(dto.address, dto.chainId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify SIWE signature and issue JWT' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid signature or nonce' })
  async verify(
    @Body(ZodValidationPipe) dto: VerifySignatureDto,
    @Req() req: Request,
  ): Promise<VerifyResponse> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.verifySignature(dto.message, dto.signature, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current session' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.logout(user.sessionId);
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated session' })
  @ApiResponse({ status: 200, description: 'Active session data' })
  @ApiResponse({ status: 401, description: 'No active session' })
  async getSession(@CurrentUser() user: JwtPayload): Promise<AuthUser | null> {
    return this.authService.getSession(user.sessionId);
  }
}
