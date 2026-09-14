import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db/index.js'
import { reels } from '../../../db/schema.js'
import { eq } from 'drizzle-orm'

export const Route = createFileRoute('/api/reels')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const placeId = Number(url.searchParams.get('placeId'))
        if (!placeId) {
          return Response.json({ error: 'Missing placeId' }, { status: 400 })
        }
        const rows = await db
          .select()
          .from(reels)
          .where(eq(reels.placeId, placeId))
        return Response.json(rows)
      },

      POST: async ({ request }) => {
        const body = await request.json()
        const { placeId, url: reelUrl, title } = body as {
          placeId: number
          url: string
          title?: string
        }
        if (!placeId || !reelUrl) {
          return Response.json(
            { error: 'Missing placeId or url' },
            { status: 400 },
          )
        }
        const [inserted] = await db
          .insert(reels)
          .values({ placeId, url: reelUrl, title: title ?? '' })
          .returning()
        return Response.json(inserted, { status: 201 })
      },
    },
  },
})
