// Formatting helpers shared by server and client. Dates are YYYY-MM-DD strings
// (formatted in UTC so they never shift); instants are shown in IST.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const IST = "Asia/Kolkata";

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** "12 Nov" */
export function formatDay(date: string): string {
  const { m, d } = parts(date);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "18–20 Nov", "30 Nov – 2 Dec", or "12 Nov" for a single day. */
export function formatRange(start: string, end: string): string {
  if (start === end) return formatDay(start);
  const a = parts(start);
  const b = parts(end);
  if (a.m === b.m && a.y === b.y) return `${a.d}–${b.d} ${MONTHS[b.m - 1]}`;
  return `${formatDay(start)} – ${formatDay(end)}`;
}

/** "30 Sep, 11:59 PM" in IST. */
export function formatDeadline(iso: string): string {
  const dt = new Date(iso);
  // Shift to IST and read the UTC fields, so it's "30 Sep" in every locale.
  const ist = new Date(dt.getTime() + 330 * 60000);
  const date = `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}`;
  const time = dt
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST })
    .toUpperCase();
  return `${date}, ${time}`;
}

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const TYPE_LABELS: Record<string, string> = {
  beach: "Beach",
  hills: "Hills",
  city: "City",
  adventure: "Adventure",
};

export const TYPE_EMOJI: Record<string, string> = {
  beach: "🏖️",
  hills: "⛰️",
  city: "🏙️",
  adventure: "🧗",
};

/**
 * One-line suggestion when no dates line up for everyone, e.g.
 * "10–12 Nov works for 4 of 5 (all but Karan), or everyone can do a 2-day trip on 13–14 Nov."
 */
export function suggestionLine(
  s: { best: { start: string; end: string; available: string[]; missing: string[] } | null; shorter: { start: string; end: string; days: number } | null },
  total: number,
): string {
  const parts: string[] = [];
  if (s.best) {
    parts.push(
      `${formatRange(s.best.start, s.best.end)} works for ${s.best.available.length} of ${total} (everyone except ${listNames(s.best.missing)})`,
    );
  }
  if (s.shorter) {
    parts.push(`everyone can make a ${s.shorter.days}-day trip on ${formatRange(s.shorter.start, s.shorter.end)}`);
  }
  if (parts.length === 0) return "No dates overlap yet. Ask everyone to add a few more days they can travel.";
  const line = parts.join(", or ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}
