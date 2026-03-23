import { IsOptional, IsString, Length, MaxLength } from 'class-validator'

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  brief?: string
}
