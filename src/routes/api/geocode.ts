import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/geocode')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q')
        if (!q) return Response.json({ error: 'Missing q' }, { status: 400 })

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { 'User-Agent': 'roamer-app/1.0' } },
        )
        if (!res.ok) {
          return Response.json({ error: 'Geocoding failed' }, { status: 502 })
        }
        const data = (await res.json()) as Array<{
          display_name: string
          lat: string
          lon: string
        }>

        return Response.json(
          data.map((d) => ({
            name: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          })),
        )
      },
    },
  },
})
