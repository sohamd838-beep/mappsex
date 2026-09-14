import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { places } from '../../../db/schema.js'
import { eq } from 'drizzle-orm'

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export const Route = createFileRoute('/api/places')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const pointsParam = url.searchParams.get('points')
        if (!pointsParam) {
          return Response.json({ error: 'Missing points' }, { status: 400 })
        }
        const waypoints = pointsParam
          .split('|')
          .map((p) => p.split(',').map(Number) as [number, number])
          .filter((p) => p.length === 2 && !p.some(Number.isNaN))

        if (waypoints.length === 0) {
          return Response.json({ error: 'No valid points' }, { status: 400 })
        }

        const radius = 4000
        const around = waypoints
          .map(([lat, lng]) => `node(around:${radius},${lat},${lng})["tourism"];`)
          .join('\n')

        const query = `[out:json][timeout:20];(${around});out center 40;`

        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })

        if (!res.ok) {
          return Response.json(
            { error: 'Places lookup failed' },
            { status: 502 },
          )
        }

        const data = (await res.json()) as { elements: OverpassElement[] }

        const seen = new Map<
          string,
          { osmId: string; name: string; category: string; lat: number; lng: number }
        >()

        for (const el of data.elements) {
          const name = el.tags?.name
          if (!name) continue
          const lat = el.lat ?? el.center?.lat
          const lng = el.lon ?? el.center?.lon
          if (lat === undefined || lng === undefined) continue
          const osmId = `node/${el.id}`
          if (seen.has(osmId)) continue
          seen.set(osmId, {
            osmId,
            name,
            category: el.tags?.tourism ?? 'attraction',
            lat,
            lng,
          })
        }

        const found = Array.from(seen.values()).slice(0, 30)

        const result = []
        for (const place of found) {
          const [existing] = await db
            .select()
            .from(places)
            .where(eq(places.osmId, place.osmId))
          if (existing) {
            result.push(existing)
          } else {
            const [inserted] = await db
              .insert(places)
              .values(place)
              .returning()
            result.push(inserted)
          }
        }

        return Response.json(result)
      },
    },
  },
})
