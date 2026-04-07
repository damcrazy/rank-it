import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { ItemsList } from "./_components/ItemsList"
import { AddItemForm } from "./_components/AddItemForm"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()
  const { data: board } = await supabase
    .from("boards")
    .select("title, description, location, category")
    .eq("slug", slug)
    .single()

  if (!board) return { title: "Board not found" }

  return {
    title: `${board.title} — rank-it`,
    description: board.description ?? `Community ranked list: ${board.title}`,
  }
}

export default async function BoardPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  // Fetch board
  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!board) notFound()

  // Fetch initial items sorted by vote_count DESC
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("board_id", board.id)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100)

  // Increment view count (fire-and-forget)
  supabase
    .from("boards")
    .update({ view_count: board.view_count + 1 })
    .eq("id", board.id)
    .then(() => {})

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight truncate">{board.title}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              {board.category && <Badge variant="outline">{board.category}</Badge>}
              {board.location && <Badge variant="outline">📍 {board.location}</Badge>}
              <span className="text-xs text-muted-foreground self-center">
                {(items ?? []).length} entries · {board.view_count} views
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Description */}
        {board.description && (
          <p className="text-muted-foreground">{board.description}</p>
        )}

        {/* Add item form */}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            Know a great one? Add it — your vote counts.
          </p>
          <AddItemForm boardId={board.id} />
        </div>

        <Separator />

        {/* Ranked list — realtime */}
        <ItemsList initialItems={items ?? []} boardId={board.id} />
      </div>
    </main>
  )
}
