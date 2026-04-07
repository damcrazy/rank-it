import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import type { Board } from "@/lib/database.types"

type Props = {
  searchParams: Promise<{
    q?: string
    category?: string
  }>
}

function normalizeCategory(category: string | null) {
  if (!category) return null
  return category.startsWith("custom:") ? category.slice(7) : category
}

function buildBoardsHref(q: string, category?: string) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (category) params.set("category", category)

  const query = params.toString()
  return query ? `/boards?${query}` : "/boards"
}

async function getCategories() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("boards")
    .select("category")
    .not("category", "is", null)
    .limit(200)

  return [...new Set((data ?? []).map((row) => normalizeCategory(row.category)).filter(Boolean))] as string[]
}

async function getBoards(q: string, category: string): Promise<Board[]> {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from("boards")
    .select("*")
    .order("view_count", { ascending: false })
    .limit(60)

  if (category) {
    query = query.or(`category.eq.${category},category.eq.custom:${category}`)
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`)
  }

  const { data } = await query
  return data ?? []
}

export default async function BoardsIndexPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const category = params.category?.trim() ?? ""

  const [boards, categories] = await Promise.all([getBoards(q, category), getCategories()])

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <Card className="bg-[#fffdf7]">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <Badge className="bg-[#25dbe0] text-black">All Boards</Badge>
                <CardTitle className="text-4xl text-black md:text-5xl">Search the board collection</CardTitle>
                <CardDescription className="max-w-2xl text-black/70">
                  Search by title, description, or location. You can also filter by category.
                </CardDescription>
              </div>
              <Link href="/boards/new">
                <Button size="lg" className="bg-[#5c8df6] text-white">Create Board</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form action="/boards" className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search boards, places, cities..."
                className="font-sans normal-case tracking-normal"
              />
              <Button type="submit" className="bg-[#f55bb0] text-black">Search</Button>
            </form>

            <div className="flex flex-wrap gap-2">
              <Link href={buildBoardsHref(q)}>
                <Badge className={category ? "bg-white text-black" : "bg-[#ffe16a] text-black"}>
                  All
                </Badge>
              </Link>
              {categories.map((item) => (
                <Link key={item} href={buildBoardsHref(q, item)}>
                  <Badge className={category === item ? "bg-[#25dbe0] text-black" : "bg-white text-black"}>
                    {item}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {boards.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-10 text-center pt-10">
              <p className="text-4xl">🗂️</p>
              <p className="mt-4 text-2xl font-black text-black">No matching boards</p>
              <p className="mt-2 text-black/70">Try a different search term or category.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {boards.map((board, index) => (
              <Link key={board.id} href={`/boards/${board.slug}`} className="block h-full">
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
                      {board.category && (
                        <Badge className="bg-[#25dbe0] text-black">{normalizeCategory(board.category)}</Badge>
                      )}
                      {board.location && <Badge className="bg-[#ffe16a] text-black">{board.location}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
