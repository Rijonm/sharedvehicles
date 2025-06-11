"use client"

import { useState, useEffect } from "react"
import "leaflet/dist/leaflet.css"
import MobilityFilters from "@/components/mobility-filters"
import VehicleDetails from "@/components/vehicle-details"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

import dynamic from "next/dynamic"
import type { MobilityVehicle, EsriJsonFeature } from "@/types/mobility"
import { convertEsriJsonToMobilityVehicle } from "@/utils/converters"

const LeafletMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Karte wird geladen...</span>
    </div>
  ),
})

// Updated default locations with precise SBB train station coordinates
const defaultLocations = [
  { name: "Zürich SBB", coords: [47.3779, 8.5402] as [number, number] },
  { name: "Genf SBB", coords: [46.2108, 6.1426] as [number, number] },
  { name: "Basel SBB", coords: [47.5474, 7.5898] as [number, number] },
  { name: "Bern SBB", coords: [46.9498, 7.4391] as [number, number] },
]

const FIXED_SEARCH_RADIUS = 400 // Search radius set to 400m
const DEFAULT_MAP_CENTER: [number, number] = [46.8182, 8.2275] // Approx. center of Switzerland
const DEFAULT_MAP_ZOOM_OVERVIEW = 8
const ACTIVE_SEARCH_INITIAL_ZOOM = 16 // Zoom level for active search (400m radius)

