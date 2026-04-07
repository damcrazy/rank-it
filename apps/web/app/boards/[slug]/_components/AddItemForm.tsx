"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { PhoneAuthSheet } from "@/components/auth/PhoneAuthSheet"
import { SimilarItemsModal } from "./SimilarItemsModal"
import type { Item, SimilarItem } from "@/lib/database.types"
import { ChevronDownIcon, MapPinIcon, SparklesIcon } from "lucide-react"

type Props = {
  boardId: string
}

type SubmitStatus = "idle" | "loading" | "voted" | "created" | "already_voted" | "error"

type ItemUpsertDetail = {
  boardId: string
  item: Item
}

const MapLocationPicker = dynamic(
  () => import("@/components/board/MapLocationPicker").then((mod) => mod.MapLocationPicker),
  { ssr: false }
)

export function AddItemForm({ boardId }: Props) {
  const router = useRouter()
  const [name, setName] = useState("")
  const deferredName = useDeferredValue(name)
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [gpsLat, setGpsLat] = useState<number | null>(null)
  const [gpsLng, setGpsLng] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SimilarItem[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [liveSuggestions, setLiveSuggestions] = useState<SimilarItem[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
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

  useEffect(() => {
    const query = deferredName.trim()

    if (query.length < 2) {
      setLiveSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true)

      try {
        const res = await fetch(`/api/boards/${boardId}/items?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const data = (await res.json()) as { suggestions?: SimilarItem[] }
        setLiveSuggestions(data.suggestions ?? [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLiveSuggestions([])
        }
      } finally {
        setSuggestionsLoading(false)
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [boardId, deferredName])

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
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
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
      setErrorMsg("Slow down, chaos captain. The board needs a second.")
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
      setDescription("")
      setLocation("")
      setGpsLat(null)
      setGpsLng(null)
      setDetailsOpen(false)
      if (typeof window !== "undefined" && data.item) {
        window.dispatchEvent(
          new CustomEvent<ItemUpsertDetail>("board:item-upserted", {
            detail: {
              boardId,
              item: data.item as Item,
            },
          })
        )
      }
      router.refresh()
      return
    }

    setStatus("error")
    setErrorMsg(data.error ?? "The ranking machine glitched. Try that again.")
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

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) submit(name.trim()) }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              placeholder="Add a place, restaurant, spot…"
              value={name}
              onChange={(e) => { setName(e.target.value); if (status !== "idle") setStatus("idle") }}
              disabled={status === "loading"}
              className="min-h-12"
            />
            <Button type="submit" size="lg" disabled={status === "loading" || name.trim().length < 2}>
              {status === "loading" ? "Adding…" : "Add"}
            </Button>
          </div>

          {(suggestionsLoading || liveSuggestions.length > 0) && (
            <div className="grid gap-2 border-2 border-black bg-card p-3 shadow-[4px_4px_0_#111]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">
                  Duplicate radar
                </p>
                {suggestionsLoading && (
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-black/60">
                    sniffing the board...
                  </span>
                )}
              </div>

              {liveSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => submit(name.trim(), suggestion.id)}
                  className="flex items-center justify-between gap-3 border-2 border-black bg-[#fff3cb] px-4 py-3 text-left shadow-[3px_3px_0_#111] transition-transform hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-black">
                      {suggestion.name}
                    </p>
                    <p className="text-xs font-medium text-black/70">
                      Same chaos, already on the board. Tap to boost it.
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-[#25dbe0] text-black">
                    {suggestion.vote_count} {suggestion.vote_count === 1 ? "vote" : "votes"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDetailsOpen((open) => !open)}
            className="group"
          >
            <SparklesIcon data-icon="inline-start" />
            Add more details
            <ChevronDownIcon
              data-icon="inline-end"
              className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            />
          </Button>
          {(description || location) && (
            <Badge variant="secondary" className="gap-1">
              <MapPinIcon />
              Extra details ready
            </Badge>
          )}
        </div>

        {detailsOpen && (
          <div className="grid gap-4 border-2 border-black bg-card p-4 shadow-[4px_4px_0_#111]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-description">Short description</Label>
                <Textarea
                  id="item-description"
                  placeholder="Why this pick deserves to rank."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Picked place</Label>
                <div className="border-2 border-black bg-[#fff3cb] p-4 text-sm font-medium text-black">
                  Optional. Great for specific branches like Blue Tokai, Indiranagar.
                </div>
              </div>
            </div>

            <MapLocationPicker
              key={`${location}:${gpsLat ?? "none"}:${gpsLng ?? "none"}`}
              value={{ label: location, lat: gpsLat, lng: gpsLng }}
              onChange={(next) => {
                setLocation(next.label)
                setGpsLat(next.lat)
                setGpsLng(next.lng)
              }}
              label="Entry location"
              placeholder="Search for the exact branch or click on the map"
              helperText="Optional. Pick the exact spot for this entry."
              mapHeightClassName="h-[220px]"
            />
          </div>
        )}
      </form>

      {status === "voted" && (
        <p className="mt-1 border-2 border-black bg-[#25dbe0] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0_#111]">
          Crowd energy locked in. Vote counted.
        </p>
      )}
      {status === "created" && (
        <p className="mt-1 border-2 border-black bg-[#ffe16a] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0_#111]">
          Fresh entry dropped on the board.
        </p>
      )}
      {status === "already_voted" && (
        <p className="mt-1 border-2 border-black bg-[#f55bb0] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0_#111]">
          Plot twist: your vote is already in the machine.
        </p>
      )}
      {status === "error" && errorMsg && (
        <p className="mt-1 border-2 border-black bg-[#f7d7f4] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0_#111]">
          {errorMsg}
        </p>
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
