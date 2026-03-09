"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import "leaflet/dist/leaflet.css"
import MobilityFilters from "@/components/mobility-filters"
import VehicleDetails from "@/components/vehicle-details"
import { Loader2, RotateCw, Navigation } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

import dynamic from "next/dynamic"
import type { MobilityVehicle } from "@/types/mobility"
import { convertEsriJsonToMobilityVehicle } from "@/utils/converters"
import { fetchMobilityVehicles } from "@/lib/api"

const LeafletMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        <span className="text-sm text-muted-foreground">Karte wird geladen...</span>
      </div>
    </div>
  ),
})

const defaultLocations = [
  { name: "Zürich HB", coords: [47.3779, 8.5402] as [number, number] },
  { name: "Genf", coords: [46.2108, 6.1426] as [number, number] },
  { name: "Basel SBB", coords: [47.5474, 7.5898] as [number, number] },
  { name: "Bern", coords: [46.9498, 7.4391] as [number, number] },
  { name: "Luzern", coords: [47.0502, 8.3093] as [number, number] },
  { name: "St. Gallen", coords: [47.4245, 9.3767] as [number, number] },
]

const DEFAULT_SEARCH_RADIUS = 400
const DEFAULT_MAP_CENTER: [number, number] = [46.8182, 8.2275]
const DEFAULT_MAP_ZOOM_OVERVIEW = 8
const ACTIVE_SEARCH_INITIAL_ZOOM = 16

const VEHICLE_TYPE_API_FILTERS = [
  "ch.bfe.sharedmobility.vehicle_type=E-Scooter",
  "ch.bfe.sharedmobility.vehicle_type=E-Bike",
  "ch.bfe.sharedmobility.vehicle_type=Car",
]

