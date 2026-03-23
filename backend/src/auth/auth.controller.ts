import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { AccessTokenGuard } from './access-token.guard'
import { AuthenticatedRequest, ClientMeta } from './auth.types'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LogoutDto } from './dto/logout.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

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

  @UseGuards(AccessTokenGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.authUser?.sub || '')
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto)
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
