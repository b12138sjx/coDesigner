import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

const PROJECT_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export class ImportLocalCanvasDto {
  @IsDefined()
  @IsObject()
  snapshot!: Record<string, unknown>

  @IsInt()
  @Min(1)
  snapshotSchemaVersion!: number

  @IsOptional()
  @IsISO8601()
  updatedAt?: string
}

export class ImportLocalProjectItemDto {
  @IsString()
  @Length(1, 64)
  @Matches(PROJECT_KEY_PATTERN)
  id!: string

  @IsString()
  @Length(1, 120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  brief?: string

  @IsOptional()
  @IsISO8601()
  updatedAt?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportLocalCanvasDto)
  canvas?: ImportLocalCanvasDto
}

export class ImportLocalProjectsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportLocalProjectItemDto)
  projects!: ImportLocalProjectItemDto[]
}
