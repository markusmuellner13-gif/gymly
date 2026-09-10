import { LOCALE } from "./exercises";

/** Human wording for "when did I last do this", in the viewer's own timezone. */
export function relativeDay(ts: number | null, now = Date.now()) {
  if (!ts) return null;
  const days = Math.floor((startOfDay(now) - startOfDay(ts)) / 864e5);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Late one";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
