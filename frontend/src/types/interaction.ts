export interface ContentReview {
  reviewId: string;
  userId: string;
  contentId: string;
  stars: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LearningActivity {
  id: string;
  userId: string;
  activityType: string;
  details: string;
  recordedAt: string;
}
