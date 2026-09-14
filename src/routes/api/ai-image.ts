import { createFileRoute } from '@tanstack/react-router'
import { GoogleGenAI } from '@google/genai'
import { db } from '../../../db/index.js'
import { aiImages, places } from '../../../db/schema.js'
import { eq } from 'drizzle-orm'
import { aiImagesStore, base64ToBytes } from '../../lib/blobs.js'

export const Route = createFileRoute('/api/ai-image')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const placeId = Number(url.searchParams.get('placeId'))
        const userId = url.searchParams.get('userId')
        if (!placeId || !userId) {
          return Response.json(
            { error: 'Missing placeId or userId' },
            { status: 400 },
          )
        }
        const rows = await db
          .select()
          .from(aiImages)
          .where(eq(aiImages.placeId, placeId))
        return Response.json(rows.filter((r) => r.userId === userId))
      },

      POST: async ({ request }) => {
        const body = await request.json()
        const { placeId, userId, selfieBase64 } = body as {
          placeId: number
          userId: string
          selfieBase64: string
        }

        if (!placeId || !userId || !selfieBase64) {
          return Response.json({ error: 'Missing fields' }, { status: 400 })
        }

        const [place] = await db
          .select()
          .from(places)
          .where(eq(places.id, placeId))
        if (!place) {
          return Response.json({ error: 'Place not found' }, { status: 404 })
        }

        const ai = new GoogleGenAI({})
        const cleanBase64 = selfieBase64.includes(',')
          ? selfieBase64.split(',')[1]
          : selfieBase64

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
                {
                  text: `Take the person in this photo and place them into an intricate, photorealistic travel photograph at "${place.name}" (a ${place.category} landmark). Keep their face and likeness recognizable, blend lighting and perspective naturally, and make the scene richly detailed as if shot on a professional camera during a real visit.`,
                },
              ],
            },
          ],
        })

        const parts = response.candidates?.[0]?.content?.parts ?? []
        const imagePart = parts.find((p) => p.inlineData?.data)
        if (!imagePart?.inlineData?.data) {
          return Response.json(
            { error: 'Image generation did not return an image' },
            { status: 502 },
          )
        }

        const mimeType = imagePart.inlineData.mimeType ?? 'image/png'
        const blobKey = `${userId}/${placeId}/${Date.now()}.png`
        await aiImagesStore().set(
          blobKey,
          base64ToBytes(imagePart.inlineData.data),
          { metadata: { contentType: mimeType } },
        )

        const [inserted] = await db
          .insert(aiImages)
          .values({ placeId, userId, blobKey })
          .returning()

        return Response.json(inserted, { status: 201 })
      },
    },
  },
})
