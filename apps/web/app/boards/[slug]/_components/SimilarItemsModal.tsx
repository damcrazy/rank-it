"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import type { SimilarItem } from "@/lib/database.types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  suggestions: SimilarItem[]
  onConfirm: (itemId: string) => void
  onCreateNew: () => void
}

export function SimilarItemsModal({
  open, onOpenChange, query, suggestions, onConfirm, onCreateNew,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Did you mean one of these?</DialogTitle>
          <DialogDescription>
            We found similar entries for &ldquo;{query}&rdquo;. Vote for one or create yours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => onConfirm(s.id)}
              className="flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <span className="font-medium">{s.name}</span>
              <Badge variant="secondary">{s.vote_count} {s.vote_count === 1 ? "vote" : "votes"}</Badge>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onCreateNew}>
            Add &ldquo;{query}&rdquo; as new
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
