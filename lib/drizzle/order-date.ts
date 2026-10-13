// Use Bangladesh's calendar date regardless of the browser/server timezone.
export function currentOrderDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Postgres stores YYYY-MM-DD; the page displays DD/MM/YY.
export function formatOrderDate(date: string | null): string {
  if (!date) return "Not recorded";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}
