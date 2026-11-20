import { feeConfig } from '../config/fees.js';

function payoutFee(netKobo) {
  return feeConfig.payoutTiers.find((t) => netKobo <= t.upToKobo).feeKobo;
}

export function computeFees(netKobo) {
  const gatewayPayoutFee = payoutFee(netKobo);
  const bezpayFee =
    feeConfig.bezpayFlatKobo + Math.ceil((netKobo * feeConfig.bezpayRateBps) / 10000);

  const base = netKobo + gatewayPayoutFee + bezpayFee;

  // Gross-up so that (total - inflowFee) === base. Round UP; never short.
  const total = Math.ceil((base * 10000) / (10000 - feeConfig.inflowRateBps));
  let gatewayInflowFee = total - base;
  if (gatewayInflowFee > feeConfig.inflowCapKobo) gatewayInflowFee = feeConfig.inflowCapKobo;

  return {
    netKobo,
    bezpayFee,
    gatewayPayoutFee,
    gatewayInflowFee,
    totalKobo: base + gatewayInflowFee,
  };
}
