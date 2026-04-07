import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Passthrough limiter used when Upstash is not configured (local dev)
const noopLimiter = { limit: async () => ({ success: true }) } as unknown as Ratelimit

function makeRedisLimiter(prefix: string, window: string, max: number): Ratelimit {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return noopLimiter
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(max, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix,
  })
}

// 5 item submissions per IP per 10 minutes
export const submissionRateLimit = makeRedisLimiter("rank-it:submit", "10 m", 5)

// 3 board creations per IP per hour
export const boardCreateRateLimit = makeRedisLimiter("rank-it:board", "1 h", 3)