export default function Home() {
  const [vehicles, setVehicles] = useState<MobilityVehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<MobilityVehicle | null>(null)
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [userLocationMarker, setUserLocationMarker] = useState<[number, number] | null>(null)
  const [locationName, setLocationName] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(["E-Scooter", "E-Bike", "Car"]))
  const [searchRadius, setSearchRadius] = useState(DEFAULT_SEARCH_RADIUS)

  const { toast } = useToast()

  const handleTypeToggle = useCallback((type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size > 1) next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const handleRadiusChange = useCallback((r: number) => setSearchRadius(r), [])

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSetCurrentLocation = useCallback(() => {
    if (navigator.geolocation && window.isSecureContext) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setLocation(currentCoords)
          setUserLocationMarker(currentCoords)
          setLocationName("Mein Standort")
        },
        (error) => {
          setLoading(false)
          let description = "Standort konnte nicht ermittelt werden."
          if (error.code === 1) {
            description = "Bitte erlaube den Zugriff auf deinen Standort."
          }
          toast({ title: "Standortfehler", description, variant: "destructive" })
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 },
      )
    } else {
      toast({
        title: "Nicht verfügbar",
        description: "Standortdienste werden nicht unterstützt.",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleMapTapLocation = useCallback((coords: [number, number]) => {
    setLocation(coords)
    setLocationName("Gewählter Ort")
    setUserLocationMarker(null)
  }, [])

  const fetchVehiclesForType = useCallback(
    async (filterValue: string, currentLocation: [number, number], signal: AbortSignal): Promise<MobilityVehicle[]> => {
      const geometry = `${currentLocation[1]},${currentLocation[0]}`
      const data = await fetchMobilityVehicles(geometry, searchRadius.toString(), filterValue, signal)
      return data.map(convertEsriJsonToMobilityVehicle)
    },
    [searchRadius],
  )

  const fetchSpatialVehicles = useCallback(async () => {
    if (!location) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setVehicles([])
    setSelectedVehicle(null)

    try {
      const activeFilters = VEHICLE_TYPE_API_FILTERS.filter((f) => {
        if (f.includes("E-Scooter")) return activeTypes.has("E-Scooter")
        if (f.includes("E-Bike")) return activeTypes.has("E-Bike")
        if (f.includes("Car")) return activeTypes.has("Car")
        return true
      })
      const results = await Promise.all(
        activeFilters.map((filter) => fetchVehiclesForType(filter, location, controller.signal)),
      )

      if (controller.signal.aborted) return

      const uniqueMap = new Map<string, MobilityVehicle>()
      results.flat().forEach((v) => {
        if (!uniqueMap.has(v.id)) uniqueMap.set(v.id, v)
      })
      const finalVehicles = Array.from(uniqueMap.values())

      setVehicles(finalVehicles)
      setLastUpdated(new Date())

      if (finalVehicles.length === 0) {
        toast({
          title: "Keine Fahrzeuge",
          description: `Keine Fahrzeuge im Umkreis von ${searchRadius}m gefunden.`,
        })
      }
    } catch (error) {
      if (controller.signal.aborted) return
      toast({
        title: "Fehler",
        description: "Fahrzeuge konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [location, fetchVehiclesForType, toast, activeTypes])

  useEffect(() => {
    if (location) {
      fetchSpatialVehicles()
    } else {
      setVehicles([])
      setLoading(false)
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [location, fetchSpatialVehicles])

  const handleLocationSearch = useCallback((newLocation: [number, number], name: string) => {
    setLocation(newLocation)
    setLocationName(name)
    setUserLocationMarker(null)
  }, [])

  const refreshData = useCallback(() => {
    if (location) {
      fetchSpatialVehicles()
    }
  }, [location, fetchSpatialVehicles])

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        <LeafletMap
          center={location || DEFAULT_MAP_CENTER}
          initialZoom={location ? ACTIVE_SEARCH_INITIAL_ZOOM : DEFAULT_MAP_ZOOM_OVERVIEW}
          vehicles={vehicles}
          onVehicleSelect={setSelectedVehicle}
          onMapTapLocation={handleMapTapLocation}
          searchRadius={location ? searchRadius : 50000}
          userLocation={userLocationMarker}
          showRadius={!!location}
        />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/40 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl px-6 py-4 shadow-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Fahrzeuge werden gesucht...</span>
          </div>
        </div>
      )}

      {/* Top Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-[600] safe-area-top">
        <div className="px-4 pt-3 pb-2">
          <MobilityFilters
            onLocationSearch={handleLocationSearch}
            onSetCurrentLocation={handleSetCurrentLocation}
            defaultLocations={defaultLocations}
            locationName={locationName}
            vehicleCount={vehicles.length}
            lastUpdated={lastUpdated}
            activeTypes={activeTypes}
            onTypeToggle={handleTypeToggle}
            searchRadius={searchRadius}
            onRadiusChange={handleRadiusChange}
            currentCoords={location}
          />
        </div>
      </div>

      {/* Status Pill */}
      {locationName && !loading && vehicles.length > 0 && (
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 z-[500] animate-fade-in">
          <div className="glass rounded-full px-4 py-2 shadow-md flex items-center gap-2 text-sm">
            <span className="font-medium">{vehicles.length}</span>
            <span className="text-muted-foreground">Fahrzeuge</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">{searchRadius}m</span>
            {lastUpdated && (
              <button
                onClick={refreshData}
                className="ml-1 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-apple"
                aria-label="Aktualisieren"
              >
                <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* GPS Floating Button - bottom right */}
      <div className="absolute bottom-6 right-4 z-[600] safe-area-bottom">
        <button
          onClick={handleSetCurrentLocation}
          className="glass w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 dark:hover:bg-black/60 transition-apple active:scale-95"
          aria-label="Mein Standort"
        >
          <Navigation className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Vehicle Details Bottom Sheet */}
      {selectedVehicle && (
        <div className="absolute bottom-0 left-0 right-0 z-[700] safe-area-bottom">
          <VehicleDetails vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
        </div>
      )}
    </main>
  )
}
