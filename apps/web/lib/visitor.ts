import { createHash } from "crypto"

const IP_SALT = process.env.IP_HASH_SALT ?? "rank-it-ip-salt"
const PHONE_SALT = process.env.PHONE_HASH_SALT ?? "rank-it-phone-salt"

/** Hash an IP address — never store raw IPs. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + IP_SALT).digest("hex")
}

/** Hash a phone number for dedup checks. */
export function hashPhone(phone: string): string {
  return createHash("sha256").update(phone + PHONE_SALT).digest("hex")
}

/** Hash a user-agent string. */
export function hashUa(ua: string): string {
  return createHash("sha256").update(ua).digest("hex")
}

/** Extract the client IP from a Next.js Request. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}
