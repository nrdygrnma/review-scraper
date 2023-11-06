import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('review')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  uniqueReviewIdentifier: string;

  @Column()
  name: string;

  @Column()
  ageGroup: string;

  @Column()
  travelType: string;

  @Column()
  travelDate: string;

  @Column({ nullable: true })
  travelDuration?: string;

  @Column({ nullable: true })
  travelTopic?: string;

  @Column()
  reviewTitle: string;

  @Column({ type: 'text' })
  reviewBody: string;

  @Column()
  hotelName: string;

  @Column()
  hotelLocation: string;
}
