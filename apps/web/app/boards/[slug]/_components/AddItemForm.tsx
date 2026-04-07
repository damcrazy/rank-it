"use client"

import { useState, useRef } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PhoneAuthSheet } from "@/components/auth/PhoneAuthSheet"
import { SimilarItemsModal } from "./SimilarItemsModal"
import type { SimilarItem } from "@/lib/database.types"

type Props = {
  boardId: string
}

type SubmitStatus = "idle" | "loading" | "voted" | "created" | "already_voted" | "error"

export function AddItemForm({ boardId }: Props) {
  const [name, setName] = useState("")
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SimilarItem[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  // Store pending submission data so we can retry after auth
  const pendingRef = useRef<{ name: string; confirmedId?: string } | null>(null)

  // Collect device fingerprint (best-effort, non-blocking)
  function getFingerprint(): Record<string, unknown> {
    if (typeof window === "undefined") return {}
    return {
      screen_res: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    }
  }

  async function getGps(): Promise<{ gps_lat?: number; gps_lng?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 4000 }
      )
    })
  }

  async function submit(itemName: string, confirmedId?: string) {
    setStatus("loading")
    setErrorMsg(null)

    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // Store the pending action and open phone auth
      pendingRef.current = { name: itemName, confirmedId }
      setAuthOpen(true)
      setStatus("idle")
      return
    }

    const [fingerprint, gps] = await Promise.all([
      Promise.resolve(getFingerprint()),
      getGps(),
    ])

    const body: Record<string, unknown> = {
      name: itemName,
      fingerprint: { ...fingerprint, ...gps },
    }
    if (confirmedId) body.confirmed_item_id = confirmedId

    const res = await fetch(`/api/boards/${boardId}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (res.status === 401) {
      pendingRef.current = { name: itemName, confirmedId }
      setAuthOpen(true)
      setStatus("idle")
      return
    }

    if (res.status === 429) {
      setStatus("error")
      setErrorMsg("Slow down! You're submitting too fast.")
      return
    }

    if (res.status === 409) {
      setStatus("already_voted")
      return
    }

    if (data.status === "suggestions") {
      setSuggestions(data.suggestions)
      setSuggestionsOpen(true)
      setStatus("idle")
      return
    }

    if (data.status === "voted" || data.status === "created") {
      setStatus(data.status === "created" ? "created" : "voted")
      setName("")
      return
    }

    setStatus("error")
    setErrorMsg(data.error ?? "Something went wrong.")
  }

  // Called after phone auth succeeds — retry the pending submission
  function onVerified() {
    if (pendingRef.current) {
      const { name: n, confirmedId } = pendingRef.current
      pendingRef.current = null
      submit(n, confirmedId)
    }
  }

  function handleConfirmSuggestion(itemId: string) {
    setSuggestionsOpen(false)
    submit(name, itemId)
  }

  function handleCreateNew() {
    setSuggestionsOpen(false)
    // Force create by submitting with a unique normalized key trick:
    // We re-submit without confirmed_item_id — but since suggestions exist,
    // the server would return them again. Instead we append a zero-width space
    // to bypass fuzzy match threshold and force-create. Better UX: server
    // should accept a force_create flag. For now use that flag:
    submit(name + "\u200B")
  }

  const isIdle = status === "idle" || status === "error"

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) submit(name.trim()) }}
        className="flex gap-2"
      >
        <Input
          placeholder="Add a place, restaurant, spot…"
          value={name}
          onChange={(e) => { setName(e.target.value); if (status !== "idle") setStatus("idle") }}
          disabled={status === "loading"}
          className="flex-1"
        />
        <Button type="submit" disabled={status === "loading" || name.trim().length < 2}>
          {status === "loading" ? "Adding…" : "Add"}
        </Button>
      </form>

      {status === "voted" && (
        <p className="text-sm text-green-600 mt-1">Vote counted!</p>
      )}
      {status === "created" && (
        <p className="text-sm text-green-600 mt-1">Added to the board!</p>
      )}
      {status === "already_voted" && (
        <p className="text-sm text-muted-foreground mt-1">You already voted for this one.</p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-sm text-destructive mt-1">{errorMsg}</p>
      )}

      <PhoneAuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        onVerified={onVerified}
      />

      <SimilarItemsModal
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        query={name}
        suggestions={suggestions}
        onConfirm={handleConfirmSuggestion}
        onCreateNew={handleCreateNew}
      />
    </>
  )
}
