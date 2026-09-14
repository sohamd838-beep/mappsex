import { createFileRoute } from '@tanstack/react-router'
import { photosStore, aiImagesStore } from '../../lib/blobs.js'

export const Route = createFileRoute('/api/blob')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const store = url.searchParams.get('store')
        const key = url.searchParams.get('key')
        if (!store || !key) {
          return Response.json(
            { error: 'Missing store or key' },
            { status: 400 },
          )
        }

        const blobStore = store === 'ai' ? aiImagesStore() : photosStore()
        const entry = await blobStore.getWithMetadata(key, {
          type: 'arrayBuffer',
        })
        if (!entry) {
          return new Response('Not found', { status: 404 })
        }

        const contentType =
          (entry.metadata?.contentType as string) ?? 'image/jpeg'

        return new Response(entry.data, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
