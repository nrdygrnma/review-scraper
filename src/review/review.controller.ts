import { Controller, Get } from '@nestjs/common';
import { ReviewService } from './review.service';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('new')
  getNewReviewsFromHC(): any {
    return this.reviewService.getReviews();
  }
}
