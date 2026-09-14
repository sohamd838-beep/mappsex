import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { checkins, places } from '../../../db/schema.js'
import { eq, desc } from 'drizzle-orm'

export const Route = createFileRoute('/api/points')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const userId = url.searchParams.get('userId')
        if (!userId) {
          return Response.json({ error: 'Missing userId' }, { status: 400 })
        }

        const rows = await db
          .select({
            id: checkins.id,
            points: checkins.points,
            createdAt: checkins.createdAt,
            photoBlobKey: checkins.photoBlobKey,
            placeName: places.name,
            placeId: places.id,
          })
          .from(checkins)
          .innerJoin(places, eq(checkins.placeId, places.id))
          .where(eq(checkins.userId, userId))
          .orderBy(desc(checkins.createdAt))

        const total = rows.reduce((sum, r) => sum + r.points, 0)

        return Response.json({ total, checkins: rows })
      },
    },
  },
})
