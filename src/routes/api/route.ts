import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/route')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const from = url.searchParams.get('from')
        const to = url.searchParams.get('to')
        if (!from || !to) {
          return Response.json(
            { error: 'Missing from/to (lat,lng)' },
            { status: 400 },
          )
        }
        const [fromLat, fromLng] = from.split(',').map(Number)
        const [toLat, toLng] = to.split(',').map(Number)

        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
        )
        if (!res.ok) {
          return Response.json({ error: 'Routing failed' }, { status: 502 })
        }
        const data = await res.json()
        const route = data.routes?.[0]
        if (!route) {
          return Response.json({ error: 'No route found' }, { status: 404 })
        }

        return Response.json({
          distanceMeters: route.distance,
          durationSeconds: route.duration,
          geometry: route.geometry as {
            type: 'LineString'
            coordinates: Array<[number, number]>
          },
        })
      },
    },
  },
})
