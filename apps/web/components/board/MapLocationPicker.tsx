"use client"

import { useMemo, useState } from "react"
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

type LocationValue = {
  label: string
  lat: number | null
  lng: number | null
}

type SearchResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

type Props = {
  value: LocationValue
  onChange: (value: LocationValue) => void
  label?: string
  placeholder?: string
  helperText?: string
  mapHeightClassName?: string
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]

const markerIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border:3px solid #111;background:#f55bb0;box-shadow:3px 3px 0 #111;"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

async function reverseLookup(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lon", String(lng))

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.display_name as string | undefined
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

export function MapLocationPicker({
  value,
  onChange,
  label = "Board location",
  placeholder = "Search a place or click on the map",
  helperText = "Optional. Pick a point on the map so people can discover this board by place.",
  mapHeightClassName = "h-[320px]",
}: Props) {
  const [query, setQuery] = useState(value.label)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)

  const center = useMemo<[number, number]>(() => {
    if (value.lat != null && value.lng != null) return [value.lat, value.lng]
    return DEFAULT_CENTER
  }, [value.lat, value.lng])

  async function searchPlaces() {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    setSearching(true)
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("format", "jsonv2")
    url.searchParams.set("q", trimmed)
    url.searchParams.set("limit", "5")

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    })

    setSearching(false)
    if (!res.ok) return
    const data = (await res.json()) as SearchResult[]
    setResults(data)
  }

  async function setPickedLocation(lat: number, lng: number, fallbackLabel?: string) {
    setResolving(true)
    const resolved = await reverseLookup(lat, lng)
    setResolving(false)
    const label = resolved ?? fallbackLabel ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    setQuery(label)
    setResults([])

    onChange({
      label,
      lat,
      lng,
    })
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void setPickedLocation(position.coords.latitude, position.coords.longitude, "Current location")
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="location-search">{label}</Label>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Input
            id="location-search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-sans normal-case tracking-normal"
          />
          <Button type="button" onClick={searchPlaces} className="bg-[#ffe16a] text-black">
            {searching ? "Searching..." : "Search"}
          </Button>
          <Button type="button" onClick={useCurrentLocation} className="bg-white text-black">
            Use My Location
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => {
                setQuery(result.display_name)
                setResults([])
                onChange({
                  label: result.display_name,
                  lat: Number(result.lat),
                  lng: Number(result.lon),
                })
              }}
              className="border-2 border-black bg-white px-4 py-3 text-left text-sm font-medium text-black shadow-[3px_3px_0_#111]"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden border-4 border-black shadow-[6px_6px_0_#111]">
        <MapContainer center={center} zoom={value.lat != null ? 13 : 5} className={`${mapHeightClassName} w-full`}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={(lat, lng) => void setPickedLocation(lat, lng)} />
          {value.lat != null && value.lng != null && (
            <Marker position={[value.lat, value.lng]} icon={markerIcon} />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        {resolving
          ? "Resolving picked location..."
          : value.lat != null && value.lng != null
            ? `Picked location: ${value.label}`
            : helperText}
      </p>
    </div>
  )
}
