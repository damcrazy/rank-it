import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import { submissionRateLimit } from "@/lib/rate-limit"
import { getClientIp, hashIp, hashPhone, hashUa } from "@/lib/visitor"
import type { SimilarItem } from "@/lib/database.types"

type Fingerprint = {
  gps_lat?: number
  gps_lng?: number
  screen_res?: string
  timezone?: string
  language?: string
}

type SubmitBody = {
  name: string
  description?: string
  fingerprint?: Fingerprint
  /** Set when user confirmed a fuzzy-match suggestion */
  confirmed_item_id?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params
  const ip = getClientIp(req)
  const ipHash = hashIp(ip)

  // ── Rate limit ────────────────────────────────────────────
  const { success: withinLimit } = await submissionRateLimit.limit(ipHash)
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many submissions. Try again in a few minutes." },
      { status: 429 }
    )
  }

  // ── Parse body ────────────────────────────────────────────
  let body: SubmitBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const rawName = body.name?.trim()
  if (!rawName || rawName.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 })
  }
  if (rawName.length > 255) {
    return NextResponse.json({ error: "Name too long." }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // ── Auth: require phone-verified account ──────────────────
  const authHeader = req.headers.get("authorization")
  let userId: string | null = null
  let phoneHash: string | null = null

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      userId = user.id
      if (user.phone) phoneHash = hashPhone(user.phone)
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 })
  }

  const uaHash = hashUa(req.headers.get("user-agent") ?? "")
  const fingerprint = body.fingerprint ?? {}

  // ── User confirmed a fuzzy suggestion ────────────────────
  if (body.confirmed_item_id) {
    return recordVote({
      supabase, boardId, itemId: body.confirmed_item_id,
      userId, phoneHash, ipHash, uaHash, fingerprint,
    })
  }

  const normalized = rawName.toLowerCase().replace(/\s+/g, " ")

  // ── 1. Exact match ────────────────────────────────────────
  const { data: exact } = await supabase
    .from("items")
    .select("id")
    .eq("board_id", boardId)
    .eq("name_normalized", normalized)
    .maybeSingle()

  if (exact) {
    return recordVote({
      supabase, boardId, itemId: exact.id,
      userId, phoneHash, ipHash, uaHash, fingerprint,
    })
  }

  // ── 2. Fuzzy match ────────────────────────────────────────
  const { data: fuzzy } = await supabase.rpc("find_similar_items", {
    p_board_id: boardId,
    p_name: rawName,
    p_threshold: 0.75,
  })

  if (fuzzy && fuzzy.length > 0) {
    return NextResponse.json({ status: "suggestions", suggestions: fuzzy as SimilarItem[] })
  }

  // ── 3. Create new item ────────────────────────────────────
  const { data: newItem, error: insertError } = await supabase
    .from("items")
    .insert({
      board_id: boardId,
      name: rawName,
      name_normalized: normalized,
      description: body.description ?? null,
      vote_count: 1,
      created_by: userId,
    })
    .select("id, name, vote_count")
    .single()

  if (insertError) {
    // Race: another request inserted same item between our check and insert
    if (insertError.code === "23505") {
      const { data: raceItem } = await supabase
        .from("items")
        .select("id")
        .eq("board_id", boardId)
        .eq("name_normalized", normalized)
        .maybeSingle()

      if (raceItem) {
        return recordVote({
          supabase, boardId, itemId: raceItem.id,
          userId, phoneHash, ipHash, uaHash, fingerprint,
        })
      }
    }
    console.error("item insert error", insertError)
    return NextResponse.json({ error: "Failed to create item." }, { status: 500 })
  }

  // Record the creator's submission
  await supabase.from("submissions").insert({
    board_id: boardId,
    item_id: newItem.id,
    user_id: userId,
    phone_hash: phoneHash,
    ip_hash: ipHash,
    ua_hash: uaHash,
    ...fingerprint,
  })

  return NextResponse.json({ status: "created", item: newItem })
}

// ── Vote on an existing item ──────────────────────────────────────────────────

type VoteParams = {
  supabase: ReturnType<typeof createSupabaseServiceClient>
  boardId: string
  itemId: string
  userId: string
  phoneHash: string | null
  ipHash: string
  uaHash: string
  fingerprint: Fingerprint
}

async function recordVote({
  supabase, boardId, itemId,
  userId, phoneHash, ipHash, uaHash, fingerprint,
}: VoteParams): Promise<NextResponse> {
  // Insert submission — unique constraint enforces one vote per user per item
  const { error: subError } = await supabase.from("submissions").insert({
    board_id: boardId,
    item_id: itemId,
    user_id: userId,
    phone_hash: phoneHash,
    ip_hash: ipHash,
    ua_hash: uaHash,
    ...fingerprint,
  })

  if (subError) {
    if (subError.code === "23505") {
      return NextResponse.json({ status: "already_voted" }, { status: 409 })
    }
    console.error("submission insert error", subError)
    return NextResponse.json({ error: "Failed to record vote." }, { status: 500 })
  }

  // Atomically increment vote_count
  const { data: item, error: voteError } = await supabase
    .rpc("increment_vote", { p_item_id: itemId })

  if (voteError) {
    console.error("increment_vote error", voteError)
    return NextResponse.json({ error: "Vote recorded but count failed." }, { status: 500 })
  }

  return NextResponse.json({ status: "voted", item })
}
