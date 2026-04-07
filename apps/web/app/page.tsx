import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import type { Board } from "@/lib/database.types"

async function getBoards(): Promise<Board[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("boards")
    .select("*")
    .order("view_count", { ascending: false })
    .limit(30)
  return data ?? []
}

export default async function HomePage() {
  const boards = await getBoards()

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center flex flex-col items-center gap-6">
          <h1 className="text-5xl font-extrabold tracking-tight">rank-it</h1>
          <p className="text-xl text-muted-foreground max-w-md">
            Community-ranked lists for everything. Best restaurants, cafes, travel spots — decided by the crowd.
          </p>
          <Link href="/boards/new">
            <Button size="lg" className="text-base px-8">
              + Create a board
            </Button>
          </Link>
        </div>
      </div>

      {/* Boards grid */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {boards.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-5xl mb-4">🗒️</p>
            <p className="text-xl font-semibold">No boards yet</p>
            <p className="mt-1">Be the first to create one.</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-5 text-muted-foreground">Popular boards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <BoardCard key={board.id} board={board} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function BoardCard({ board }: { board: Board }) {
  return (
    <Link href={`/boards/${board.slug}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base leading-snug line-clamp-2">
            {board.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {board.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{board.description}</p>
          )}
          <div className="flex gap-1.5 flex-wrap mt-auto pt-1">
            {board.category && <Badge variant="secondary" className="text-xs">{board.category}</Badge>}
            {board.location && <Badge variant="outline" className="text-xs">📍 {board.location}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{board.view_count} views</p>
        </CardContent>
      </Card>
    </Link>
  )
}
