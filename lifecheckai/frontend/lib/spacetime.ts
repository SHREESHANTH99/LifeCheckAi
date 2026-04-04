const SPACETIME_HOST = process.env.NEXT_PUBLIC_SPACETIMEDB_HOST;
const SPACETIME_DB = process.env.NEXT_PUBLIC_SPACETIMEDB_DB_NAME;

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("lifecheck_session");
  if (!id) {
    id = `user_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("lifecheck_session", id);
  }
  return id;
}

export interface UserPresence {
  sessionId: string;
  city: string;
  lat: number;
  lon: number;
  timestamp: number;
  avatar: string;
}

export interface CrowdReport {
  id: string;
  sessionId: string;
  city: string;
  lat: number;
  lon: number;
  type: "smoke" | "flood" | "dust_storm" | "chemical" | "road_block" | "safe_zone";
  description: string;
  upvotes: number;
  timestamp: number;
}

export interface ActivityEvent {
  id: string;
  type: "city_check" | "crowd_report" | "alert_triggered";
  city: string;
  sessionId: string;
  avatar: string;
  message: string;
  timestamp: number;
}

const BASE = "http://127.0.0.1:8000";

export async function broadcastPresence(presence: UserPresence): Promise<void> {
  await fetch(`${BASE}/realtime/presence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...presence, host: SPACETIME_HOST, db: SPACETIME_DB }),
  }).catch(() => {});
}

export async function getActivePResence(): Promise<UserPresence[]> {
  const res = await fetch(`${BASE}/realtime/presence`).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

export async function submitCrowdReport(
  report: Omit<CrowdReport, "id" | "upvotes" | "timestamp">
): Promise<CrowdReport | null> {
  const res = await fetch(`${BASE}/realtime/crowd-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json();
}

export async function getCrowdReports(
  lat?: number,
  lon?: number,
  radius?: number
): Promise<CrowdReport[]> {
  const params = new URLSearchParams();
  if (typeof lat === "number") params.set("lat", String(lat));
  if (typeof lon === "number") params.set("lon", String(lon));
  if (typeof radius === "number") params.set("radius_km", String(radius));
  const res = await fetch(`${BASE}/realtime/crowd-reports?${params}`).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

export async function getActivityFeed(limit = 20): Promise<ActivityEvent[]> {
  const res = await fetch(`${BASE}/realtime/activity?limit=${limit}`).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

export const AVATARS = ["🛡️", "🌍", "🔬", "⚡", "🌿", "🔭", "🧬", "🌊"];

export function getAvatar(sessionId: string): string {
  return AVATARS[sessionId.charCodeAt(sessionId.length - 1) % AVATARS.length];
}
