"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayerGroup, CircleMarker } from "react-leaflet"
import L, { type LatLngExpression, type PointExpression, type LeafletMouseEvent, type ZoomPanOptions } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MobilityVehicle } from "@/types/mobility"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bike, Car, CreditCard, ExternalLink, MapPin, Smartphone, Phone } from "lucide-react"
import Link from "next/link"

interface MapProps {
  center: [number, number]
  currentZoom: number
  vehicles: MobilityVehicle[]
  onVehicleSelect: (vehicle: MobilityVehicle) => void
  userLocation: [number, number] | null
  clickedLocation: [number, number] | null
  searchRadius: number
  showRadius: boolean
  onMapInteraction: (newCenter: [number, number], type: "click") => void
  deviceHeading: number | null
  showCompass: boolean
}

const providerColors: Record<string, { primary: string; background: string }> = {
  "Bolt Technology OÜ": { primary: "#34D186", background: "#ECFDF5" },
  "Voi Technology AB": { primary: "#F46D5B", background: "#FEF2F2" },
  "bird basel": { primary: "#33BBFF", background: "#EFF6FF" },
  Lime: { primary: "#00C851", background: "#ECFDF5" },
  "Lime City partners from Partners::RegionFeedMediator": { primary: "#00C851", background: "#ECFDF5" },
  PubliBike: { primary: "#E53935", background: "#FEF2F2" },
  nextbike: { primary: "#4CAF50", background: "#ECFDF5" },
  "donkey republic": { primary: "#FF9800", background: "#FFF7ED" },
  Velospot: { primary: "#8B5CF6", background: "#F5F3FF" },
  Mobility: { primary: "#E53935", background: "#FEF2F2" },
  "SHARE NOW": { primary: "#2196F3", background: "#EFF6FF" },
  Ubeeqo: { primary: "#9C27B0", background: "#FAF5FF" },
  default: { primary: "#6B7280", background: "#F3F4F6" },
}

