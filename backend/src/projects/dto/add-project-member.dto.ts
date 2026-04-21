import { IsString, Length } from 'class-validator'

export class AddProjectMemberDto {
  @IsString()
  @Length(2, 24)
  username!: string
}
