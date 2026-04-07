import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { AddItemForm } from "./_components/AddItemForm"
import { ItemsList } from "./_components/ItemsList"

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

  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!board) notFound()

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("board_id", board.id)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100)

  supabase
    .from("boards")
    .update({ view_count: board.view_count + 1 })
    .eq("id", board.id)
    .then(() => {})

  return (
    <main className="min-h-screen">
      <div className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Board</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{board.title}</h1>
          </div>
          <Link href="/">
            <Button variant="outline">Back home</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="grid gap-px border border-border bg-border lg:grid-cols-[1fr_220px]">
          <div className="bg-card p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              {board.category && <Badge variant="secondary">{board.category}</Badge>}
              {board.location && <Badge variant="outline">{board.location}</Badge>}
              <Badge variant="outline">{(items ?? []).length} entries</Badge>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{board.title}</h2>
              {board.description && (
                <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{board.description}</p>
              )}
            </div>
          </div>

          <div className="grid gap-px bg-border">
            <div className="bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Views</p>
              <p className="mt-2 text-3xl font-semibold">{board.view_count}</p>
            </div>
            <div className="bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Entries</p>
              <p className="mt-2 text-3xl font-semibold">{(items ?? []).length}</p>
            </div>
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Add your pick</p>
              <p className="text-sm text-muted-foreground">Add an item or vote on an existing match.</p>
            </div>
            <AddItemForm boardId={board.id} />
          </CardContent>
        </Card>

        <Separator />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Leaderboard</p>
            <h3 className="text-2xl font-semibold tracking-tight">Current ranking</h3>
          </div>
          <ItemsList initialItems={items ?? []} boardId={board.id} />
        </section>
      </div>
    </main>
  )
}