function createCustomMarker(vehicleType: string, providerName: string): L.DivIcon {
  const colors = providerColors[providerName] || providerColors.default
  let iconUrl = ""
  switch (vehicleType.toLowerCase()) {
    case "bicycle":
    case "bike":
    case "e-bike":
      iconUrl = "/icon-bike.svg"
      break
    case "scooter":
    case "e-scooter":
    case "moped":
      iconUrl = "/icon-scooter.svg"
      break
    case "car":
      iconUrl = "/icon-car.svg"
      break
    default:
      const fallbackHtml = `<div style="background-color: ${colors.primary}; border: 2px solid ${colors.background}; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`
      return L.divIcon({
        html: fallbackHtml,
        className: "custom-vehicle-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      })
  }
  const html = `<div style="background-color: ${colors.background}; border: 2px solid ${colors.primary}; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><img src="${iconUrl}" alt="${vehicleType}" style="width: 20px; height: 20px;" /></div>`
  return L.divIcon({
    html: html,
    className: "custom-vehicle-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

const providerPricing: Record<string, { unlockFee: string; perMinuteRate: string }> = {
  "Bolt Technology OÜ": { unlockFee: "0.50 CHF", perMinuteRate: "0.49 CHF" },
  "Voi Technology AB": { unlockFee: "1 CHF", perMinuteRate: "0.44 CHF" },
  "bird basel": { unlockFee: "1 CHF", perMinuteRate: "0.45 CHF" },
  "Lime City partners from Partners::RegionFeedMediator": { unlockFee: "1 CHF", perMinuteRate: "0.46 CHF" },
  Lime: { unlockFee: "1 CHF", perMinuteRate: "0.46 CHF" },
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
      return <Smartphone className={className || "h-5 w-5"} />
    default:
      return null
  }
}

const clickedLocationIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" width="32px" height="32px">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
  </svg>
`),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const compassIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233B82F6" width="28px" height="28px" style="transform: rotate(var(--heading, 0deg)); transition: transform 0.1s ease-out;">
  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 2.99.71-.71L12 2z"/>
</svg>
`

function createCompassIcon(heading: number | null): L.DivIcon {
  const rotation = heading !== null ? heading : 0
  return L.divIcon({
    html: `<div style="--heading: ${rotation}deg; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">${compassIconSvg.replace("%233B82F6", "#3B82F6")}</div>`,
    className: "compass-marker-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

interface MapLogicControllerProps {
  center: [number, number]
  currentZoom: number
  onMapInteraction: (newCenter: [number, number], type: "click") => void
}

function MapLogicController({ center, currentZoom, onMapInteraction }: MapLogicControllerProps) {
  const map = useMap()

  useEffect(() => {
    map.whenReady(() => {
      const leafletCenter: LatLngExpression = [center[0], center[1]]
      const viewOptions: ZoomPanOptions = { animate: true, duration: 0.3 }

      const currentMapCenter = map.getCenter()
      const currentMapZoom = map.getZoom()
      const centerChanged =
        Math.abs(currentMapCenter.lat - center[0]) > 1e-6 || Math.abs(currentMapCenter.lng - center[1]) > 1e-6
      const zoomChanged = currentMapZoom !== currentZoom

      // Always ensure dragging is enabled
      if (!map.dragging.enabled()) map.dragging.enable()

      if (centerChanged || zoomChanged) {
        map.setView(leafletCenter, currentZoom, viewOptions)
      }
    })
  }, [center, currentZoom, map])

  useEffect(() => {
    const handleClick = (e: LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement

      if (
        target.closest(".leaflet-marker-icon") ||
        target.closest(".leaflet-popup-content-wrapper") ||
        target.closest(".leaflet-popup-tip-container") ||
        target.closest(".leaflet-control")
      ) {
        return
      }

      onMapInteraction([e.latlng.lat, e.latlng.lng], "click")
    }

    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [map, onMapInteraction])

  return null
}

// Touch Event Handler Component
function TouchEventHandler() {
  const map = useMap()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mapContainer = map.getContainer()
    mapContainerRef.current = mapContainer

    const preventPageScroll = (e: TouchEvent) => {
      // Prevent the default behavior (page scrolling) when touching the map
      e.preventDefault()
      e.stopPropagation()
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Prevent page scroll when touch starts on map
      e.stopPropagation()
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent page scroll during touch move on map
      e.preventDefault()
      e.stopPropagation()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Prevent page scroll when touch ends on map
      e.stopPropagation()
    }

    if (mapContainer) {
      // Add touch event listeners with passive: false to allow preventDefault
      mapContainer.addEventListener("touchstart", handleTouchStart, { passive: false })
      mapContainer.addEventListener("touchmove", handleTouchMove, { passive: false })
      mapContainer.addEventListener("touchend", handleTouchEnd, { passive: false })

      // Also prevent scroll events from bubbling up
      mapContainer.addEventListener("scroll", preventPageScroll, { passive: false })
    }

    return () => {
      if (mapContainer) {
        mapContainer.removeEventListener("touchstart", handleTouchStart)
        mapContainer.removeEventListener("touchmove", handleTouchMove)
        mapContainer.removeEventListener("touchend", handleTouchEnd)
        mapContainer.removeEventListener("scroll", preventPageScroll)
      }
    }
  }, [map])

  return null
}

const LeafletMapComponent: React.FC<MapProps> = ({
  center,
  currentZoom,
  vehicles,
  onVehicleSelect,
  userLocation,
  clickedLocation,
  searchRadius,
  showRadius,
  onMapInteraction,
  deviceHeading,
  showCompass,
}) => {
  const blueDotOptions = { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 1 }
  const leafletCenter: LatLngExpression = [center[0], center[1]]
  const userLeafletLocation: LatLngExpression | null = userLocation ? [userLocation[0], userLocation[1]] : null
  const clickedLeafletLocation: LatLngExpression | null = clickedLocation
    ? [clickedLocation[0], clickedLocation[1]]
    : null
  const autoPanPaddingValue: PointExpression = [10, 55]

  const compassMarkerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (compassMarkerRef.current) {
      if (deviceHeading !== null && showCompass) {
        const icon = createCompassIcon(deviceHeading)
        compassMarkerRef.current.setIcon(icon)
        compassMarkerRef.current.setOpacity(1)
      } else {
        compassMarkerRef.current.setOpacity(0)
      }
    }
  }, [deviceHeading, showCompass])

  return (
    <MapContainer
      center={leafletCenter}
      zoom={currentZoom}
      style={{
        height: "100%",
        width: "100%",
        touchAction: "none", // Prevent all default touch behaviors
        position: "relative",
        overflow: "hidden", // Ensure no scrollbars appear
      }}
      scrollWheelZoom={true}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapLogicController center={center} currentZoom={currentZoom} onMapInteraction={onMapInteraction} />
      <TouchEventHandler />
      {showRadius && center && (
        <Circle
          center={leafletCenter}
          radius={searchRadius}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f680", fillOpacity: 0.1, weight: 1 }}
        />
      )}

      {userLeafletLocation && (
        <>
          <CircleMarker center={userLeafletLocation} pathOptions={blueDotOptions} radius={8}>
            <Popup>Ihr aktueller Standort</Popup>
          </CircleMarker>
          <Marker
            position={userLeafletLocation}
            icon={createCompassIcon(deviceHeading)}
            ref={compassMarkerRef}
            keyboard={false}
            zIndexOffset={1000}
            opacity={showCompass && deviceHeading !== null ? 1 : 0}
          />
        </>
      )}

      {clickedLeafletLocation && (
        <Marker position={clickedLeafletLocation} icon={clickedLocationIcon}>
          <Popup>Suchzentrum</Popup>
        </Marker>
      )}
      <LayerGroup>
        {vehicles.map((vehicle) => {
          const coords = vehicle.geometry.coordinates
          const vehiclePosition: LatLngExpression = [coords[1], coords[0]]
          const { properties } = vehicle
          const { provider, station, vehicle_type, available } = properties
          const pricing = providerPricing[provider.name] || providerPricing[provider.name.split(" ")[0]]
          const appStoreLink = provider.apps?.ios?.store_uri?.[0] || provider.apps?.android?.store_uri?.[0]
          const customIcon = createCustomMarker(vehicle_type, provider.name)
          return (
            <Marker
              key={vehicle.id}
              position={vehiclePosition}
              icon={customIcon}
              eventHandlers={{
                click: () => {
                  onVehicleSelect(vehicle)
                },
              }}
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
                          {getReactVehicleIcon(vehicle_type, "h-3 w-3 mr-0.5")}
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
