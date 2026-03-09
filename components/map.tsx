"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import L, { type LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import type { MobilityVehicle } from "@/types/mobility"
import { getProviderInfo } from "@/lib/providers"
import { t, type Locale } from "@/lib/i18n"

interface MapProps {
  center: [number, number]
  initialZoom: number
  vehicles: MobilityVehicle[]
  onVehicleSelect: (vehicle: MobilityVehicle) => void
  onMapTapLocation: (coords: [number, number]) => void
  userLocation: [number, number] | null
  searchRadius: number
  showRadius: boolean
  locale: Locale
}

function createVehicleIcon(vehicleType: string, providerName: string): L.DivIcon {
  const info = getProviderInfo(providerName)

  if (info.logo) {
    return L.divIcon({
      html: `<div style="width:38px;height:38px;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15),0 0 0 2px white;background:white;">
        <img src="${info.logo}" alt="${info.shortName}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>`,
      className: "custom-vehicle-marker",
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22],
    })
  }

  return L.divIcon({
    html: `<div style="width:36px;height:36px;background:${info.color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${info.color}40,0 1px 3px rgba(0,0,0,0.12);border:2.5px solid white;color:white;font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;">${info.shortName}</div>`,
    className: "custom-vehicle-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

function createTapIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(211,100%,50%);border:3px solid white;box-shadow:0 2px 12px rgba(0,122,255,0.4);display:flex;align-items:center;justify-content:center;">
      <div style="width:8px;height:8px;border-radius:50%;background:white;"></div>
    </div>`,
    className: "custom-vehicle-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

function zoomForRadius(r: number): number {
  if (r <= 250) return 17
  if (r <= 500) return 16
  if (r <= 1000) return 15
  if (r <= 2000) return 14
  return 13
}

function buildPopupHtml(vehicle: MobilityVehicle, locale: Locale): string {
  const { properties } = vehicle
  const { provider, station, vehicle_type, available } = properties
  const info = getProviderInfo(provider.name)
  const pricing = info.pricing
  const color = info.color
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const appLink = isIos
    ? (provider.apps?.ios?.discovery_uri || provider.apps?.ios?.store_uri?.[0] || provider.apps?.android?.discovery_uri || provider.apps?.android?.store_uri?.[0])
    : (provider.apps?.android?.discovery_uri || provider.apps?.android?.store_uri?.[0] || provider.apps?.ios?.discovery_uri || provider.apps?.ios?.store_uri?.[0])

  const swisspassHtml = info.swisspass
    ? `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#fff1f2;color:#e11d48;">SwissPass</span>`
    : ""

  const statusBadge = available
    ? `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#ecfdf5;color:#059669;">${t(locale, "available")}</span>`
    : `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:#fef2f2;color:#ef4444;">${t(locale, "occupied")}</span>`

  let stationHtml = ""
  if (station) {
    stationHtml = `
      <div style="background:#f9fafb;border-radius:12px;padding:10px;margin:10px 0;">
        <p style="font-size:12px;font-weight:500;margin:0;">${station.name}</p>
        ${station.address ? `<p style="font-size:11px;color:#6b7280;margin:2px 0 0;">${station.address}</p>` : ""}
        ${station.status?.num_vehicle_available != null ? `<p style="font-size:11px;color:#6b7280;margin:4px 0 0;">${station.status.num_vehicle_available} ${t(locale, "stationVehicles")}</p>` : ""}
      </div>`
  }

  let pricingHtml = ""
  if (pricing) {
    pricingHtml = `<p style="font-size:11px;color:#6b7280;margin:6px 0;">${pricing.unlock} CHF Start · ${pricing.minute} CHF/Min</p>`
  }

  let phoneHtml = ""
  if (provider.phone) {
    phoneHtml = `<p style="font-size:11px;color:#6b7280;margin:4px 0;">${provider.phone}</p>`
  }

  let buttonHtml = ""
  if (appLink) {
    buttonHtml = `
      <a href="${appLink}" target="_blank" rel="noopener noreferrer"
         style="display:block;text-align:center;padding:10px;border-radius:12px;color:white;font-size:12px;font-weight:600;text-decoration:none;margin-top:10px;background:${color};">
        ${t(locale, "openInApp")}
      </a>`
  }

  const logoHtml = info.logo
    ? `<img src="${info.logo}" alt="${info.shortName}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`
    : `<span style="color:white;font-weight:700;font-size:12px;">${info.shortName}</span>`

  return `
    <div style="padding:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:240px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:40px;height:40px;border-radius:10px;overflow:hidden;flex-shrink:0;background:${info.logo ? 'white' : color};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${logoHtml}</div>
          <div>
            <h3 style="font-size:14px;font-weight:600;margin:0;line-height:1.3;">${provider.name}</h3>
            <p style="font-size:11px;color:#6b7280;margin:2px 0 0;">${vehicle_type}</p>
            ${swisspassHtml}
          </div>
        </div>
        ${statusBadge}
      </div>
      ${stationHtml}
      ${pricingHtml}
      ${phoneHtml}
      ${buttonHtml}
    </div>`
}

const LeafletMapComponent: React.FC<MapProps> = ({
  center,
  initialZoom,
  vehicles,
  onVehicleSelect,
  onMapTapLocation,
  userLocation,
  searchRadius,
  showRadius,
  locale,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null)
  const radiusCircleRef = useRef<L.Circle | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const userPulseRef = useRef<L.CircleMarker | null>(null)
  const tapMarkerRef = useRef<L.Marker | null>(null)
  const onMapTapLocationRef = useRef(onMapTapLocation)
  const localeRef = useRef(locale)

  // Keep callback ref up to date
  useEffect(() => {
    onMapTapLocationRef.current = onMapTapLocation
  }, [onMapTapLocation])

  useEffect(() => {
    localeRef.current = locale
  }, [locale])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [center[0], center[1]],
      zoom: initialZoom,
      zoomControl: false,
      scrollWheelZoom: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    markersLayerRef.current = L.markerClusterGroup({
      maxClusterRadius: 40,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        return L.divIcon({
          html: `<div style="width:36px;height:36px;background:hsl(211,100%,50%);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,122,255,0.3);color:white;font-size:12px;font-weight:700;font-family:-apple-system,sans-serif;">${count}</div>`,
          className: "custom-cluster-marker",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })
      },
    }).addTo(map)

    // Tap-to-place: click on map → dismiss existing marker, or show new one
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng

      // If a tap marker exists, just dismiss it and return
      if (tapMarkerRef.current) {
        tapMarkerRef.current.remove()
        tapMarkerRef.current = null
        return
      }

      const tapIcon = createTapIcon()
      const marker = L.marker([lat, lng], { icon: tapIcon })
        .addTo(map)
        .bindPopup(
          `<div style="padding:8px;font-family:-apple-system,sans-serif;text-align:center;">
            <p style="font-size:13px;font-weight:600;margin:0 0 8px;">${t(localeRef.current, "searchHere")}</p>
            <button id="tap-confirm-btn" style="
              background:hsl(211,100%,50%);color:white;border:none;
              padding:8px 20px;border-radius:10px;font-size:12px;font-weight:600;
              cursor:pointer;width:100%;
            ">${t(localeRef.current, "searchHereConfirm")}</button>
          </div>`,
          { className: "custom-popup", minWidth: 160 },
        )

      tapMarkerRef.current = marker

      // Register popupopen listener BEFORE opening popup
      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.getElementById("tap-confirm-btn")
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation()
              onMapTapLocationRef.current([lat, lng])
              if (tapMarkerRef.current) {
                tapMarkerRef.current.remove()
                tapMarkerRef.current = null
              }
            }
          }
        }, 50)
      })

      // Now open popup — event listener is already attached
      marker.openPopup()
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      tapMarkerRef.current = null
    }
  }, [])

  // Update center and zoom
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const leafletCenter: LatLngExpression = [center[0], center[1]]

    // Remove tap marker when location changes
    if (tapMarkerRef.current) {
      tapMarkerRef.current.remove()
      tapMarkerRef.current = null
    }

    if (vehicles.length > 0) {
      const bounds = L.latLngBounds([leafletCenter])
      vehicles.forEach((v) => {
        bounds.extend([v.geometry.coordinates[1], v.geometry.coordinates[0]])
      })
      if (bounds.isValid() && bounds.getSouthWest().distanceTo(bounds.getNorthEast()) > 10) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 })
      } else {
        map.setView(leafletCenter, zoomForRadius(searchRadius))
      }
    } else {
      map.setView(leafletCenter, zoomForRadius(searchRadius))
    }
  }, [center, vehicles, searchRadius])

  // Update radius circle
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove()
      radiusCircleRef.current = null
    }

    if (showRadius) {
      radiusCircleRef.current = L.circle([center[0], center[1]], {
        radius: searchRadius,
        color: "hsl(211, 100%, 50%)",
        fillColor: "hsl(211, 100%, 50%)",
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: "6 4",
      }).addTo(map)
    }
  }, [center, searchRadius, showRadius])

  // Update user location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
    if (userPulseRef.current) {
      userPulseRef.current.remove()
      userPulseRef.current = null
    }

    if (userLocation) {
      const pos: LatLngExpression = [userLocation[0], userLocation[1]]

      userPulseRef.current = L.circleMarker(pos, {
        color: "hsl(211, 100%, 50%)",
        fillColor: "hsl(211, 100%, 50%)",
        fillOpacity: 0.2,
        weight: 0,
        radius: 20,
      }).addTo(map)

      userMarkerRef.current = L.circleMarker(pos, {
        color: "white",
        fillColor: "hsl(211, 100%, 50%)",
        fillOpacity: 1,
        weight: 3,
        radius: 7,
      })
        .bindPopup(t(locale, "myLocationLabel"))
        .addTo(map)
    }
  }, [userLocation, locale])

  // Update vehicle markers
  useEffect(() => {
    const layer = markersLayerRef.current
    if (!layer) return

    layer.clearLayers()

    const iconCache = new Map<string, L.DivIcon>()

    vehicles.forEach((vehicle) => {
      const coords = vehicle.geometry.coordinates
      const pos: LatLngExpression = [coords[1], coords[0]]
      const { vehicle_type, provider } = vehicle.properties
      const iconKey = `${vehicle_type}-${provider.name}`

      let icon = iconCache.get(iconKey)
      if (!icon) {
        icon = createVehicleIcon(vehicle_type, provider.name)
        iconCache.set(iconKey, icon)
      }

      const marker = L.marker(pos, { icon })
        .bindPopup(buildPopupHtml(vehicle, locale), {
          minWidth: 260,
          maxWidth: 300,
          className: "custom-popup",
        })
        .on("click", () => onVehicleSelect(vehicle))

      ;(marker as L.Marker & { _provider: string })._provider = provider.name

      layer.addLayer(marker)
    })
  }, [vehicles, onVehicleSelect, locale])

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
}

export default LeafletMapComponent
