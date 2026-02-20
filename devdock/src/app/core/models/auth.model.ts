export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionState {
  readonly tier: SubscriptionTier;
  readonly validUntil: number | null;
  readonly checkedAt: number;
}
