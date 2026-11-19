// TODO: Implement this module.
export const toKobo = (v) => Math.round(Number(v) * 100);
export const fromKobo = (k) => (k / 100).toFixed(2); // string for DECIMAL columns
export const koboToNumber = (k) => k / 100;
export const hasMoreThan2dp = (v) =>
  Math.abs(v * 100 - Math.round(v * 100)) > 1e-6;
