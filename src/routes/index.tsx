import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Compass, Navigation, Trophy, Loader2 } from 'lucide-react'
import type { Place } from '../components/MapView'
import { PlaceCard } from '../components/PlaceCard'
import { getUserId } from '../lib/user'

const MapView = lazy(() =>
  import('../components/MapView').then((module) => ({
    default: module.MapView,
  })),
)

export const Route = createFileRoute('/')({
  component: Home,
})

interface GeoResult {
  name: string
  lat: number
  lng: number
}

async function readJsonResponse(
  response: Response,
  apiName: string,
) {
  const text = await response.text()

  console.log(`${apiName} status:`, response.status)
  console.log(
    `${apiName} content-type:`,
    response.headers.get('content-type'),
  )
  console.log(`${apiName} response:`, text)

  if (!response.ok) {
    let message = `${apiName} failed with status ${response.status}`

    try {
      const errorData = JSON.parse(text)
      if (errorData?.error) {
        message = errorData.error
      }
    } catch {
      // Response wasn't JSON, so keep the status-based error.
    }

    throw new Error(message)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `${apiName} returned non-JSON data: ${text.slice(0, 150)}`,
    )
  }
}

function LocationInput({
  label,
  value,
  onSelect,
}: {
  label: string
  value: GeoResult | null
  onSelect: (v: GeoResult) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query || (value && query === value.name)) {
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}`,
        )

        if (res.ok) {
          const data = await readJsonResponse(
            res,
            'Geocode API',
          )

          setResults(data)
        } else {
          setResults([])
        }
      } catch (error) {
        console.error('Geocode error:', error)
        setResults([])
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [query, value])

  return (
    <div className="relative flex-1">
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>

      <input
        value={value?.name ?? query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search a city or place…"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
      />

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-100 bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={`${r.lat}-${r.lng}`}
              type="button"
              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-violet-50"
              onClick={() => {
                onSelect(r)
                setQuery(r.name)
                setOpen(false)
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function sampleWaypoints(
  coords: Array<[number, number]>,
  count: number,
): Array<[number, number]> {
  if (coords.length === 0) {
    return []
  }

  const step = Math.max(
    1,
    Math.floor(coords.length / count),
  )

  const samples: Array<[number, number]> = []

  for (let i = 0; i < coords.length; i += step) {
    const [lng, lat] = coords[i]
    samples.push([lat, lng])
  }

  return samples
}

function Home() {
  const [from, setFrom] = useState<GeoResult | null>(null)
  const [to, setTo] = useState<GeoResult | null>(null)

  const [routeLine, setRouteLine] = useState<
    Array<[number, number]>
  >([])

  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number
    durationSeconds: number
  } | null>(null)

  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] =
    useState<Place | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    fetch(`/api/points?userId=${getUserId()}`)
      .then(async (response) => {
        if (!response.ok) {
          return null
        }

        return readJsonResponse(
          response,
          'Points API',
        )
      })
      .then((data) => {
        if (data) {
          setPoints(data.total ?? 0)
        }
      })
      .catch((error) => {
        console.error('Points API error:', error)
      })
  }, [])

  async function findRoute() {
    if (!from || !to) {
      setError('Please select both From and To locations.')
      return
    }

    setLoading(true)
    setError(null)
    setPlaces([])
    setSelectedPlace(null)
    setRouteLine([])
    setRouteInfo(null)

    try {
      console.log('Finding route...')
      console.log('From:', from)
      console.log('To:', to)

      const routeUrl =
        `/api/route?from=${from.lat},${from.lng}` +
        `&to=${to.lat},${to.lng}`

      console.log('Route API URL:', routeUrl)

      const res = await fetch(routeUrl)

      const data = await readJsonResponse(
        res,
        'Route API',
      )

      if (!data.geometry?.coordinates) {
        throw new Error(
          'Route API returned invalid route geometry.',
        )
      }

      setRouteInfo({
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
      })

      const line = data.geometry.coordinates.map(
        ([lng, lat]: [number, number]) =>
          [lat, lng] as [number, number],
      )

      setRouteLine(line)

      const waypoints = sampleWaypoints(
        data.geometry.coordinates,
        6,
      )

      const pointsParam = waypoints
        .map(
          ([lat, lng]) =>
            `${lat},${lng}`,
        )
        .join('|')

      console.log('Route waypoints:', pointsParam)

      if (pointsParam) {
        const placesRes = await fetch(
          `/api/places?points=${pointsParam}`,
        )

        try {
          const placesData =
            await readJsonResponse(
              placesRes,
              'Places API',
            )

          setPlaces(placesData)
        } catch (placesError) {
          console.error(
            'Places API error:',
            placesError,
          )

          // Route itself still works even if places fail.
          setPlaces([])
        }
      }
    } catch (e) {
      console.error('Find route error:', e)

      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong while finding the route.',
      )
    } finally {
      setLoading(false)
    }
  }

  const distanceKm = routeInfo
    ? (routeInfo.distanceMeters / 1000).toFixed(1)
    : null

  const durationMin = routeInfo
    ? Math.round(routeInfo.durationSeconds / 60)
    : null

  const fromLatLng = useMemo(
    () =>
      from
        ? {
            lat: from.lat,
            lng: from.lng,
          }
        : null,
    [from],
  )

  const toLatLng = useMemo(
    () =>
      to
        ? {
            lat: to.lat,
            lng: to.lng,
          }
        : null,
    [to],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-7 w-7 text-violet-600" />

            <h1 className="text-2xl font-bold text-gray-900">
              Roamer
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-amber-800">
            <Trophy className="h-4 w-4" />

            <span className="font-semibold">
              {points} pts
            </span>
          </div>
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <LocationInput
            label="From"
            value={from}
            onSelect={setFrom}
          />

          <LocationInput
            label="To"
            value={to}
            onSelect={setTo}
          />

          <button
            type="button"
            onClick={findRoute}
            disabled={!from || !to || loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}

            Find best route
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {routeInfo && (
          <p className="mb-4 text-sm text-gray-600">
            {distanceKm} km · about {durationMin} min
            drive · {places.length} places found along
            the way
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-[500px] overflow-hidden rounded-2xl border border-violet-100 shadow-sm lg:col-span-2 lg:h-[650px]">
            {mounted && (
              <Suspense
                fallback={
                  <div className="h-full w-full animate-pulse rounded-2xl bg-gray-100" />
                }
              >
                <MapView
                  from={fromLatLng}
                  to={toLatLng}
                  routeLine={routeLine}
                  places={places}
                  selectedPlaceId={
                    selectedPlace?.id ?? null
                  }
                  onSelectPlace={setSelectedPlace}
                />
              </Suspense>
            )}
          </div>

          <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
            {places.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                Search a route to discover places along
                the way — with reels, AI photos, and
                points for visiting.
              </p>
            )}

            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onPointsEarned={(p) =>
                  setPoints((prev) => prev + p)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}