import { IsDefined, IsInt, IsObject, Min } from 'class-validator'

export class PutProjectCanvasDto {
  @IsDefined()
  @IsObject()
  snapshot!: Record<string, unknown>

  @IsInt()
  @Min(1)
  snapshotSchemaVersion!: number

  @IsInt()
  @Min(0)
  baseRevision!: number
}
