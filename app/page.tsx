"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import "leaflet/dist/leaflet.css"
import MobilityFilters from "@/components/mobility-filters"
import VehicleDetails from "@/components/vehicle-details"
import { Loader2, RotateCw, Navigation } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

import dynamic from "next/dynamic"
import type { MobilityVehicle } from "@/types/mobility"
import { convertEsriJsonToMobilityVehicle } from "@/utils/converters"
import { fetchMobilityVehicles } from "@/lib/api"
import { useLocale } from "@/hooks/useLocale"
import { t } from "@/lib/i18n"
import { getProviderInfo } from "@/lib/providers"

const PwaInstallPrompt = dynamic(() => import("@/components/pwa-install-prompt"), { ssr: false })

const LeafletMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
        <span className="text-sm font-medium text-muted-foreground/60">···</span>
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
const DEFAULT_MAP_ZOOM_OVERVIEW = 10
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
  const [activeBrands, setActiveBrands] = useState<Set<string>>(new Set())
  const [searchRadius, setSearchRadius] = useState(DEFAULT_SEARCH_RADIUS)

  const { locale, setLocale } = useLocale()
  const localeRef = useRef(locale)
  useEffect(() => { localeRef.current = locale }, [locale])
  const { toast } = useToast()

  const handleBrandToggle = useCallback((brand: string) => {
    setActiveBrands((prev) => {
      const next = new Set(prev)
      if (next.has(brand)) next.delete(brand)
      else next.add(brand)
      return next
    })
  }, [])

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

  const [committedRadius, setCommittedRadius] = useState(DEFAULT_SEARCH_RADIUS)
  const radiusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleRadiusChange = useCallback((r: number) => {
    setSearchRadius(r)
    if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current)
    radiusDebounceRef.current = setTimeout(() => setCommittedRadius(r), 450)
  }, [])

  // Auto-locate on first mount
  const hasMounted = useRef(false)
  useEffect(() => {
    if (hasMounted.current) return
    hasMounted.current = true
    handleSetCurrentLocation()
  }, [handleSetCurrentLocation])

  // Reset brand filter on new location search
  useEffect(() => {
    setActiveBrands(new Set())
  }, [location])

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSetCurrentLocation = useCallback(() => {
    if (navigator.geolocation && window.isSecureContext) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setLocation(currentCoords)
          setUserLocationMarker(currentCoords)
          setLocationName(t(localeRef.current, "myLocation"))
        },
        (error) => {
          setLoading(false)
          let description = t(localeRef.current, "locationErrorDesc")
          if (error.code === 1) {
            description = t(localeRef.current, "locationDenied")
          }
          toast({ title: t(localeRef.current, "locationError"), description, variant: "destructive" })
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 },
      )
    } else {
      toast({
        title: t(localeRef.current, "locationUnavailable"),
        description: t(localeRef.current, "locationUnavailableDesc"),
        variant: "destructive",
      })
    }
  }, [toast])

  const handleMapTapLocation = useCallback((coords: [number, number]) => {
    setLocation(coords)
    setLocationName(t(localeRef.current, "selectedPlace"))
    setUserLocationMarker(null)
  }, [])

  const fetchVehiclesForType = useCallback(
    async (filterValue: string, currentLocation: [number, number], signal: AbortSignal): Promise<MobilityVehicle[]> => {
      const geometry = `${currentLocation[1]},${currentLocation[0]}`
      const data = await fetchMobilityVehicles(geometry, committedRadius.toString(), filterValue, signal)
      return data.map(convertEsriJsonToMobilityVehicle)
    },
    [committedRadius],
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
      const finalVehicles = Array.from(uniqueMap.values()).filter((v) => {
        if (v.properties.station) {
          return (v.properties.station.status.num_vehicle_available ?? 0) > 0
        }
        return true
      })

      setVehicles(finalVehicles)
      setLastUpdated(new Date())

      if (finalVehicles.length === 0) {
        toast({
          title: t(localeRef.current, "noVehicles"),
          description: t(localeRef.current, "noVehiclesDesc", { radius: searchRadius.toString() }),
        })
      }
    } catch (error) {
      if (controller.signal.aborted) return
      toast({
        title: t(localeRef.current, "fetchError"),
        description: t(localeRef.current, "fetchErrorDesc"),
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

  const availableBrands = useMemo(() => {
    const seen = new Map<string, { name: string; color: string; logo?: string }>()
    vehicles.forEach((v) => {
      const name = v.properties.provider.name
      if (!seen.has(name)) {
        const info = getProviderInfo(name)
        seen.set(name, { name, color: info.color, logo: info.logo })
      }
    })
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [vehicles])

  const displayVehicles = useMemo(
    () => (activeBrands.size === 0 ? vehicles : vehicles.filter((v) => activeBrands.has(v.properties.provider.name))),
    [vehicles, activeBrands],
  )

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
          vehicles={displayVehicles}
          onVehicleSelect={setSelectedVehicle}
          onMapTapLocation={handleMapTapLocation}
          searchRadius={location ? searchRadius : 50000}
          userLocation={userLocationMarker}
          showRadius={!!location}
          locale={locale}
        />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center loading-overlay backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl px-7 py-5 shadow-xl flex items-center gap-3.5 animate-fade-in-scale">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-semibold tracking-[-0.01em]">{t(locale, "loading")}</span>
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
            activeTypes={activeTypes}
            onTypeToggle={handleTypeToggle}
            availableBrands={availableBrands}
            activeBrands={activeBrands}
            onBrandToggle={handleBrandToggle}
            searchRadius={searchRadius}
            onRadiusChange={handleRadiusChange}
            currentCoords={location}
            locale={locale}
            onLocaleChange={setLocale}
          />
        </div>
      </div>

      {/* Status Pill */}
      {locationName && !loading && displayVehicles.length > 0 && (
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 z-[500] animate-fade-in-scale">
          <div className="glass rounded-full pl-1.5 pr-4 py-1.5 shadow-lg flex items-center gap-2.5 text-sm">
            <span className="status-count">{displayVehicles.length}</span>
            <span className="text-muted-foreground font-medium">{t(locale, "vehiclesFound")}</span>
            <span className="text-muted-foreground/30 font-light">|</span>
            <span className="text-muted-foreground/70 tabular-nums font-medium">{searchRadius}m</span>
            {lastUpdated && (
              <button
                onClick={refreshData}
                className="ml-0.5 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-apple active:scale-90"
                aria-label={t(locale, "refresh")}
              >
                <RotateCw className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Brand filter empty state */}
      {locationName && !loading && activeBrands.size > 0 && vehicles.length > 0 && displayVehicles.length === 0 && (
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 z-[500] animate-fade-in-scale">
          <div className="glass rounded-full px-4 py-1.5 shadow-lg text-sm text-muted-foreground font-medium">
            {t(locale, "brandFilterEmpty")}
          </div>
        </div>
      )}

      {/* GPS Floating Button - bottom right */}
      <div className="absolute bottom-6 right-4 z-[600] safe-area-bottom">
        <button
          onClick={handleSetCurrentLocation}
          className="glass w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 dark:hover:bg-black/60 transition-apple active:scale-90 hover:shadow-xl"
          aria-label={t(locale, "myLocation")}
        >
          <Navigation className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* PWA Install Prompt */}
      <PwaInstallPrompt hasResults={vehicles.length > 0} />

      {/* Vehicle Details Bottom Sheet */}
      {selectedVehicle && (
        <div className="absolute bottom-0 left-0 right-0 z-[700] safe-area-bottom">
          <VehicleDetails vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} locale={locale} />
        </div>
      )}
    </main>
  )
}
