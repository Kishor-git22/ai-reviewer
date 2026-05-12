import { IsString, IsNotEmpty } from 'class-validator'

export class GitHubSyncDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string
}
