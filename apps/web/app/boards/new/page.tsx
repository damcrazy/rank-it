"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const MapLocationPicker = dynamic(
  () => import("@/components/board/MapLocationPicker").then((mod) => mod.MapLocationPicker),
  { ssr: false }
)

const CATEGORIES = [
  "Food & Restaurants",
  "Cafes & Coffee",
  "Nightlife & Bars",
  "Travel & Sightseeing",
  "Shopping",
  "Outdoors & Nature",
  "Entertainment",
  "Sports",
]

const CUSTOM_VALUE = "__custom__"

function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7)
  )
}

export default function NewBoardPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [location, setLocation] = useState("")
  const [gpsLat, setGpsLat] = useState<number | null>(null)
  const [gpsLng, setGpsLng] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustom = category === CUSTOM_VALUE
  const finalCategory = isCustom ? customCategory.trim() : category

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (isCustom && !customCategory.trim()) return

    setError(null)
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const slug = slugify(title)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { data, error: insertError } = await supabase
      .from("boards")
      .insert({
        slug,
        title: title.trim(),
        description: description.trim() || null,
        category: isCustom ? `custom:${finalCategory}` : finalCategory || null,
        location: location.trim() || null,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        created_by: session?.user?.id ?? null,
      })
      .select("slug")
      .single()

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push(`/boards/${data.slug}`)
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="flex flex-col gap-5">
          <Badge variant="secondary" className="h-7 w-fit px-3 uppercase tracking-[0.18em]">
            New board
          </Badge>
          <div className="flex flex-col gap-3">
            <h1 className="headline-burst text-4xl font-semibold tracking-tight md:text-5xl">
              Start a board with a clear title and simple context.
            </h1>
            <p className="max-w-lg text-base text-muted-foreground md:text-lg">
              Keep it specific enough that people know what to add, vote on, and compare.
            </p>
          </div>
          <div className="grid gap-px border border-border bg-border">
            <div className="bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Works well for</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Restaurants, cafes, neighborhoods, travel spots, services, or local recommendations.
              </p>
            </div>
            <div className="bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tip</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A precise title usually leads to better suggestions and cleaner rankings.
              </p>
            </div>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-semibold tracking-tight">Create your board</CardTitle>
            <CardDescription>Give people enough context to participate quickly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Board title *</Label>
                <Input
                  id="title"
                  placeholder="Best Restaurants in Bangalore"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this list about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      setCategory(value)
                      if (value !== CUSTOM_VALUE) setCustomCategory("")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick one…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CATEGORIES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_VALUE}>Add a custom category</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {isCustom && (
                    <div className="flex flex-col gap-1">
                      <Input
                        placeholder="e.g. Coworking Spaces"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        maxLength={60}
                      />
                      <p className="text-xs text-muted-foreground">
                        Custom categories are reviewed before they go live.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Discovery</Label>
                  <div className="border-2 border-black bg-[#fff3cb] p-4 text-sm font-medium text-black">
                    Add a map location so people can discover this board by place.
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
              />

              {location && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="picked-location">Picked location</Label>
                  <Input
                    id="picked-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={255}
                    className="font-sans normal-case tracking-normal"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can tweak the place label manually after picking it on the map.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {location && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLocation("")
                      setGpsLat(null)
                      setGpsLng(null)
                    }}
                  >
                    Clear location
                  </Button>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                size="lg"
                disabled={loading || title.trim().length < 3 || (isCustom && !customCategory.trim())}
              >
                {loading ? "Creating…" : "Create board"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
