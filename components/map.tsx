"use client"

import type React from "react"
import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayerGroup, CircleMarker } from "react-leaflet"
import L, { type LatLngExpression, type PointExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MobilityVehicle } from "@/types/mobility"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bike, Car, CreditCard, ExternalLink, MapPin, Smartphone, Phone } from "lucide-react" // Users icon removed
import Link from "next/link"

interface MapProps {
  center: [number, number]
  initialZoom: number
  vehicles: MobilityVehicle[]
  onVehicleSelect: (vehicle: MobilityVehicle) => void
  userLocation: [number, number] | null
  searchRadius: number
  showRadius: boolean
}

// Leaflet Marker Icons
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

const providerPricing: Record<string, { unlockFee: string; perMinuteRate: string }> = {
  "Bolt Technology OÜ": { unlockFee: "0.50 CHF", perMinuteRate: "0.49 CHF" },
  "Voi Technology AB": { unlockFee: "1 CHF", perMinuteRate: "0.44 CHF" },
  "bird basel": { unlockFee: "1 CHF", perMinuteRate: "0.45 CHF" },
  "Lime City partners from Partners::RegionFeedMediator": { unlockFee: "1 CHF", perMinuteRate: "0.46 CHF" },
  Lime: { unlockFee: "1 CHF", perMinuteRate: "0.46 CHF" },
}

const getLeafletVehicleIcon = (vehicleType: string) => {
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

const getReactVehicleIcon = (vehicleType: string, className?: string) => {
  switch (vehicleType?.toLowerCase()) {
    case "bicycle":
    case "bike":
    case "e-bike":
      return <Bike className={className || "h-5 w-5"} />
    case "car":
      return <Car className={className || "h-5 w-5"} />
    case "scooter":
    case "e-scooter":
    case "moped":
      // Using Smartphone icon as a placeholder for scooters/mopeds if no specific icon is available
      // You might want to add a specific Scooter icon from lucide-react if one exists or use a generic one
      return <Smartphone className={className || "h-5 w-5"} />
    default:
      return null // Or a generic placeholder icon
  }
}

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

const LeafletMapComponent: React.FC<MapProps> = ({
  center,
  initialZoom,
  vehicles,
  onVehicleSelect,
  userLocation,
  searchRadius,
  showRadius,
}) => {
  const blueDotOptions = { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 1 }
  const leafletCenter: LatLngExpression = [center[0], center[1]]
  const userLeafletLocation: LatLngExpression | null = userLocation ? [userLocation[0], userLocation[1]] : null

  const autoPanPaddingValue: PointExpression = [10, 55]

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
      {showRadius && (
        <Circle
          center={leafletCenter}
          radius={searchRadius}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f680", fillOpacity: 0.1, weight: 1 }}
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
          const { properties } = vehicle
          const { provider, station, vehicle_type, available } = properties
          const pricing = providerPricing[provider.name] || providerPricing[provider.name.split(" ")[0]]
          const appStoreLink = provider.apps?.ios?.store_uri?.[0] || provider.apps?.android?.store_uri?.[0]

          return (
            <Marker
              key={vehicle.id}
              position={vehiclePosition}
              icon={getLeafletVehicleIcon(vehicle.properties.vehicle_type)}
            >
              <Popup minWidth={280} autoPanPaddingTopLeft={autoPanPaddingValue} autoPanPaddingBottomRight={[10, 10]}>
                <div className="p-1 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    {getReactVehicleIcon(vehicle_type, "h-4 w-4 text-gray-700")}
                    <h3 className="font-semibold text-sm text-gray-800">{provider.name}</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">{vehicle_type}</p>
                    {available ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-50 text-green-700 hover:bg-green-50 px-1.5 py-0.5"
                      >
                        Verfügbar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 hover:bg-red-50 px-1.5 py-0.5">
                        Belegt
                      </Badge>
                    )}
                  </div>
                  {station && (
                    <div className="border-t pt-1.5 mt-1.5 space-y-1">
                      <h4 className="font-medium text-xs flex items-center gap-1 text-gray-600">
                        <MapPin className="h-3 w-3" /> Station:
                      </h4>
                      <p className="text-muted-foreground">{station.name}</p>
                      {station.address && <p className="text-xs text-gray-500">{station.address}</p>}
                      {station.status && typeof station.status.num_vehicle_available === "number" && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {getReactVehicleIcon(vehicle_type, "h-3 w-3 mr-0.5")} {/* Dynamisches Icon hier */}
                          {station.status.num_vehicle_available} Fahrzeuge verfügbar
                        </p>
                      )}
                    </div>
                  )}
                  {provider.phone && (
                    <div className="border-t pt-1.5 mt-1.5">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {provider.phone}
                      </p>
                    </div>
                  )}
                  {pricing && (
                    <div className="border-t pt-1 mt-1 space-y-0.5">
                      <h4 className="font-medium text-xs flex items-center gap-1 text-gray-600 mb-0.5">
                        <CreditCard className="h-3 w-3" /> Tarif:
                      </h4>
                      <p className="text-muted-foreground">Freischaltung: {pricing.unlockFee}</p>
                      <p className="text-muted-foreground">Pro Minute: {pricing.perMinuteRate}</p>
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t">
                    {appStoreLink ? (
                      <Button asChild size="xs" variant="secondary" className="w-full py-1 md:py-1.5 h-auto">
                        <Link href={appStoreLink} target="_blank" rel="noopener noreferrer">
                          App öffnen <ExternalLink className="ml-1.5 h-3 w-3" />
                        </Link>
                      </Button>
                    ) : (
                      <Button size="xs" className="w-full" disabled>
                        Keine App Info
                      </Button>
                    )}
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

export default LeafletMapComponent
