"use client"

import type React from "react"
import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayerGroup, CircleMarker } from "react-leaflet"
import L, { type LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MobilityVehicle } from "@/types/mobility"
import { Button } from "@/components/ui/button"

interface MapProps {
  center: [number, number]
  initialZoom: number
  vehicles: MobilityVehicle[]
  onVehicleSelect: (vehicle: MobilityVehicle) => void
  userLocation: [number, number] | null
  searchRadius: number
  showRadius: boolean // Diese Prop steuert die Anzeige des Radius
}

const defaultIcon = new L.Icon({
  iconUrl: "/default-marker.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const bikeIcon = new L.Icon({
  iconUrl: "/bike-marker.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const carIcon = new L.Icon({
  iconUrl: "/car-marker.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const scooterIcon = new L.Icon({
  iconUrl: "/scooter-marker.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

function MapController({
  center,
  vehicles,
  searchRadius,
}: {
  center: [number, number]
  vehicles: MobilityVehicle[]
  searchRadius: number
}) {
  const map = useMap()

  useEffect(() => {
    const zoomForRadius = (radius: number): number => {
      if (radius <= 250) return 17
      if (radius <= 500) return 16
      if (radius <= 1000) return 15
      if (radius <= 2000) return 14
      if (radius <= 5000) return 13
      return 12
    }
    const maxZoomForFit = 18

    const leafletCenter: LatLngExpression = [center[0], center[1]]

    if (vehicles.length > 0) {
      const bounds = new L.LatLngBounds()
      bounds.extend(leafletCenter)

      vehicles.forEach((vehicle) => {
        const coords = vehicle.geometry.coordinates
        const vehicleLatLng: LatLngExpression = [coords[1], coords[0]]
        bounds.extend(vehicleLatLng)
      })

      if (bounds.isValid()) {
        const southWest = bounds.getSouthWest()
        const northEast = bounds.getNorthEast()
        const isEffectivelyPoint = southWest.distanceTo(northEast) < 10

        if (isEffectivelyPoint && vehicles.length <= 1) {
          map.setView(leafletCenter, zoomForRadius(searchRadius))
        } else {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: maxZoomForFit })
        }
      } else {
        map.setView(leafletCenter, zoomForRadius(searchRadius))
      }
    } else {
      map.setView(leafletCenter, zoomForRadius(searchRadius))
    }
  }, [center, vehicles, searchRadius, map])

  return null
}

const getVehicleIcon = (vehicleType: string) => {
  switch (vehicleType?.toLowerCase()) {
    case "bicycle":
    case "bike":
    case "e-bike":
      return bikeIcon
    case "car":
      return carIcon
    case "scooter":
    case "e-scooter":
    case "moped":
      return scooterIcon
    default:
      return defaultIcon
  }
}

const Map: React.FC<MapProps> = ({
  center,
  initialZoom,
  vehicles,
  onVehicleSelect,
  userLocation,
  searchRadius,
  showRadius, // Prop wird hier empfangen
}) => {
  const blueDotOptions = {
    color: "#3b82f6",
    fillColor: "#3b82f6",
    fillOpacity: 1,
  }

  const leafletCenter: LatLngExpression = [center[0], center[1]]
  const userLeafletLocation: LatLngExpression | null = userLocation ? [userLocation[0], userLocation[1]] : null

  return (
    <MapContainer
      center={leafletCenter}
      zoom={initialZoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController center={center} vehicles={vehicles} searchRadius={searchRadius} />

      {/* Dieser Block zeigt den Radius an, wenn showRadius true ist */}
      {showRadius && (
        <Circle
          center={leafletCenter}
          radius={searchRadius}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f680",
            fillOpacity: 0.1,
            weight: 1,
          }}
        />
      )}

      {userLeafletLocation && (
        <CircleMarker center={userLeafletLocation} pathOptions={blueDotOptions} radius={8}>
          <Popup>Ihr aktueller Standort</Popup>
        </CircleMarker>
      )}

      <LayerGroup>
        {vehicles.map((vehicle) => {
          const coords = vehicle.geometry.coordinates
          const vehiclePosition: LatLngExpression = [coords[1], coords[0]]
          return (
            <Marker key={vehicle.id} position={vehiclePosition} icon={getVehicleIcon(vehicle.properties.vehicle_type)}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-semibold">{vehicle.properties.provider.name}</h3>
                  {vehicle.properties.station?.name && <p className="text-sm">{vehicle.properties.station.name}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{vehicle.properties.vehicle_type}</p>
                  <div className="mt-2">
                    <Button size="sm" onClick={() => onVehicleSelect(vehicle)} className="w-full">
                      Details anzeigen
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </LayerGroup>
    </MapContainer>
  )
}

export default Map
