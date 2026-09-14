import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { checkins, places } from '../../../db/schema.js'
import { eq } from 'drizzle-orm'
import { photosStore, base64ToBytes } from '../../lib/blobs.js'
import { haversineMeters } from '../../lib/geo.js'

const MAX_CHECKIN_DISTANCE_METERS = 500
const POINTS_PER_CHECKIN = 50

export const Route = createFileRoute('/api/checkin')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const { placeId, userId, lat, lng, photoBase64 } = body as {
          placeId: number
          userId: string
          lat: number
          lng: number
          photoBase64: string
        }

        if (!placeId || !userId || lat == null || lng == null || !photoBase64) {
          return Response.json({ error: 'Missing fields' }, { status: 400 })
        }

        const [place] = await db
          .select()
          .from(places)
          .where(eq(places.id, placeId))
        if (!place) {
          return Response.json({ error: 'Place not found' }, { status: 404 })
        }

        const distance = haversineMeters(lat, lng, place.lat, place.lng)
        if (distance > MAX_CHECKIN_DISTANCE_METERS) {
          return Response.json(
            {
              error: `Too far from ${place.name}. You're ${Math.round(distance)}m away, need to be within ${MAX_CHECKIN_DISTANCE_METERS}m.`,
            },
            { status: 403 },
          )
        }

        const blobKey = `${userId}/${placeId}/${Date.now()}.jpg`
        await photosStore().set(blobKey, base64ToBytes(photoBase64), {
          metadata: { contentType: 'image/jpeg' },
        })

        const [checkin] = await db
          .insert(checkins)
          .values({
            placeId,
            userId,
            photoBlobKey: blobKey,
            points: POINTS_PER_CHECKIN,
            lat,
            lng,
          })
          .returning()

        return Response.json(checkin, { status: 201 })
      },
    },
  },
})
