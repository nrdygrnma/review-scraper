import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { Review } from './review.entity';

interface ReviewItem {
  name: string;
  ageGroup: string;
  travelType: string;
  travelDate: string;
  travelDuration?: string;
  travelTopic?: string;
  reviewTitle: string;
  reviewBody: string;
  hotelName: string;
  hotelLocation: string;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  private readonly baseUrl =
    'https://www.holidaycheck.de/dhr/bewertungen-dominikanische-republik/37c6c7e2-d224-3175-88c1-e6e115718836';

  async getHtml(url: string): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.get(url);
      return response.data;
    } catch (error) {
      this.logger.error('An error occurred while getting HTML content', error);
      throw new InternalServerErrorException(
        'Failed to retrieve HTML content.',
      );
    }
  }

  async getReviews(): Promise<ReviewItem[]> {
    const browser = await puppeteer.launch({
      headless: 'new',
    });

    const allReviews = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
      while (hasNextPage) {
        const pageUrl =
          currentPage === 1 ? this.baseUrl : `${this.baseUrl}?p=${currentPage}`;

        // Scrape the current page
        const htmlContent = await this.getHtml(pageUrl);
        const newReviews = await this.scrapePageWithCheerio(htmlContent);

        allReviews.push(...newReviews);

        // After scraping, find the 'Next' button and see if it exists
        const $ = cheerio.load(htmlContent);
        hasNextPage =
          $(
            '.pagination .prev-next a.link .next-arrow.icon-right-arrow-line',
          ).closest('a[href]').length > 0;

        if (hasNextPage) currentPage++;
      }

      // Add unique identifier
      allReviews.forEach(async (reviewData) => {
        const uniqueIdentifier =
          await this.constructUniqueIdentifier(reviewData);
        reviewData['uniqueReviewIdentifier'] = uniqueIdentifier;
      });

      //return allReviews;
      return await this.saveReviews(allReviews);
    } catch (error) {
      //await page.screenshot({ path: `error-${currentPage}.png` });
      throw new InternalServerErrorException(
        'An error occurred while scraping reviews.',
        error.message,
      );
    } finally {
      await browser.close();
    }
  }

  // Helper function to scrape the current page using cheerio
  async scrapePageWithCheerio(htmlContent: string): Promise<ReviewItem[]> {
    const $ = cheerio.load(htmlContent);
    const reviews = $('.recent-hotel-review.row')
      .map((_index, element) => {
        const name = $(element).find('.hotelReviewHeader-firstName').text();
        const ageGroup = $(element)
          .find('.ageGroup')
          .text()
          .replace(/[\(\)]/g, '');
        const travelInfo = $(element)
          .find('.css-b1qje2')
          .text()
          .split(' • ')
          .map((s) => s.trim());
        const travelType = travelInfo[0];
        const travelDate = travelInfo[1];
        const travelDuration =
          travelInfo.length > 2 ? travelInfo[2] : undefined;
        const travelTopic = travelInfo.length > 3 ? travelInfo[3] : undefined;
        const reviewTitle = $(element).find('h2').text().trim();
        const reviewBody = $(element).find('.text').text().trim();
        const hotelName = $(element)
          .find('.hotel-name-container > a')
          .first()
          .text()
          .trim();
        const hotelLocation = $(element)
          .find('.hotel-name-container .parents')
          .text()
          .trim();

        return {
          name: name,
          ageGroup: ageGroup,
          travelType: travelType,
          travelDate: travelDate,
          travelDuration: travelDuration,
          travelTopic: travelTopic,
          reviewTitle: reviewTitle,
          reviewBody: reviewBody,
          hotelName: hotelName,
          hotelLocation: hotelLocation,
        };
      })
      .get();
    return reviews;
  }

  constructUniqueIdentifier(reviewData) {
    return `${reviewData.name}-${reviewData.travelType}-${reviewData.travelDate}-${reviewData.travelDuration}-${reviewData.hotelName}`;
  }

  async saveReviews(reviews: Review[]): Promise<any> {
    try {
      return await this.reviewRepository
        .createQueryBuilder()
        .insert()
        .into(Review)
        .values(reviews)
        .orIgnore()
        .execute();
    } catch (error) {
      if (error.code === '23505') {
        // 23505 is the code for unique_violation in PostgreSQL
        // Handle the duplicate key error
        throw new ConflictException(
          'A record with the given unique value already exists.',
        );
      } else {
        throw new InternalServerErrorException('An unexpected error occurred.');
      }
    }
  }
}
