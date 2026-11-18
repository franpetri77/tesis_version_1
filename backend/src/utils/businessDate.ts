// Coupon validity is expressed as a calendar day in the store's timezone,
// independently of the timezone of the Node server.
export function todayInCordoba(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}
