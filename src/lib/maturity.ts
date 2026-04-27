export interface MaturityResult {
  maturityAmount: number;
  interestEarned: number;
  maturityDate: Date;
  effectiveYield: string;
}

export function calculateMaturity(params: {
  principal: number;
  ratePercent: number;
  tenorMonths: number;
  compounding: "quarterly" | "monthly" | "annual";
}): MaturityResult {
  const { principal, ratePercent, tenorMonths, compounding } = params;
  const r = ratePercent / 100;
  const t = tenorMonths / 12;
  const n =
    compounding === "quarterly" ? 4 : compounding === "monthly" ? 12 : 1;

  // Simple interest for < 1 year, compound for 1y+
  const maturityAmount =
    tenorMonths < 12
      ? principal * (1 + r * t)
      : principal * Math.pow(1 + r / n, n * t);

  return {
    maturityAmount: Math.round(maturityAmount),
    interestEarned: Math.round(maturityAmount - principal),
    maturityDate: new Date(Date.now() + tenorMonths * 30.44 * 86400000),
    effectiveYield: (((maturityAmount / principal - 1) / t) * 100).toFixed(2),
  };
}
