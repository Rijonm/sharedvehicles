"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayerGroup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MobilityVehicle } from "@/types/mobility"
import { Button } from "@/components/ui/button"

// Instead, use this approach for the default icon:
const defaultIcon = new L.Icon({
  iconUrl: "/default-marker.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Custom icons for different vehicle types
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

// Component to update map center and zoom when props change
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
  const prevCenter = useRef<[number, number]>(center)
  const prevVehicles = useRef<number>(vehicles.length)
  const prevRadius = useRef<number>(searchRadius)

  useEffect(() => {
    // Only update if the center has actually changed
    if (prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1]) {
      prevCenter.current = center
      map.setView(center, getZoomLevel(searchRadius))
    }

    // If radius changed, adjust zoom level
    if (prevRadius.current !== searchRadius) {
      prevRadius.current = searchRadius
      map.setView(center, getZoomLevel(searchRadius))
    }

    // If vehicles changed and we have vehicles, fit bounds
    if (prevVehicles.current !== vehicles.length && vehicles.length > 0) {
      prevVehicles.current = vehicles.length

      // Create bounds from all vehicle positions
      const bounds = new L.LatLngBounds([])

      // Add center point to bounds
      bounds.extend(center)

      // Add all vehicle positions to bounds
      vehicles.forEach((vehicle) => {
        const coords = vehicle.geometry.coordinates
        bounds.extend([coords[1], coords[0]])
      })

      // Only fit bounds if we have a valid bounds object
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: getZoomLevel(searchRadius), // Don't zoom in too far
        })
      }
    }
  }, [center, map, vehicles, searchRadius])

  // Calculate appropriate zoom level based on radius
  function getZoomLevel(radius: number): number {
    if (radius <= 1000) return 15 // 1km or less
    if (radius <= 2000) return 14 // 2km
    if (radius <= 5000) return 13 // 5km
    if (radius <= 10000) return 12 // 10km
    if (radius <= 20000) return 11 // 20km
    if (radius <= 50000) return 9 // 50km
    return 8 // More than 50km
  }

  return null
}

interface MapProps {
  center: [number, number]
  vehicles: MobilityVehicle[]
  onVehicleSelect: (vehicle: MobilityVehicle) => void
  searchRadius: number
  showRadius?: boolean
}

export default function Map({ center, vehicles, onVehicleSelect, searchRadius, showRadius = true }: MapProps) {
  // Get appropriate icon based on vehicle type
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

  // Calculate initial zoom based on search radius
  const getInitialZoom = (radius: number): number => {
    if (radius <= 1000) return 15 // 1km or less
    if (radius <= 2000) return 14 // 2km
    if (radius <= 5000) return 13 // 5km
    if (radius <= 10000) return 12 // 10km
    if (radius <= 20000) return 11 // 20km
    if (radius <= 50000) return 9 // 50km
    return 8 // More than 50km
  }

  const initialZoom = getInitialZoom(searchRadius)

  return (
    <MapContainer center={center} zoom={initialZoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController center={center} vehicles={vehicles} searchRadius={searchRadius} />

      {/* Show search radius circle */}
      {showRadius && (
        <Circle
          center={center}
          radius={searchRadius}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f680",
            fillOpacity: 0.1,
            weight: 1,
          }}
        />
      )}

      <LayerGroup>
        {vehicles.map((vehicle) => {
          const coords = vehicle.geometry.coordinates
          return (
            <Marker
              key={vehicle.id}
              position={[coords[1], coords[0]]} // [lat, lng]
              icon={getVehicleIcon(vehicle.properties.vehicle_type)}
            >
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
