export interface MembershipView {
  userId: string;
  planCode: 'FREE' | 'PRO';
  status: string;
  maxPracticePerDay: number; // 10 for FREE, 1000 for PRO
}

export interface PlanFeature {
  title: string;
  included: boolean;
}

export interface PricingPlan {
  code: 'FREE' | 'PRO';
  name: string;
  priceFormatted: string;
  badge?: string;
  description: string;
  features: PlanFeature[];
}
