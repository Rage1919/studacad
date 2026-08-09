import { REFERRAL_REWARD_CREDITS, ReferralRewardEvent } from "./referrals";

const referralGlobal = globalThis as typeof globalThis & {
  __studacadReferralRewards?: ReferralRewardEvent[];
};

const rewards = referralGlobal.__studacadReferralRewards ?? [];
referralGlobal.__studacadReferralRewards = rewards;

export const listReferralRewards = (referralCode: string) => rewards
  .filter(reward => reward.referralCode === referralCode)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const recordReferralReward = (details: Omit<ReferralRewardEvent, "id" | "amount" | "createdAt">) => {
  const existing = rewards.find(reward => reward.visitorId === details.visitorId);
  if (existing) return { reward: existing, created: false };

  const reward: ReferralRewardEvent = {
    ...details,
    id: `referral-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: REFERRAL_REWARD_CREDITS,
    createdAt: new Date().toISOString()
  };
  rewards.push(reward);
  return { reward, created: true };
};
