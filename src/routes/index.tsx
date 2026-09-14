import { useEffect, useRef } from 'react'
import type { Place } from './MapView'

export interface Place {
  id: number
  name: string
  category: string
  lat: number
  lng: number
}

interface MapViewProps {
  from: { lat: number; lng: number } | null
  to: { lat: number; lng: number } | null
  routeLine: Array<[number, number]>
  places: Array<Place>
  selectedPlaceId: number | null
  onSelectPlace: (place: Place) => void
}

declare global {
  interface Window {
    L?: any
  }
}

export function MapView({
  from,
  to,
  routeLine,
  places,
  selectedPlaceId,
  onSelectPlace,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const layersRef = useRef<any[]>([])
  const onSelectPlaceRef = useRef(onSelectPlace)

  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace
  }, [onSelectPlace])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let cancelled = false

    async function loadLeaflet() {
      if (!window.L) {
        if (!document.querySelector('link[data-roamer-leaflet]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          link.setAttribute('data-roamer-leaflet', 'true')
          document.head.appendChild(link)
        }

        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(
            'script[data-roamer-leaflet]',
          )

          if (existing) {
            existing.addEventListener('load', () => resolve(), {
              once: true,
            })
            existing.addEventListener('error', () => reject(), {
              once: true,
            })
            return
          }

          const script = document.createElement('script')
          script.src =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.async = true
          script.setAttribute('data-roamer-leaflet', 'true')

          script.onload = () => resolve()
          script.onerror = () => reject()

          document.body.appendChild(script)
        })
      }

      if (cancelled || !mapContainerRef.current || !window.L) {
        return
      }

      const L = window.L

      if (!mapRef.current) {
        const center = from ?? to ?? {
          lat: 20,
          lng: 0,
        }

        mapRef.current = L.map(mapContainerRef.current).setView(
          [center.lat, center.lng],
          from && to ? 11 : 2,
        )

        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        ).addTo(mapRef.current)
      }
    }

    loadLeaflet().catch(() => {
      if (!cancelled) {
        console.error('Failed to load Leaflet')
      }
    })

    return () => {
      cancelled = true
    }
  }, [from, to])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!window.L || !mapRef.current) {
      return
    }

    const L = window.L
    const map = mapRef.current

    layersRef.current.forEach((layer) => {
      map.removeLayer(layer)
    })

    layersRef.current = []

    const markerIcon = new L.Icon({
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    })

    if (routeLine.length > 0) {
      const route = L.polyline(routeLine, {
        color: '#7c3aed',
        weight: 5,
        opacity: 0.8,
      })

      route.addTo(map)
      layersRef.current.push(route)
    }

    if (from) {
      const marker = L.marker(
        [from.lat, from.lng],
        {
          icon: markerIcon,
        },
      )

      marker.bindPopup('Start')
      marker.addTo(map)
      layersRef.current.push(marker)
    }

    if (to) {
      const marker = L.marker(
        [to.lat, to.lng],
        {
          icon: markerIcon,
        },
      )

      marker.bindPopup('Destination')
      marker.addTo(map)
      layersRef.current.push(marker)
    }

    places.forEach((place) => {
      const marker = L.marker(
        [place.lat, place.lng],
        {
          icon: markerIcon,
          opacity:
            selectedPlaceId === place.id ? 1 : 0.85,
        },
      )

      marker.bindPopup(place.name)

      marker.on('click', () => {
        onSelectPlaceRef.current(place)
      })

      marker.addTo(map)
      layersRef.current.push(marker)
    })

    if (from && to) {
      map.setView([from.lat, from.lng], 11)
    } else if (from) {
      map.setView([from.lat, from.lng], 11)
    } else if (to) {
      map.setView([to.lat, to.lng], 11)
    }
  }, [
    from,
    to,
    routeLine,
    places,
    selectedPlaceId,
  ])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full rounded-2xl"
      style={{ minHeight: '100%' }}
    />
  )
}