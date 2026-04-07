"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Badge } from "@workspace/ui/components/badge"
import type { Item } from "@/lib/database.types"

const MEDALS = ["🥇", "🥈", "🥉"]

type Props = {
  initialItems: Item[]
  boardId: string
}

export function ItemsList({ initialItems, boardId }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)

  // Sort helper — vote_count DESC, then oldest first on tie
  function sorted(list: Item[]) {
    return [...list].sort((a, b) =>
      b.vote_count !== a.vote_count
        ? b.vote_count - a.vote_count
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

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
            setItems((prev) => [...prev, payload.new as Item])
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === (payload.new as Item).id ? (payload.new as Item) : item
              )
            )
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== (payload.old as Item).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [boardId])

  const ranked = sorted(items)

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
    <ol className="flex flex-col gap-3">
      {ranked.map((item, idx) => (
        <li
          key={item.id}
          className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 transition-shadow hover:shadow-md"
        >
          {/* Rank */}
          <span className="text-2xl w-8 text-center shrink-0">
            {idx < 3 ? MEDALS[idx] : <span className="text-muted-foreground font-mono text-sm">#{idx + 1}</span>}
          </span>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{item.name}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground truncate">{item.description}</p>
            )}
          </div>

          {/* Vote count */}
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {item.vote_count} {item.vote_count === 1 ? "vote" : "votes"}
          </Badge>
        </li>
      ))}
    </ol>
  )
}
