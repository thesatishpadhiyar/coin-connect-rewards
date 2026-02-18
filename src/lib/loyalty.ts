// Loyalty tier helper based on total spend
export interface LoyaltyTier {
  name: string;
  minSpend: number;
  coinMultiplier: number;
  color: string;
  icon: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: "Bronze", minSpend: 0, coinMultiplier: 1, color: "text-amber-700", icon: "🥉" },
  { name: "Silver", minSpend: 10000, coinMultiplier: 1.25, color: "text-slate-400", icon: "🥈" },
  { name: "Gold", minSpend: 50000, coinMultiplier: 1.5, color: "text-yellow-500", icon: "🥇" },
  { name: "Platinum", minSpend: 200000, coinMultiplier: 2, color: "text-purple-400", icon: "💎" },
];

export function getTier(totalSpend: number): LoyaltyTier {
  let tier = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (totalSpend >= t.minSpend) tier = t;
  }
  return tier;
}

export function getNextTier(totalSpend: number): LoyaltyTier | null {
  for (const t of LOYALTY_TIERS) {
    if (totalSpend < t.minSpend) return t;
  }
  return null;
}