// Updated vehicle type filters based on user input
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
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { toast } = useToast()

  const handleSetCurrentLocation = () => {
    if (navigator.geolocation && window.isSecureContext) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setLocation(currentCoords)
          setUserLocationMarker(currentCoords)
          setLocationName("Ihr Standort")
          toast({
            title: "Standort aktualisiert",
            description: `Fahrzeuge in Ihrer Nähe (Radius: ${FIXED_SEARCH_RADIUS}m) werden gesucht.`,
          })
        },
        (error) => {
          setLoading(false)
          setUserLocationMarker(null)
          setLocation(null)
          setLocationName("")
          console.log(`Geolocation error (${error.code}): ${error.message}`)
          let description = "Ihr Standort konnte nicht ermittelt werden."
          if (error.code === 1) {
            description = "Bitte erteilen Sie die Berechtigung, um Ihren Standort zu verwenden."
          }
          toast({
            title: "Standortfehler",
            description: description,
            variant: "destructive",
          })
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 },
      )
    } else {
      setLoading(false)
      setUserLocationMarker(null)
      setLocation(null)
      setLocationName("")
      toast({
        title: "Standort nicht verfügbar",
        description:
          "Die Geolokalisierung wird von Ihrem Browser nicht unterstützt oder Sie befinden sich in einem unsicheren Kontext.",
        variant: "destructive",
      })
    }
  }

  async function fetchVehiclesForType(
    filterValue: string,
    currentLocation: [number, number],
    radius: string,
  ): Promise<MobilityVehicle[]> {
    if (!currentLocation || !currentLocation[0] || !currentLocation[1]) return []

    const params = new URLSearchParams()
    params.append("Geometry", `${currentLocation[1]},${currentLocation[0]}`)
    params.append("Tolerance", radius)
    params.append("filters", filterValue)
    // offset=0 is default, limit=50 is default by API

    try {
      const response = await fetch(`/api/mobility?${params.toString()}`)
      if (!response.ok) {
        console.error(
          `API error for filter ${filterValue} (Status: ${response.status}): ${await response.text().catch(() => "")}`,
        )
        return []
      }
      const data: EsriJsonFeature[] = await response.json()
      if (data && Array.isArray(data)) {
        return data.map(convertEsriJsonToMobilityVehicle)
      }
      return []
    } catch (error) {
      console.error(`Network or parsing error for filter ${filterValue}:`, error)
      return []
    }
  }

  const fetchSpatialVehicles = async () => {
    if (!location || !location[0] || !location[1]) return

    setLoading(true)
    setApiError(null)
    setVehicles([])

    try {
      const vehiclePromises = VEHICLE_TYPE_API_FILTERS.map((filter) =>
        fetchVehiclesForType(filter, location, FIXED_SEARCH_RADIUS.toString()),
      )

      const resultsPerType = await Promise.all(vehiclePromises)
      const combinedVehiclesRaw = resultsPerType.flat()

      const uniqueVehiclesMap = new Map<string, MobilityVehicle>()
      combinedVehiclesRaw.forEach((vehicle) => {
        if (!uniqueVehiclesMap.has(vehicle.id)) {
          uniqueVehiclesMap.set(vehicle.id, vehicle)
        }
      })
      const finalVehicles = Array.from(uniqueVehiclesMap.values())

      setVehicles(finalVehicles)
      setLastUpdated(new Date())

      if (finalVehicles.length === 0) {
        toast({
          title: "Keine Fahrzeuge gefunden",
          description: `Im Umkreis von ${FIXED_SEARCH_RADIUS}m wurden keine Fahrzeuge für die gewählten Typen gefunden.`,
        })
      } else {
        toast({
          title: "Fahrzeuge geladen",
          description: `${finalVehicles.length} Fahrzeuge (kombinierte Typen) innerhalb von ${FIXED_SEARCH_RADIUS}m gefunden`,
        })
      }
    } catch (error) {
      console.error("Error fetching spatial vehicles (Promise.all level):", error)
      const message = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten."
      setApiError(message)
      setVehicles([])
      toast({
        title: "Fehler beim Laden der Fahrzeuge",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location) {
      fetchSpatialVehicles()
    } else {
      setVehicles([])
      setLoading(false)
    }
  }, [location])

  const handleVehicleSelect = (vehicle: MobilityVehicle) => {
    setSelectedVehicle(vehicle)
  }

  const handleLocationSearch = (newLocation: [number, number], name: string) => {
    setLoading(true)
    setLocation(newLocation)
    setLocationName(name)
    setUserLocationMarker(null)
  }

  const handleDefaultLocationSelect = (locationData: { name: string; coords: [number, number] }) => {
    setLoading(true)
    setLocation(locationData.coords)
    setLocationName(locationData.name)
    setUserLocationMarker(null)
  }

  const refreshData = () => {
    if (location) {
      fetchSpatialVehicles()
    } else {
      toast({
        title: "Kein Standort ausgewählt",
        description: "Bitte wählen Sie zuerst einen Standort aus, um die Daten zu aktualisieren.",
        variant: "default",
      })
    }
  }

  const useMockData = () => {
    setApiError(null)
    setLoading(true)
    setLocation(null)
    setLocationName("Demo Daten")
    setUserLocationMarker(null)
    import("@/mock/mobility-data").then((module) => {
      const allMockVehicles = module.default
      const uniqueVehiclesMap = new Map<string, MobilityVehicle>()
      allMockVehicles.forEach((vehicle) => {
        if (!uniqueVehiclesMap.has(vehicle.id)) {
          uniqueVehiclesMap.set(vehicle.id, vehicle)
        }
      })
      setVehicles(Array.from(uniqueVehiclesMap.values()))
      setLastUpdated(new Date())
      toast({
        title: "Demo-Daten werden verwendet",
        description: "Umgewechselt auf Demo-Modus mit Beispielfahrzeugen aller Typen.",
      })
      setLoading(false)
    })
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Ride Radar</h1>
            <p className="text-sm text-gray-600">Gibt dir eine Übersicht über alle Sharing Angebote in der Schweiz und deiner Umgebung.</p>
          </div>
          {/* Desktop Refresh Button - hidden on small screens, visible sm and up */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="hidden sm:flex items-center gap-1 mt-4 sm:mt-0"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
        </div>

        {/* Desktop Last Updated - hidden on small screens, visible sm and up */}
        {lastUpdated && locationName && (
          <p className="text-sm text-muted-foreground mb-4 hidden sm:block">
            Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        {apiError && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API-Fehler</AlertTitle>
            <AlertDescription>
              {apiError}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={useMockData}>
                  Demo-Daten verwenden
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <MobilityFilters
              onLocationSearch={handleLocationSearch}
              onSetCurrentLocation={handleSetCurrentLocation}
              defaultLocations={defaultLocations}
            />
            {/* Mobile Refresh Section - visible only on small screens (below sm) */}
            <div className="mt-4 sm:hidden">
              <div className="flex items-center justify-start space-x-3">
                <Button variant="outline" size="sm" onClick={refreshData} className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                  Aktualisieren
                </Button>
                {lastUpdated && locationName && (
                  <p className="text-xs text-muted-foreground">Aktualisiert: {lastUpdated.toLocaleTimeString()}</p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-lg overflow-hidden border h-[70vh] relative">
              {locationName && !loading && (
                <div className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 px-3 py-1 rounded-md shadow-md text-sm font-medium">
                  {`${locationName} • ${FIXED_SEARCH_RADIUS}m Radius`}
                  <Badge variant="secondary" className="ml-2">
                    {vehicles.length} Fahrzeuge
                  </Badge>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Fahrzeuge werden geladen...</span>
                </div>
              )}

              <LeafletMap
                center={location || DEFAULT_MAP_CENTER}
                initialZoom={location ? ACTIVE_SEARCH_INITIAL_ZOOM : DEFAULT_MAP_ZOOM_OVERVIEW}
                vehicles={vehicles}
                onVehicleSelect={handleVehicleSelect}
                searchRadius={location ? FIXED_SEARCH_RADIUS : 50000}
                userLocation={userLocationMarker}
                showRadius={!!location}
              />
            </div>

            {selectedVehicle && (
              <div className="mt-4">
                <VehicleDetails vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
