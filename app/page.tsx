"use client"

import { useState, useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import MobilityFilters from "@/components/mobility-filters"
import VehicleDetails from "@/components/vehicle-details"
import { Loader2, AlertCircle, RefreshCw, Info, MapPin, LocateFixed } from "lucide-react" // LocateFixed importiert
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import AddToHomescreenModal from "@/components/add-to-homescreen-modal"

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

const defaultLocations = [
  { name: "Zürich SBB", coords: [47.3779, 8.5402] as [number, number] },
  { name: "Genf SBB", coords: [46.2108, 6.1426] as [number, number] },
  { name: "Basel SBB", coords: [47.5474, 7.5898] as [number, number] },
  { name: "Bern SBB", coords: [46.9498, 7.4391] as [number, number] },
]

const FIXED_SEARCH_RADIUS = 400
const DEFAULT_MAP_CENTER: [number, number] = [46.8182, 8.2275]
const DEFAULT_MAP_ZOOM_OVERVIEW = 8
const ACTIVE_SEARCH_ZOOM = 16 // Zoomstufe für aktive Suche (eigener Standort oder gewählter Ort)

const VEHICLE_TYPE_API_FILTERS = [
  "ch.bfe.sharedmobility.vehicle_type=E-Scooter",
  "ch.bfe.sharedmobility.vehicle_type=E-Bike",
  "ch.bfe.sharedmobility.vehicle_type=Car",
]

export default function Home() {
  const [vehicles, setVehicles] = useState<MobilityVehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<MobilityVehicle | null>(null)
  const [location, setLocation] = useState<[number, number] | null>(null) // Aktueller Suchmittelpunkt
  const [userLocationMarker, setUserLocationMarker] = useState<[number, number] | null>(null) // Position des blauen Punkts
  const [clickedLocationMarker, setClickedLocationMarker] = useState<[number, number] | null>(null)
  const [locationName, setLocationName] = useState<string>("")
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isHomescreenModalOpen, setIsHomescreenModalOpen] = useState(false)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [showCompass, setShowCompass] = useState(false) // Steuert Sichtbarkeit des Kompass-Markers
  const deviceOrientationListenerAttached = useRef(false)

  const { toast } = useToast()
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    let heading: number | null = null
    if (event.absolute && typeof event.alpha === "number") {
      heading = event.alpha
    } else if (typeof event.webkitCompassHeading === "number") {
      heading = event.webkitCompassHeading
    } else if (typeof event.alpha === "number" && !event.absolute) {
      heading = event.alpha
    }

    if (heading !== null) {
      setDeviceHeading((prevHeading) => {
        if (prevHeading === null || Math.abs(prevHeading - heading!) > 1) {
          return heading
        }
        return prevHeading
      })
    }
  }

  const startDeviceOrientationListener = () => {
    if (!deviceOrientationListenerAttached.current && window.DeviceOrientationEvent) {
      // @ts-ignore
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        // @ts-ignore
        DeviceOrientationEvent.requestPermission()
          .then((permissionState: string) => {
            if (permissionState === "granted") {
              // @ts-ignore
              window.addEventListener("deviceorientationabsolute", handleDeviceOrientation, true)
              // @ts-ignore
              window.addEventListener("deviceorientation", handleDeviceOrientation, true)
              deviceOrientationListenerAttached.current = true
              console.log("Device orientation listeners attached after permission grant.")
            } else {
              toast({
                title: "Kompass nicht verfügbar",
                description: "Zugriff auf Geräteausrichtung verweigert.",
                variant: "default", // Weniger aufdringlich als destructive
              })
            }
          })
          .catch((error: any) => {
            console.error("Error requesting device orientation permission:", error)
            // Fallback für Browser ohne requestPermission oder bei Fehler
            // @ts-ignore
            window.addEventListener("deviceorientationabsolute", handleDeviceOrientation, true)
            // @ts-ignore
            window.addEventListener("deviceorientation", handleDeviceOrientation, true)
            deviceOrientationListenerAttached.current = true
            console.log("Device orientation listeners attached (fallback).")
          })
      } else {
        // Für Browser, die keine explizite requestPermission API haben
        // @ts-ignore
        window.addEventListener("deviceorientationabsolute", handleDeviceOrientation, true)
        // @ts-ignore
        window.addEventListener("deviceorientation", handleDeviceOrientation, true)
        deviceOrientationListenerAttached.current = true
        console.log("Device orientation listeners attached (no requestPermission API).")
      }
    }
  }

  const stopDeviceOrientationListener = () => {
    if (deviceOrientationListenerAttached.current && window.DeviceOrientationEvent) {
      // @ts-ignore
      window.removeEventListener("deviceorientationabsolute", handleDeviceOrientation, true)
      // @ts-ignore
      window.removeEventListener("deviceorientation", handleDeviceOrientation, true)
      deviceOrientationListenerAttached.current = false
      console.log("Device orientation listeners removed.")
    }
    setDeviceHeading(null)
    setShowCompass(false)
  }

  const clearUserLocationStateAndCompass = () => {
    setUserLocationMarker(null) // Blauen Punkt entfernen
    stopDeviceOrientationListener() // Kompass stoppen und ausblenden
  }

  const handleSetCurrentLocation = () => {
    if (navigator.geolocation && window.isSecureContext) {
      setLoading(true)
      clearUserLocationStateAndCompass() // Vorherigen Zustand ggf. zurücksetzen

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setLocation(currentCoords) // Suchmittelpunkt setzen -> löst fetchSpatialVehicles aus
          setUserLocationMarker(currentCoords) // Blauen Punkt setzen
          setClickedLocationMarker(null) // Klick-Marker entfernen
          setLocationName("Mein Standort")

          startDeviceOrientationListener() // Kompass-Listener starten
          setShowCompass(true) // Kompass-Anzeige auf Karte aktivieren

          setLoading(false)
          toast({
            title: "Standort ermittelt",
            description: `Fahrzeuge in Ihrer Nähe (Radius: ${FIXED_SEARCH_RADIUS}m) werden geladen.`,
          })
        },
        (error) => {
          setLoading(false)
          clearUserLocationStateAndCompass()
          console.log(`Geolocation error (${error.code}): ${error.message}`)
          let description = "Ihr Standort konnte nicht ermittelt werden."
          if (error.code === 1) {
            description =
              "Bitte erteilen Sie die Berechtigung, um Ihren Standort und die Geräteausrichtung zu verwenden."
          }
          toast({
            title: "Standortfehler",
            description: description,
            variant: "destructive",
          })
        },
        { timeout: 10000, enableHighAccuracy: true },
      )
    } else {
      setLoading(false)
      toast({
        title: "Standort nicht verfügbar",
        description:
          "Die Geolokalisierung wird von Ihrem Browser nicht unterstützt oder Sie befinden sich in einem unsicheren Kontext (HTTPS erforderlich).",
        variant: "destructive",
      })
    }
  }

  // Cleanup für Kompass-Listener, wenn Komponente unmounted wird
  useEffect(() => {
    return () => {
      stopDeviceOrientationListener()
    }
  }, [])

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

  const fetchSpatialVehicles = async (currentSearchLocation: [number, number]) => {
    if (!currentSearchLocation || !currentSearchLocation[0] || !currentSearchLocation[1]) return

    setLoading(true)
    setApiError(null)
    // Fahrzeuge nicht sofort leeren, um Flackern zu vermeiden, wenn nur aktualisiert wird
    // setVehicles([])

    try {
      const vehiclePromises = VEHICLE_TYPE_API_FILTERS.map((filter) =>
        fetchVehiclesForType(filter, currentSearchLocation, FIXED_SEARCH_RADIUS.toString()),
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
      fetchSpatialVehicles(location)
      if (mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    } else {
      setVehicles([]) // Leere Fahrzeuge, wenn kein Standort (z.B. initial)
      setLoading(false)
    }
  }, [location]) // Abhängigkeit nur von 'location'

  const handleVehicleSelect = (vehicle: MobilityVehicle) => {
    setSelectedVehicle(vehicle)
  }

  const handleLocationSearch = (newLocation: [number, number], name: string) => {
    clearUserLocationStateAndCompass() // Kompass und blauen Punkt entfernen
    setLoading(true)
    setLocation(newLocation) // Dies löst den useEffect für fetchSpatialVehicles aus
    setLocationName(name)
    setClickedLocationMarker(newLocation) // Klick-Marker für gesuchten Ort setzen
  }

  const handleDefaultLocationSelect = (locationData: { name: string; coords: [number, number] }) => {
    clearUserLocationStateAndCompass() // Kompass und blauen Punkt entfernen
    setLoading(true)
    setLocation(locationData.coords)
    setLocationName(locationData.name)
    setClickedLocationMarker(null) // Bei Default-Locations keinen expliziten Klick-Marker, Karte zentriert sich eh
  }

  const refreshData = () => {
    if (location) {
      fetchSpatialVehicles(location)
    } else {
      toast({
        title: "Kein Standort ausgewählt",
        description: "Bitte wählen Sie zuerst einen Standort aus, um die Daten zu aktualisieren.",
        variant: "default",
      })
    }
  }

  const useMockData = () => {
    clearUserLocationStateAndCompass()
    setApiError(null)
    setLoading(true)
    setLocation(null)
    setLocationName("Demo Daten")
    setClickedLocationMarker(null)
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

  const handleMapInteractionSearch = (newCenter: [number, number], type: "move" | "click") => {
    if (type === "click" && selectedVehicle) {
      setSelectedVehicle(null)
      return
    }
    if (type === "click") {
      clearUserLocationStateAndCompass() // Kompass und blauen Punkt entfernen
      setClickedLocationMarker(newCenter) // Klick-Marker für Kartenklick setzen
      setLocationName("Ausgewählter Punkt")
      setLocation(newCenter) // Dies löst den useEffect für fetchSpatialVehicles aus
    }
  }

  const currentMapZoom = location ? ACTIVE_SEARCH_ZOOM : DEFAULT_MAP_ZOOM_OVERVIEW

  return (
    <main className="flex min-h-screen flex-col">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-row justify-between items-center mb-6">
          <div className="flex-1">
            <img src="/my-ride-radar-logo.png" alt="My Ride Radar Logo" className="h-7 sm:h-8 w-auto" />
            <p className="text-sm text-gray-600 mt-2">Alle Sharing-Anbieter auf einen Blick.</p>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHomescreenModalOpen(true)}
              className="h-6 w-6 sm:hidden p-0"
              aria-label="Informationen zum Hinzufügen zum Startbildschirm"
            >
              <Info className="h-3.5 w-3.5 text-gray-500" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="hidden sm:flex items-center gap-1 ml-2"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Aktualisieren
            </Button>
          </div>
        </div>

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
              isUserLocationActive={!!userLocationMarker} // Um den Button-Zustand zu steuern
            />
            <div className="mt-4 sm:hidden">
              <div className="flex items-center justify-start space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="flex items-center gap-1"
                  disabled={loading}
                >
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
            <div className="rounded-lg overflow-hidden border h-[70vh] relative" ref={mapContainerRef}>
              {locationName && !loading && (
                <div className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 px-3 py-1 rounded-md shadow-md text-sm font-medium flex items-center">
                  {userLocationMarker && <LocateFixed className="h-4 w-4 mr-1.5 text-blue-500" />}
                  {clickedLocationMarker && <MapPin className="h-4 w-4 mr-1.5 text-red-500" />}
                  {!userLocationMarker && !clickedLocationMarker && location && (
                    <MapPin className="h-4 w-4 mr-1.5 text-gray-500" />
                  )}
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
                currentZoom={currentMapZoom} // Umbenannt von initialZoom zu currentZoom für Klarheit
                vehicles={vehicles}
                onVehicleSelect={handleVehicleSelect}
                searchRadius={FIXED_SEARCH_RADIUS}
                userLocation={userLocationMarker}
                clickedLocation={clickedLocationMarker}
                showRadius={!!location}
                onMapInteraction={handleMapInteractionSearch}
                deviceHeading={deviceHeading}
                showCompass={showCompass}
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
      <AddToHomescreenModal open={isHomescreenModalOpen} onOpenChange={setIsHomescreenModalOpen} />
    </main>
  )
}
