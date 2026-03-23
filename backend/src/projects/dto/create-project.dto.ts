import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'

const PROJECT_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export class CreateProjectDto {
  @IsString()
  @Length(1, 120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  brief?: string

  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(PROJECT_KEY_PATTERN)
  projectKey?: string
}
