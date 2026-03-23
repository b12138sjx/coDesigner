import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AccessTokenPayload, AuthenticatedRequest } from './auth.types'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = req.headers.authorization

    if (!header) {
      throw new UnauthorizedException('未提供访问令牌')
    }

    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('访问令牌格式无效')
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
      })

      if (!payload?.sub || payload.type !== 'access') {
        throw new UnauthorizedException('访问令牌格式无效')
      }

      req.authUser = payload
      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('访问令牌无效或已过期')
    }
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key)
    if (!value) {
      throw new InternalServerErrorException(`缺少环境变量: ${key}`)
    }
    return value
  }
}
