import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
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
  const featuredBoards = boards.slice(0, 6)
  const totalViews = boards.reduce((sum, board) => sum + board.view_count, 0)
  const topBoard = featuredBoards[0]

  return (
    <main className="min-h-screen bg-[linear-gradient(to_right,rgba(24,24,24,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,24,0.08)_1px,transparent_1px),linear-gradient(180deg,#fbfaf4,#f6f1e5)] bg-[size:40px_40px,40px_40px,100%_100%]">
      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)]">
          <Card className="bg-[#ffe16a] lg:min-h-[360px]">
            <CardContent className="flex h-full flex-col justify-between gap-8 pt-6 md:pt-8">
              <div className="flex items-start justify-between gap-4">
                <Badge className="bg-[#25dbe0] text-black">Community Ranking</Badge>
              </div>

              <div className="flex flex-col gap-5">
                <div className="w-fit border-4 border-black bg-white px-5 py-3 shadow-[6px_6px_0_#111]">
                  <h1 className="font-sans text-4xl font-black uppercase leading-none tracking-tight text-black md:text-6xl">
                    Rank-It
                  </h1>
                </div>
                <p className="max-w-3xl font-sans text-lg font-black uppercase leading-tight text-black md:text-2xl">
                  Community-ranked boards for food, places, trips, and everything else.
                </p>
                <p className="max-w-2xl text-base font-medium text-black/75 md:text-lg">
                  Build a board, share it, and let the crowd decide what rises to the top.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/boards/new">
                  <Button size="lg" className="bg-[#5c8df6] text-white">
                    Create Board
                  </Button>
                </Link>
                <Link href="/boards">
                  <Button size="lg" className="bg-white text-black">
                    Browse Boards
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="bg-white lg:min-h-[172px]">
              <CardHeader className="gap-3 pb-0">
                <Badge className="bg-[#f7d7f4] text-black">Top Board</Badge>
                <CardTitle className="text-3xl">{topBoard?.title ?? "No board yet"}</CardTitle>
                <CardDescription className="text-black/70">
                  Most viewed board in the current batch.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid gap-3">
                  <div className="border-2 border-black bg-[#fff3cb] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Views</p>
                    <p className="mt-2 text-3xl font-black text-black">{topBoard?.view_count ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#f55bb0] lg:min-h-[172px]">
              <CardHeader className="gap-3 pb-0">
                <Badge className="bg-white text-black">Live Stats</Badge>
                <CardTitle className="text-3xl text-black">Boards + Views</CardTitle>
              </CardHeader>
              <CardContent className="grid flex-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-1">
                <div className="border-2 border-black bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Boards</p>
                  <p className="mt-2 text-3xl font-black text-black">{boards.length}</p>
                </div>
                <div className="border-2 border-black bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Views</p>
                  <p className="mt-2 text-3xl font-black text-black">{totalViews}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:auto-rows-[minmax(220px,auto)]">
          <Card className="bg-[#25dbe0] lg:col-span-4 lg:h-full">
            <CardHeader className="gap-3 pb-0">
              <CardTitle className="text-4xl text-black">Start a Board</CardTitle>
              <CardDescription className="text-black/75">
                Create a ranking board and invite people to add entries and vote.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-2 border-black bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Best for</p>
                  <p className="mt-2 text-base font-black text-black">Food, places, trips</p>
                </div>
                <div className="border-2 border-black bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Style</p>
                  <p className="mt-2 text-base font-black text-black">Fast, public, opinionated</p>
                </div>
              </div>
              <Link href="/boards/new" className="w-full">
                <Button size="lg" className="w-full bg-[#5c8df6] text-white">
                  + Create
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white lg:col-span-5 lg:h-full">
            <CardHeader className="gap-3 pb-0">
              <CardTitle className="text-4xl text-black">Browse Boards</CardTitle>
              <CardDescription className="text-black/75">
                Jump straight into the most viewed and most active boards.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-2 border-black bg-[#fff3cb] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Top board</p>
                  <p className="mt-2 truncate text-base font-black text-black">{topBoard?.title ?? "No board yet"}</p>
                </div>
                <div className="border-2 border-black bg-[#f7d7f4] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Featured</p>
                  <p className="mt-2 text-base font-black text-black">{featuredBoards.length} boards</p>
                </div>
              </div>
              <Link href="/boards" className="w-full">
                <Button size="lg" className="w-full bg-[#f55bb0] text-black">
                  Browse
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-[#ffe16a] lg:col-span-3 lg:h-full">
            <CardHeader className="gap-3 pb-0">
              <CardTitle className="text-4xl text-black">What Is It?</CardTitle>
              <CardDescription className="text-black/75">
                A community ranking app for local opinions.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-3 pt-2">
              <div className="border-2 border-black bg-white p-3 text-sm font-medium text-black">
                People create boards, add entries, and vote on what deserves to rise.
              </div>
              <div className="border-2 border-black bg-white p-3 text-sm font-medium text-black">
                Great for restaurants, cafes, neighborhoods, travel spots, and niche local lists.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="popular-boards" className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-16 md:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-black/60">Popular Boards</p>
          <h2 className="font-sans text-4xl font-black text-black md:text-5xl">Most viewed right now</h2>
        </div>

        {boards.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-10 text-center pt-10">
              <p className="text-4xl">🗒️</p>
              <p className="mt-4 text-2xl font-black text-black">No boards yet</p>
              <p className="mt-2 text-black/70">Create the first board and start the ranking.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredBoards.map((board, index) => (
              <BoardCard key={board.id} board={board} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function BoardCard({ board, index }: { board: Board; index: number }) {
  return (
    <Link href={`/boards/${board.slug}`} className="block h-full">
      <Card className="h-full bg-[#fffdf7] transition-transform hover:-translate-y-1">
        <CardHeader className="gap-4 pb-0">
          <div className="flex items-center justify-between gap-3">
            <Badge className="bg-white text-black">#{index + 1}</Badge>
            <span className="text-sm font-semibold text-black/70">{board.view_count} views</span>
          </div>
          <CardTitle className="line-clamp-2 text-3xl text-black">{board.title}</CardTitle>
          <CardDescription className="text-black/70">
            {board.description ?? "Community ranking board"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 pt-2">
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {board.category && <Badge className="bg-[#25dbe0] text-black">{board.category}</Badge>}
            {board.location && <Badge className="bg-[#ffe16a] text-black">{board.location}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
