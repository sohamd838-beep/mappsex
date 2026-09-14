import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const markerIcon = new L.Icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

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
  const center = from ?? to ?? { lat: 20, lng: 0 }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={from && to ? 11 : 2}
      className="h-full w-full rounded-2xl"
      key={`${from?.lat}-${to?.lat}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeLine.length > 0 && (
        <Polyline positions={routeLine} color="#7c3aed" weight={5} opacity={0.8} />
      )}
      {from && (
        <Marker position={[from.lat, from.lng]} icon={markerIcon}>
          <Popup>Start</Popup>
        </Marker>
      )}
      {to && (
        <Marker position={[to.lat, to.lng]} icon={markerIcon}>
          <Popup>Destination</Popup>
        </Marker>
      )}
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={markerIcon}
          eventHandlers={{ click: () => onSelectPlace(place) }}
          opacity={selectedPlaceId === place.id ? 1 : 0.85}
        >
          <Popup>{place.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
