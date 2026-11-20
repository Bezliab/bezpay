import { env } from './env.js';

const ngn = (n) => Math.round(n * 100);

export const feeConfig = {
  inflowRateBps: env.INFLOW_FEE_BPS,
  inflowCapKobo: ngn(env.INFLOW_FEE_CAP_NGN),
  bezpayFlatKobo: ngn(env.BEZPAY_FEE_FLAT_NGN),
  bezpayRateBps: env.BEZPAY_FEE_BPS,
  // Monnify disbursement fee tiers (verify against your pricing)
  payoutTiers: [
    { upToKobo: ngn(5000), feeKobo: ngn(10) },
    { upToKobo: ngn(50000), feeKobo: ngn(25) },
    { upToKobo: Infinity, feeKobo: ngn(50) },
  ],
  minKobo: ngn(env.MIN_AMOUNT_NGN),
  maxKobo: ngn(env.MAX_AMOUNT_NGN),
  expiryMinutes: env.TX_EXPIRY_MINUTES,
};
