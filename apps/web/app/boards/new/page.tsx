"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

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
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    + "-" + Math.random().toString(36).slice(2, 7)
}

export default function NewBoardPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [location, setLocation] = useState("")
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

    const { data: { session } } = await supabase.auth.getSession()

    const { data, error: insertError } = await supabase
      .from("boards")
      .insert({
        slug,
        title: title.trim(),
        description: description.trim() || null,
        // Mark custom categories with a prefix so admin can spot them
        category: isCustom ? `custom:${finalCategory}` : finalCategory || null,
        location: location.trim() || null,
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
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create a board</h1>
          <p className="text-muted-foreground mt-1">
            Start a new ranking list. Others can add to it and vote.
          </p>
        </div>

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
            <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="What is this list about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(val) => {
                  setCategory(val)
                  if (val !== CUSTOM_VALUE) setCustomCategory("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick one…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_VALUE}>
                    <span className="text-primary font-medium">+ Add a custom one</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Custom category input — shown only when "+ Add a custom one" is selected */}
              {isCustom && (
                <div className="flex flex-col gap-1 mt-1">
                  <Input
                    placeholder="e.g. Coworking Spaces"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    maxLength={60}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom categories are reviewed by our team before going live.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">City / Area</Label>
              <Input
                id="location"
                placeholder="Bangalore"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading || title.trim().length < 3 || (isCustom && !customCategory.trim())}
            size="lg"
          >
            {loading ? "Creating…" : "Create board →"}
          </Button>
        </form>
      </div>
    </main>
  )
}
