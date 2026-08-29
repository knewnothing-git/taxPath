export const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Prototype-only estimate. This does not decide eligibility or final tax.
 */
export function estimatedNpsImpact(contribution: number, marginalRate = 0.2) {
  const eligibleAmount = Math.min(Math.max(contribution, 0), 50_000);
  return Math.round(eligibleAmount * marginalRate * 1.04);
}

export function tdsDifference(form16Tds: number, aisTds: number) {
  return Math.abs(form16Tds - aisTds);
}
