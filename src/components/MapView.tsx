import { useEffect, useRef, useState } from 'react'

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
  const leafletRef = useRef<any>(null)
  const layersRef = useRef<any[]>([])
  const onSelectPlaceRef = useRef(onSelectPlace)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace
  }, [onSelectPlace])

  useEffect(() => {
    let cancelled = false

    async function initializeMap() {
      if (typeof window === 'undefined') {
        return
      }

      if (!mapContainerRef.current) {
        return
      }

      try {
        const leafletModule = await import('leaflet')
        const L = leafletModule.default ?? leafletModule

        if (cancelled || !mapContainerRef.current) {
          return
        }

        leafletRef.current = L

        if (!document.querySelector('link[data-roamer-leaflet]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          link.setAttribute('data-roamer-leaflet', 'true')
          document.head.appendChild(link)
        }

        const center = from ?? to ?? {
          lat: 20,
          lng: 0,
        }

        const map = L.map(mapContainerRef.current, {
          center: [center.lat, center.lng],
          zoom: from && to ? 11 : 2,
        })

        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        ).addTo(map)

        mapRef.current = map

        if (!cancelled) {
          setMapReady(true)
        }
      } catch (error) {
        console.error('Failed to initialize Leaflet map:', error)
      }
    }

    initializeMap()

    return () => {
      cancelled = true

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapReady) {
      return
    }

    const L = leafletRef.current
    const map = mapRef.current

    if (!L || !map) {
      return
    }

    layersRef.current.forEach((layer) => {
      map.removeLayer(layer)
    })

    layersRef.current = []

    const markerIcon = L.icon({
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
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
      const startMarker = L.marker(
        [from.lat, from.lng],
        {
          icon: markerIcon,
        },
      )

      startMarker.bindPopup('Start')
      startMarker.addTo(map)
      layersRef.current.push(startMarker)
    }

    if (to) {
      const destinationMarker = L.marker(
        [to.lat, to.lng],
        {
          icon: markerIcon,
        },
      )

      destinationMarker.bindPopup('Destination')
      destinationMarker.addTo(map)
      layersRef.current.push(destinationMarker)
    }

    places.forEach((place) => {
      const placeMarker = L.marker(
        [place.lat, place.lng],
        {
          icon: markerIcon,
          opacity:
            selectedPlaceId === place.id ? 1 : 0.85,
        },
      )

      placeMarker.bindPopup(place.name)

      placeMarker.on('click', () => {
        onSelectPlaceRef.current(place)
      })

      placeMarker.addTo(map)
      layersRef.current.push(placeMarker)
    })

    if (from) {
      map.setView(
        [from.lat, from.lng],
        from && to ? 11 : 11,
      )
    } else if (to) {
      map.setView([to.lat, to.lng], 11)
    } else {
      map.setView([20, 0], 2)
    }
  }, [
    mapReady,
    from,
    to,
    routeLine,
    places,
    selectedPlaceId,
  ])

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full rounded-2xl"
      style={{ minHeight: '100%' }}
    />
  )
}