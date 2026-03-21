import { Body, Controller, Post, Req } from '@nestjs/common'
import { Request } from 'express'
import { AuthService, ClientMeta } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.toClientMeta(req))
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.toClientMeta(req))
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto, this.toClientMeta(req))
  }

  private toClientMeta(req: Request): ClientMeta {
    const forwarded = req.headers['x-forwarded-for']
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim()

    return {
      userAgent: req.headers['user-agent'] || null,
      ipAddress: forwardedIp || req.ip || req.socket.remoteAddress || null,
    }
  }
}
