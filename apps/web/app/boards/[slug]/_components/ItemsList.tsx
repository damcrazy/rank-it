"use client"

import { useEffect, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import type { Item } from "@/lib/database.types"
import { ChevronRightIcon, MapPinIcon } from "lucide-react"

const MEDALS = ["🥇", "🥈", "🥉"]

type Props = {
  initialItems: Item[]
  boardId: string
}

type ItemUpsertDetail = {
  boardId: string
  item: Item
}

export function ItemsList({ initialItems, boardId }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [detailItemId, setDetailItemId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})

  // Sort helper — vote_count DESC, then oldest first on tie
  function sorted(list: Item[]) {
    return [...list].sort((a, b) =>
      b.vote_count !== a.vote_count
        ? b.vote_count - a.vote_count
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  function upsertItem(nextItem: Item) {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === nextItem.id)
      return exists ? prev.map((item) => (item.id === nextItem.id ? nextItem : item)) : [...prev, nextItem]
    })

    requestAnimationFrame(() => {
      const element = itemRefs.current[nextItem.id]
      if (!element) return
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      element.animate(
        [
          { transform: "translateY(0px)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
          { transform: "translateY(-2px)", boxShadow: "8px 8px 0 rgba(17,17,17,1)" },
          { transform: "translateY(0px)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
        ],
        { duration: 800, easing: "ease-out" }
      )
    })
  }

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`board-items:${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            upsertItem(payload.new as Item)
          } else if (payload.eventType === "UPDATE") {
            upsertItem(payload.new as Item)
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== (payload.old as Item).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [boardId])

  useEffect(() => {
    function handleItemUpsert(event: Event) {
      const customEvent = event as CustomEvent<ItemUpsertDetail>
      if (customEvent.detail.boardId !== boardId) return
      upsertItem(customEvent.detail.item)
    }

    window.addEventListener("board:item-upserted", handleItemUpsert)
    return () => window.removeEventListener("board:item-upserted", handleItemUpsert)
  }, [boardId])

  const ranked = sorted(items)
  const detailItem = ranked.find((item) => item.id === detailItemId) ?? null

  if (ranked.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">🗳️</p>
        <p className="text-lg font-medium">No entries yet.</p>
        <p className="text-sm">Be the first to add something!</p>
      </div>
    )
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {ranked.map((item, idx) => {
          return (
            <li
              key={item.id}
              ref={(node) => {
                itemRefs.current[item.id] = node
              }}
            >
              <div className="group grid gap-4 border border-border bg-card px-5 py-4 text-left transition-all hover:border-primary/40 hover:shadow-[4px_4px_0_#111] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
                <span className="flex size-12 shrink-0 items-center justify-center border border-border bg-muted text-2xl">
                  {idx < 3 ? MEDALS[idx] : <span className="font-mono text-sm text-muted-foreground">#{idx + 1}</span>}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-lg font-bold">{item.name}</p>
                    {item.location && (
                      <span className="inline-flex shrink-0 text-muted-foreground" aria-label="Has location">
                        <MapPinIcon />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto md:flex-nowrap md:self-start">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setDetailItemId(item.id)}
                    className="shrink-0 bg-[#ef5bb0] text-black shadow-[4px_4px_0_#111] hover:bg-[#f47fc0] focus-visible:bg-[#f47fc0] [@media(hover:hover)]:translate-x-4 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-x-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    Know more
                    <ChevronRightIcon data-icon="inline-end" />
                  </Button>
                  <Badge variant={idx < 3 ? "default" : "secondary"} className="shrink-0 tabular-nums">
                    {item.vote_count} {item.vote_count === 1 ? "vote" : "votes"}
                  </Badge>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <Sheet open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItemId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          {detailItem && (
            <>
              <SheetHeader className="gap-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="tabular-nums">
                    {detailItem.vote_count} {detailItem.vote_count === 1 ? "vote" : "votes"}
                  </Badge>
                </div>
                <SheetTitle>{detailItem.name}</SheetTitle>
                <SheetDescription>
                  Extra context for this leaderboard entry.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 p-6">
                {detailItem.description ? (
                  <div className="flex flex-col gap-2 border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Description</p>
                    <p className="text-sm leading-6 text-foreground">{detailItem.description}</p>
                  </div>
                ) : (
                  <div className="border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No written context yet for this entry.
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
