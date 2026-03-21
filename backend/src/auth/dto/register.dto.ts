import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  username!: string

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string
}
