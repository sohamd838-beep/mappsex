import { useState } from 'react'
import { Camera, Film, MapPin, Plus, Sparkles, Loader2 } from 'lucide-react'
import type { Place } from './MapView'
import { getUserId } from '../lib/user'

interface Reel {
  id: number
  url: string
  title: string
}

interface AiImage {
  id: number
  blobKey: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function toEmbedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return null
}

export function PlaceCard({
  place,
  onPointsEarned,
}: {
  place: Place
  onPointsEarned: (points: number) => void
}) {
  const [reels, setReels] = useState<Reel[] | null>(null)
  const [reelUrl, setReelUrl] = useState('')
  const [loadingReels, setLoadingReels] = useState(false)

  const [aiImages, setAiImages] = useState<AiImage[]>([])
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const [checkingIn, setCheckingIn] = useState(false)
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null)

  async function loadReels() {
    if (reels) return
    setLoadingReels(true)
    const res = await fetch(`/api/reels?placeId=${place.id}`)
    setReels(await res.json())
    setLoadingReels(false)
  }

  async function addReel() {
    if (!reelUrl.trim()) return
    const res = await fetch('/api/reels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: place.id, url: reelUrl.trim() }),
    })
    const created = await res.json()
    setReels((prev) => [...(prev ?? []), created])
    setReelUrl('')
  }

  async function generateAiImage(file: File) {
    setGenerating(true)
    setAiError(null)
    try {
      const base64 = await fileToBase64(file)
      localStorage.setItem('roamer_selfie', base64)
      const res = await fetch('/api/ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.id,
          userId: getUserId(),
          selfieBase64: base64,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Generation failed')
      }
      const created = await res.json()
      setAiImages((prev) => [created, ...prev])
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function checkIn(file: File) {
    setCheckingIn(true)
    setCheckinMessage(null)
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          }),
      )
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.id,
          userId: getUserId(),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          photoBase64: base64,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckinMessage(data.error ?? 'Check-in failed')
        return
      }
      setCheckinMessage(`+${data.points} points earned at ${place.name}!`)
      onPointsEarned(data.points)
    } catch {
      setCheckinMessage(
        'Could not get your location. Enable location access and try again.',
      )
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{place.name}</h3>
            <p className="text-xs uppercase tracking-wide text-violet-500">
              {place.category}
            </p>
          </div>
        </div>
      </div>

      {/* Reels */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <button
          onClick={loadReels}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-violet-700"
        >
          <Film className="h-4 w-4" /> Reels
          {loadingReels && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </button>

        {reels && (
          <div className="mt-2 space-y-2">
            {reels.length === 0 && (
              <p className="text-xs text-gray-400">
                No reels yet. Be the first to add one.
              </p>
            )}
            {reels.map((r) => {
              const embed = toEmbedUrl(r.url)
              return embed ? (
                <iframe
                  key={r.id}
                  src={embed}
                  className="aspect-video w-full rounded-lg"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-violet-600 underline"
                >
                  {r.url}
                </a>
              )
            })}
            <div className="flex gap-1.5">
              <input
                value={reelUrl}
                onChange={(e) => setReelUrl(e.target.value)}
                placeholder="Paste a video link"
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs"
              />
              <button
                onClick={addReel}
                className="rounded-lg bg-violet-600 px-2 py-1 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI image */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-violet-700">
          <Sparkles className="h-4 w-4" />
          {generating ? 'Generating your AI photo…' : 'Put me in this photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={generating}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void generateAiImage(file)
              e.target.value = ''
            }}
          />
          {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </label>
        {aiError && <p className="mt-1 text-xs text-red-500">{aiError}</p>}
        {aiImages.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {aiImages.map((img) => (
              <img
                key={img.id}
                src={`/api/blob?store=ai&key=${encodeURIComponent(img.blobKey)}`}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Check-in */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800">
          <Camera className="h-4 w-4" />
          {checkingIn ? 'Checking in…' : 'Check in for points'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={checkingIn}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void checkIn(file)
              e.target.value = ''
            }}
          />
          {checkingIn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </label>
        {checkinMessage && (
          <p className="mt-1 text-xs text-gray-600">{checkinMessage}</p>
        )}
      </div>
    </div>
  )
}
