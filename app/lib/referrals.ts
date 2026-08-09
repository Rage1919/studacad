export const REFERRAL_REWARD_CREDITS = 50;

export type ReferralRewardEvent = {
  id: string;
  referralCode: string;
  visitorId: string;
  trialBookingId: string;
  tutorId: string;
  tutorName: string;
  amount: number;
  createdAt: string;
};

