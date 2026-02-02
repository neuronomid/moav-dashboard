import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SERVER_ONLINE_THRESHOLD_MS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns true if the server heartbeat is recent enough to be considered online */
export function isServerOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < SERVER_ONLINE_THRESHOLD_MS;
}

/** Human-readable "X seconds/minutes ago" */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Strip potential secrets from log lines */
export function redactSecrets(line: string): string {
  return line.replace(
    /(key|token|password|secret|credential)[\s]*[:=]\s*\S+/gi,
    "$1=[REDACTED]"
  );
}
