import { getStore } from '@netlify/blobs'

export function photosStore() {
  return getStore('roamer-photos')
}

export function aiImagesStore() {
  return getStore('roamer-ai-images')
}

export function base64ToBytes(base64: string) {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64
  return Buffer.from(clean, 'base64')
}
