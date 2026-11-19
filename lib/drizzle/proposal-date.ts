// Use Bangladesh's calendar date regardless of the browser/server timezone.
export function currentProposalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Accept only real calendar dates in Postgres's YYYY-MM-DD format.
export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Postgres stores YYYY-MM-DD; the page displays DD/MM/YY.
export function formatProposalDate(date: string | null): string {
  if (!date) return "Not recorded";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

// Use a fixed timezone so the server and browser display the same edit timestamp.
export function formatProposalEditDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}
