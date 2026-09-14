import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/route')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)

          const from = url.searchParams.get('from')
          const to = url.searchParams.get('to')

          if (!from || !to) {
            return Response.json(
              { error: 'Missing from/to parameters' },
              { status: 400 },
            )
          }

          const [fromLat, fromLng] = from.split(',').map(Number)
          const [toLat, toLng] = to.split(',').map(Number)

          if (
            !Number.isFinite(fromLat) ||
            !Number.isFinite(fromLng) ||
            !Number.isFinite(toLat) ||
            !Number.isFinite(toLng)
          ) {
            return Response.json(
              { error: 'Invalid coordinates' },
              { status: 400 },
            )
          }

          const osrmUrl =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?overview=full&geometries=geojson`

          const response = await fetch(osrmUrl)

          if (!response.ok) {
            return Response.json(
              {
                error: `OSRM request failed: ${response.status}`,
              },
              { status: 502 },
            )
          }

          const data = await response.json()

          const route = data.routes?.[0]

          if (!route) {
            return Response.json(
              { error: 'No route found' },
              { status: 404 },
            )
          }

          return Response.json({
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            geometry: route.geometry,
          })
        } catch (error) {
          console.error('Route API error:', error)

          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal route error',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})