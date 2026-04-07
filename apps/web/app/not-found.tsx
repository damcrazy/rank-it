import Link from "next/link"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[linear-gradient(to_right,rgba(24,24,24,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,24,0.08)_1px,transparent_1px),linear-gradient(180deg,#fbfaf4,#f6f1e5)] bg-[size:40px_40px,40px_40px,100%_100%]">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-4 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="bg-[#ffe16a]">
          <CardContent className="flex h-full flex-col justify-between gap-8 pt-6 md:pt-8">
            <div className="flex items-start justify-between gap-4">
              <Badge className="bg-[#25dbe0] text-black">404 Situation</Badge>
              <Badge className="bg-white text-black">Lost Board Energy</Badge>
            </div>

            <div className="flex flex-col gap-5">
              <div className="w-fit border-4 border-black bg-white px-5 py-3 shadow-[6px_6px_0_#111]">
                <p className="font-sans text-4xl font-black uppercase leading-none tracking-tight text-black md:text-6xl">
                  Page Missing
                </p>
              </div>
              <p className="max-w-3xl font-sans text-lg font-black uppercase leading-tight text-black md:text-2xl">
                This page wandered off the board and never made it back.
              </p>
              <p className="max-w-2xl text-base font-medium text-black/75 md:text-lg">
                The link may be old, the board may not exist, or the route is simply wrong. Let&apos;s get you back to
                something real.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/">
                <Button size="lg" className="bg-[#f55bb0] text-black">
                  Back Home
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

        <div className="grid gap-4">
          <Card className="bg-white">
            <CardHeader className="gap-3 pb-0">
              <Badge className="bg-[#f7d7f4] text-black">What happened?</Badge>
              <CardTitle className="text-3xl text-black">Not every route deserves to rank.</CardTitle>
              <CardDescription className="text-black/70">
                This page is not available right now, but the app is.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-2">
              <div className="border-2 border-black bg-[#fff3cb] p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Try this</p>
                <p className="mt-2 text-base font-black text-black">Head back home or search the boards index.</p>
              </div>
              <div className="border-2 border-black bg-[#25dbe0] p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/70">Common reason</p>
                <p className="mt-2 text-base font-black text-black">A deleted board, a typo, or a stale shared link.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#f55bb0]">
            <CardHeader className="gap-3 pb-0">
              <Badge className="bg-white text-black">Quick exit</Badge>
              <CardTitle className="text-3xl text-black">Jump back in</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-2">
              <Link href="/boards/new" className="w-full">
                <Button size="lg" className="w-full bg-[#5c8df6] text-white">
                  Create a board
                </Button>
              </Link>
              <Link href="/boards" className="w-full">
                <Button size="lg" className="w-full bg-white text-black">
                  Explore active boards
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
