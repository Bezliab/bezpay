// Monnify expects "YYYY-MM-DD HH:mm:ss" (Nigeria time)
export const toMonnifyDate = (d) =>
  d.toLocaleString("sv-SE", { timeZone: "Africa/Lagos" });
