import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewModule } from './review/review.module';
import * as fs from 'fs';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: '23.88.98.79',
      port: 26257,
      username: 'root',
      password: '',
      database: 'review-scraper',
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: true,

        ca: fs.readFileSync('/media/belinda/Data/certs/ca.crt').toString(),
        cert: fs
          .readFileSync('/media/belinda/Data/certs/client.root.crt')
          .toString(),
        key: fs
          .readFileSync('/media/belinda/Data/certs/client.root.key')
          .toString(),
      },
    }),
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
