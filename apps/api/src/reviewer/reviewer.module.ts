import { Module } from '@nestjs/common';
import { ReviewerService } from './reviewer.service';
import { ReviewerController } from './reviewer.controller';
import { GithubService } from './github.service';

@Module({
  providers: [ReviewerService, GithubService],
  controllers: [ReviewerController],
  exports: [ReviewerService, GithubService],
})
export class ReviewerModule {}
