"use client"

import { useEffect, useMemo, useState } from "react"
import { CircleMarker, MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"

export type MapPoint = {
  lat: number
  lng: number
}

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
  areaPoints?: MapPoint[]
  onAreaPointsChange?: (points: MapPoint[]) => void
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
  onFencePointAdd,
}: {
  onPick?: (lat: number, lng: number) => void
  onFencePointAdd?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(event) {
      if (onFencePointAdd) {
        onFencePointAdd(event.latlng.lat, event.latlng.lng)
        return
      }
      onPick?.(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function RecenterMap({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom, { animate: true })
  }, [center, map, zoom])

  return null
}

function MapZoomControls() {
  const map = useMap()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        map.zoomIn()
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        map.zoomOut()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [map])

  return (
    null
  )
}

export function MapLocationPicker({
  value,
  onChange,
  areaPoints = [],
  onAreaPointsChange,
  label = "Board location",
  placeholder = "Search a place or click on the map",
  helperText = "Optional. Pick a point on the map so people can discover this board by place.",
  mapHeightClassName = "h-[320px]",
}: Props) {
  const [query, setQuery] = useState(value.label)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [searchEmpty, setSearchEmpty] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    value.lat != null && value.lng != null ? [value.lat, value.lng] : DEFAULT_CENTER
  )
  const [mapZoom, setMapZoom] = useState(5)

  const center = useMemo<[number, number]>(() => mapCenter, [mapCenter])

  const polygonPositions = useMemo<[number, number][]>(
    () => areaPoints.map((point) => [point.lat, point.lng]),
    [areaPoints]
  )

  function addFencePoint(lat: number, lng: number) {
    if (!onAreaPointsChange) return
    onAreaPointsChange([...areaPoints, { lat, lng }])
  }

  function removeLastFencePoint() {
    if (!onAreaPointsChange) return
    onAreaPointsChange(areaPoints.slice(0, -1))
  }

  function clearFence() {
    if (!onAreaPointsChange) return
    onAreaPointsChange([])
  }

  async function searchPlaces() {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setSearchEmpty(false)
      return
    }

    setSearching(true)
    setSearchEmpty(false)
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
    setSearchEmpty(data.length === 0)
  }

  async function setPickedLocation(lat: number, lng: number, fallbackLabel?: string) {
    setResolving(true)
    const resolved = await reverseLookup(lat, lng)
    setResolving(false)
    const label = resolved ?? fallbackLabel ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    setQuery(label)
    setResults([])
    setSearchEmpty(false)
    setMapCenter([lat, lng])
    setMapZoom(13)

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

      {onAreaPointsChange && (
        <div className="flex flex-col gap-3 border-2 border-black bg-[#fff3cb] p-4 shadow-[4px_4px_0_#111]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#f55bb0] text-black">Area fence</Badge>
            <Badge className="bg-white text-black">{areaPoints.length} {areaPoints.length === 1 ? "point" : "points"}</Badge>
            {areaPoints.length >= 3 && <Badge className="bg-[#25dbe0] text-black">closed shape ready</Badge>}
          </div>
          <p className="text-sm font-medium text-black/75">
            Search a place to frame the map, then click the map to draw the board area. A valid fence needs at least 3 points.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={removeLastFencePoint}
              disabled={areaPoints.length === 0}
              className="bg-white text-black disabled:opacity-50"
            >
              Undo last point
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearFence}
              disabled={areaPoints.length === 0}
              className="bg-white text-black disabled:opacity-50"
            >
              Clear fence
            </Button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => {
                setQuery(result.display_name)
                setResults([])
                setSearchEmpty(false)
                setMapCenter([Number(result.lat), Number(result.lon)])
                setMapZoom(13)
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

      {searchEmpty && (
        <div className="border-2 border-black bg-[#f55bb0] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0_#111]">
          Search gremlin found nothing. Try a nearby landmark, area, or a cleaner place name.
        </div>
      )}

      <div className="overflow-hidden border-4 border-black shadow-[6px_6px_0_#111]">
        <MapContainer center={center} zoom={mapZoom} className={`${mapHeightClassName} relative w-full`}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} zoom={mapZoom} />
          <MapZoomControls />
          <MapClickHandler
            onPick={onAreaPointsChange ? undefined : (lat, lng) => void setPickedLocation(lat, lng)}
            onFencePointAdd={onAreaPointsChange ? addFencePoint : undefined}
          />
          {value.lat != null && value.lng != null && (
            <Marker position={[value.lat, value.lng]} icon={markerIcon} />
          )}
          {polygonPositions.map((position, index) => (
            <CircleMarker
              key={`${position[0]}:${position[1]}:${index}`}
              center={position}
              radius={6}
              pathOptions={{ color: "#111", fillColor: "#25dbe0", fillOpacity: 1, weight: 3 }}
            />
          ))}
          {polygonPositions.length >= 2 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: "#111", fillColor: "#f55bb0", fillOpacity: 0.18, weight: 3 }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        {resolving
          ? "Resolving picked location..."
          : onAreaPointsChange && areaPoints.length > 0 && areaPoints.length < 3
            ? "Fence started. Add at least 3 points to make a real area."
          : onAreaPointsChange && areaPoints.length >= 3
            ? `Area fence ready with ${areaPoints.length} points.`
          : value.lat != null && value.lng != null
            ? `Picked location: ${value.label}`
            : `${helperText} Use + / - keys or the map buttons to zoom.`}
      </p>
    </div>
  )
}
