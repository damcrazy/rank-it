export type MapPoint = {
  lat: number
  lng: number
}

function orientation(a: MapPoint, b: MapPoint, c: MapPoint) {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)
}

function onSegment(a: MapPoint, b: MapPoint, c: MapPoint) {
  return (
    Math.min(a.lng, c.lng) <= b.lng &&
    b.lng <= Math.max(a.lng, c.lng) &&
    Math.min(a.lat, c.lat) <= b.lat &&
    b.lat <= Math.max(a.lat, c.lat)
  )
}

function segmentsIntersect(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint) {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)

  if (o1 === 0 && onSegment(a, c, b)) return true
  if (o2 === 0 && onSegment(a, d, b)) return true
  if (o3 === 0 && onSegment(c, a, d)) return true
  if (o4 === 0 && onSegment(c, b, d)) return true

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)
}

function estimateFenceSpanKm(points: MapPoint[]) {
  if (points.length < 2) return 0

  let minLat = points[0]?.lat ?? 0
  let maxLat = minLat
  let minLng = points[0]?.lng ?? 0
  let maxLng = minLng

  for (const point of points) {
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)
  }

  const latKm = (maxLat - minLat) * 111
  const lngKm = (maxLng - minLng) * 111 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  return Math.sqrt(latKm * latKm + lngKm * lngKm)
}

export function getAreaFenceIssue(points: MapPoint[]) {
  if (points.length === 0) return null
  if (points.length < 3) {
    return "Fence started, but the area is still missing a point. Give it at least 3."
  }

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!a || !b) continue

    for (let j = i + 1; j < points.length; j += 1) {
      const c = points[j]
      const d = points[(j + 1) % points.length]
      if (!c || !d) continue

      const sharesEndpoint =
        i === j ||
        (i + 1) % points.length === j ||
        i === (j + 1) % points.length

      if (sharesEndpoint) continue

      if (segmentsIntersect(a, b, c, d)) {
        return "Fence gremlin alert: the shape is crossing over itself. Clean up the loops."
      }
    }
  }

  const spanKm = estimateFenceSpanKm(points)
  if (spanKm > 1200) {
    return "This fence is going full world-tour. Zoom in and keep the board area tighter."
  }

  return null
}
