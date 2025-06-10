"use client"

import { useState, useEffect } from "react"
import "leaflet/dist/leaflet.css"
import MobilityFilters from "@/components/mobility-filters"
import VehicleDetails from "@/components/vehicle-details"
import { Loader2, MapPin, AlertCircle, RefreshCw, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

import dynamic from "next/dynamic"
import type { MobilityVehicle, EsriJsonFeature } from "@/types/mobility"
import { convertEsriJsonToMobilityVehicle } from "@/utils/converters"

const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Karte wird geladen...</span>
    </div>
  ),
})

const defaultLocations = [
  { name: "Zürich", coords: [47.3769, 8.5417] },
  { name: "Genf", coords: [46.2044, 6.1432] },
  { name: "Basel", coords: [47.5596, 7.5886] },
  { name: "Bern", coords: [46.948, 7.4474] },
  { name: "Lausanne", coords: [46.5197, 6.6323] },
]

const MAX_VEHICLES_DISPLAY = 500
const DEFAULT_SEARCH_RADIUS = 500 // Default tolerance set to 500 meters

export default function Home() {
  const [vehicles, setVehicles] = useState<MobilityVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<MobilityVehicle | null>(null)
  const [location, setLocation] = useState<[number, number]>(defaultLocations[0].coords)
  const [filters, setFilters] = useState<string[]>(["ch.bfe.sharedmobility.vehicle_type=E-Scooter"]) // Default to E-Scooter
  const [locationName, setLocationName] = useState<string>(defaultLocations[0].name)
  const [showLocationAlert, setShowLocationAlert] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [searchRadius, setSearchRadius] = useState<number>(DEFAULT_SEARCH_RADIUS) // Use the new default
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [vehicleLimitReached, setVehicleLimitReached] = useState<boolean>(false)

  const { toast } = useToast()

  const handleSetCurrentLocation = () => {
    if (navigator.geolocation && window.isSecureContext) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation([position.coords.latitude, position.coords.longitude])
          setLocationName("Ihr Standort")
          setShowLocationAlert(false)
          // Set default filters when using current location, including E-Scooter
          setFilters(["ch.bfe.sharedmobility.vehicle_type=E-Scooter"])
          setSearchRadius(DEFAULT_SEARCH_RADIUS) // Reset radius to default when finding current location
          toast({
            title: "Standort aktualisiert",
            description: "E-Scooter in Ihrer Nähe werden gesucht.",
          })
        },
        (error) => {
          setLoading(false)
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
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }, // Increased timeout
      )
    } else {
      toast({
        title: "Standort nicht verfügbar",
        description:
          "Die Geolokalisierung wird von Ihrem Browser nicht unterstützt oder Sie befinden sich in einem unsicheren Kontext.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    handleSetCurrentLocation()
  }, [])

  const fetchSpatialVehicles = async () => {
    if (!location[0] || !location[1]) return

    setLoading(true)
    setApiError(null)
    setVehicleLimitReached(false)

    try {
      const params = new URLSearchParams()
      params.append("Geometry", `${location[1]},${location[0]}`)
      params.append("Tolerance", searchRadius.toString())

      // Ensure E-Scooter filter is always present if no other vehicle type is selected
      const activeFilters = [...filters]
      const hasVehicleTypeFilter = filters.some((f) => f.startsWith("ch.bfe.sharedmobility.vehicle_type="))
      if (!hasVehicleTypeFilter) {
        activeFilters.push("ch.bfe.sharedmobility.vehicle_type=E-Scooter")
      }
      activeFilters.forEach((filter) => params.append("filters", filter))

      const response = await fetch(`/api/mobility?${params.toString()}`)

      if (!response.ok) {
        let errorDetails = `API responded with status: ${response.status}`
        try {
          const errorData = await response.json()
          errorDetails = errorData.details || errorData.error || "An unknown API error occurred."
        } catch (e) {
          console.error("Could not parse error response from API route.")
        }
        throw new Error(errorDetails)
      }

      const data: EsriJsonFeature[] = await response.json()

      if (data && Array.isArray(data)) {
        let convertedVehicles = data.map(convertEsriJsonToMobilityVehicle)
        setLastUpdated(new Date())

        if (convertedVehicles.length > MAX_VEHICLES_DISPLAY) {
          setVehicleLimitReached(true)
          convertedVehicles.sort((a, b) => {
            const coordsA = a.geometry.coordinates
            const coordsB = b.geometry.coordinates
            const distanceA = getDistanceFromLatLonInM(location[0], location[1], coordsA[1], coordsA[0])
            const distanceB = getDistanceFromLatLonInM(location[0], location[1], coordsB[1], coordsB[0])
            return distanceA - distanceB
          })
          convertedVehicles = convertedVehicles.slice(0, MAX_VEHICLES_DISPLAY)
        }

        setVehicles(convertedVehicles)

        if (convertedVehicles.length === 0) {
          toast({
            title: "Keine Fahrzeuge gefunden",
            description: "Versuchen Sie, den Suchradius oder die Filter anzupassen",
          })
        } else {
          toast({
            title: "Fahrzeuge geladen",
            description: `${convertedVehicles.length} Fahrzeuge innerhalb von ${(searchRadius / 1000).toFixed(1)}km gefunden`,
          })
        }
      } else {
        setVehicles([])
        toast({
          title: "Keine Fahrzeuge gefunden",
          description: "Unerwartetes Datenformat von der API erhalten.",
        })
      }
    } catch (error) {
      console.error("Error fetching spatial vehicles:", error)
      setApiError(error.message)
      setVehicles([])
      toast({
        title: "Fehler beim Laden der Fahrzeuge",
        description: error.message || "Bitte versuchen Sie es später erneut",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchSpatialVehicles()

    return () => {
      controller.abort()
    }
  }, [location, filters, searchRadius])

  function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c * 1000
    return d
  }

  function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
  }

  const handleFilterChange = (newFilters: string[]) => {
    setFilters(newFilters)
  }

  const handleVehicleSelect = (vehicle: MobilityVehicle) => {
    setSelectedVehicle(vehicle)
  }

  const handleLocationSearch = (newLocation: [number, number], name: string) => {
    setLocation(newLocation)
    setLocationName(name)
    setShowLocationAlert(false)
  }

  const handleDefaultLocationSelect = (locationData: { name: string; coords: [number, number] }) => {
    setLocation(locationData.coords)
    setLocationName(locationData.name)
    setShowLocationAlert(false)
  }

  const handleRadiusChange = (value: number[]) => {
    setSearchRadius(value[0])
  }

  const refreshData = () => {
    fetchSpatialVehicles()
  }

  const useMockData = () => {
    setApiError(null)
    setVehicleLimitReached(false)
    import("@/mock/mobility-data").then((module) => {
      setVehicles(module.default)
      setLastUpdated(new Date())
      toast({
        title: "Demo-Daten werden verwendet",
        description: "Umgeschaltet auf Demo-Modus mit Beispieldaten",
      })
    })
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold">Shared Mobility Finder</h1>
          <Button variant="outline" size="sm" onClick={refreshData} className="flex items-center gap-1 mt-2 sm:mt-0">
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
        </div>

        {lastUpdated && (
          <p className="text-sm text-muted-foreground mb-4">Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString()}</p>
        )}

        {showLocationAlert && (
          <Alert className="mb-6" variant="default">
            <MapPin className="h-4 w-4" />
            <AlertTitle>Standort auswählen</AlertTitle>
            <AlertDescription>
              Wählen Sie eine Stadt oder suchen Sie nach einem bestimmten Ort, um Fahrzeuge in der Nähe zu finden. Ihr
              aktueller Standort konnte nicht ermittelt werden oder Sie haben die Berechtigung verweigert.
            </AlertDescription>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4">
              {defaultLocations.map((loc) => (
                <Button key={loc.name} variant="outline" size="sm" onClick={() => handleDefaultLocationSelect(loc)}>
                  {loc.name}
                </Button>
              ))}
            </div>
          </Alert>
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

        {vehicleLimitReached && (
          <Alert className="mb-6" variant="warning">
            <Info className="h-4 w-4" />
            <AlertTitle>Anzeigelimit erreicht</AlertTitle>
            <AlertDescription>
              Es wurden mehr als {MAX_VEHICLES_DISPLAY} Fahrzeuge im aktuellen Suchbereich gefunden. Nur die nächsten{" "}
              {MAX_VEHICLES_DISPLAY} werden angezeigt. Verwenden Sie Filter oder verkleinern Sie den Suchradius, um
              genauere Ergebnisse zu erhalten.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <MobilityFilters
              onFilterChange={handleFilterChange}
              onLocationSearch={handleLocationSearch}
              onSetCurrentLocation={handleSetCurrentLocation}
              defaultLocations={defaultLocations}
              initialVehicleTypes={["E-Scooter"]} // Pass initial vehicle type
            />

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Suchradius</h2>
                <div className="flex items-center space-x-2">
                  <Slider
                    defaultValue={[DEFAULT_SEARCH_RADIUS]} // Use default radius for slider
                    max={10000} // Max radius 10km, can be adjusted
                    min={100} // Min radius 100m
                    step={100} // Step 100m
                    onValueChange={handleRadiusChange}
                    value={[searchRadius]}
                  />
                  <span className="min-w-[4rem] text-right">
                    {searchRadius >= 1000 ? `${(searchRadius / 1000).toFixed(1)} km` : `${searchRadius} m`}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setSearchRadius(DEFAULT_SEARCH_RADIUS) // Reset to 500m
                    setFilters(["ch.bfe.sharedmobility.vehicle_type=E-Scooter"]) // Reset filters, ensure E-Scooter is default
                  }}
                  variant="outline"
                >
                  Filter & Radius zurücksetzen
                </Button>
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-lg overflow-hidden border h-[70vh] relative">
              <div className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 px-3 py-1 rounded-md shadow-md text-sm font-medium">
                {`${locationName} • ${searchRadius >= 1000 ? `${(searchRadius / 1000).toFixed(1)} km` : `${searchRadius} m`} Radius`}
                <Badge variant="secondary" className="ml-2">
                  {vehicles.length} Fahrzeuge
                </Badge>
              </div>

              {loading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Fahrzeuge werden geladen...</span>
                </div>
              )}

              <Map
                center={location}
                vehicles={vehicles}
                onVehicleSelect={handleVehicleSelect}
                searchRadius={searchRadius}
                showRadius={true}
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
