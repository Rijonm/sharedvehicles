"use client"

import { useState, useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import MobilityFilters from "@/components/mobility-filters"
import VehicleDetails from "@/components/vehicle-details"
import { Loader2, AlertCircle, RefreshCw, Info, MapPin, Compass } from "lucide-react"
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
const ACTIVE_SEARCH_INITIAL_ZOOM = 16 // Wird für Live-Tracking ggf. dynamischer
const LIVE_TRACKING_ZOOM = 17 // Zoomstufe für Live-Tracking

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
  const [clickedLocationMarker, setClickedLocationMarker] = useState<[number, number] | null>(null)
  const [locationName, setLocationName] = useState<string>("")
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isHomescreenModalOpen, setIsHomescreenModalOpen] = useState(false)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [showCompass, setShowCompass] = useState(false)
  const [isLiveTracking, setIsLiveTracking] = useState(false) // Neuer State für Live-Tracking Modus
  const watchIdRef = useRef<number | null>(null) // Ref für die watchPosition ID

  const { toast } = useToast()
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsLiveTracking(false)
    setShowCompass(false)
    // Optional: userLocationMarker beibehalten oder entfernen? Aktuell wird er nicht entfernt.
  }

  const handleSetCurrentLocation = () => {
    if (navigator.geolocation && window.isSecureContext) {
      setLoading(true)
      stopLiveTracking() // Vorheriges Tracking stoppen, falls aktiv

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const currentCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setLocation(currentCoords) // Suchmittelpunkt ist der eigene Standort
          setUserLocationMarker(currentCoords) // Blauen Punkt setzen/aktualisieren
          setClickedLocationMarker(null) // Klick-Marker entfernen
          setLocationName("Ihr Standort (Live)")
          setShowCompass(true)
          setIsLiveTracking(true) // Live-Tracking Modus aktivieren
          setLoading(false) // Ladeindikator entfernen nach erstem erfolgreichen Fix

          // Nur einmalig eine Toast-Nachricht anzeigen, wenn Live-Tracking startet
          if (!isLiveTracking) {
            toast({
              title: "Live-Standort aktiv",
              description: `Position und Fahrzeuge in Ihrer Nähe (Radius: ${FIXED_SEARCH_RADIUS}m) werden laufend aktualisiert.`,
            })
          }
        },
        (error) => {
          setLoading(false)
          stopLiveTracking()
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
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }, // maximumAge: 0 für frischeste Daten
      )
    } else {
      setLoading(false)
      toast({
        title: "Standort nicht verfügbar",
        description:
          "Die Geolokalisierung wird von Ihrem Browser nicht unterstützt oder Sie befinden sich in einem unsicheren Kontext.",
        variant: "destructive",
      })
    }
  }

  // Effekt zum Stoppen des Trackings beim Verlassen der Komponente
  useEffect(() => {
    return () => {
      stopLiveTracking()
    }
  }, [])

  useEffect(() => {
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null
      if (event.absolute && typeof event.alpha === "number") {
        heading = event.alpha
      } else if (typeof event.webkitCompassHeading === "number") {
        heading = event.webkitCompassHeading
      } else if (typeof event.alpha === "number" && !event.absolute && event.beta !== null && event.gamma !== null) {
        heading = event.alpha
      }
      // Nur aktualisieren, wenn sich der Wert merklich ändert, um unnötige Re-Renders zu vermeiden
      if (heading !== null) {
        setDeviceHeading((prevHeading) => {
          if (prevHeading === null || Math.abs(prevHeading - heading!) > 1) {
            // Toleranz von 1 Grad
            return heading
          }
          return prevHeading
        })
      }
    }

    if (showCompass && window.DeviceOrientationEvent) {
      const options = { capture: true }
      // @ts-ignore
      window.addEventListener("deviceorientationabsolute", handleDeviceOrientation, options)
      // @ts-ignore
      window.addEventListener("deviceorientation", handleDeviceOrientation, options)
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        // @ts-ignore
        window.removeEventListener("deviceorientationabsolute", handleDeviceOrientation, true)
        // @ts-ignore
        window.removeEventListener("deviceorientation", handleDeviceOrientation, true)
      }
    }
  }, [showCompass])

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

    // Nur laden, wenn nicht bereits ein Ladevorgang für Fahrzeuge aktiv ist (um Überlappung zu vermeiden)
    // Dies ist eine einfache Sperre, könnte bei Bedarf verfeinert werden.
    if (loading && !isLiveTracking) return // Bei Live-Tracking darf 'loading' kurz sein für die Fahrzeugsuche

    setLoading(true)
    setApiError(null)
    // Fahrzeuge nicht sofort leeren, wenn Live-Tracking aktiv ist, um Flackern zu vermeiden
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
      setVehicles(finalVehicles) // Fahrzeuge aktualisieren
      setLastUpdated(new Date())

      if (!isLiveTracking) {
        // Toast nur, wenn kein Live-Tracking aktiv ist oder initial
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
      }
    } catch (error) {
      console.error("Error fetching spatial vehicles (Promise.all level):", error)
      const message = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten."
      setApiError(message)
      setVehicles([])
      if (!isLiveTracking) {
        toast({
          title: "Fehler beim Laden der Fahrzeuge",
          description: message,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // useEffect für die Fahrzeugsuche, wenn sich 'location' ändert
  useEffect(() => {
    if (location) {
      fetchSpatialVehicles(location)
      // Scroll zur Karte nur, wenn kein Live-Tracking aktiv ist, um Springen zu vermeiden
      if (!isLiveTracking && mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    } else {
      setVehicles([])
      setLoading(false) // Sicherstellen, dass Loading auf false ist, wenn kein Standort
    }
  }, [location]) // Abhängigkeit von 'location'

  const handleVehicleSelect = (vehicle: MobilityVehicle) => {
    setSelectedVehicle(vehicle)
  }

  const handleLocationSearch = (newLocation: [number, number], name: string) => {
    stopLiveTracking() // Live-Tracking stoppen, wenn manuell gesucht wird
    setLoading(true) // Loading für die neue Suche setzen
    setLocation(newLocation) // Dies löst den useEffect für fetchSpatialVehicles aus
    setLocationName(name)
    setUserLocationMarker(null)
    setClickedLocationMarker(newLocation)
  }

  const handleDefaultLocationSelect = (locationData: { name: string; coords: [number, number] }) => {
    stopLiveTracking()
    setLoading(true)
    setLocation(locationData.coords)
    setLocationName(locationData.name)
    setUserLocationMarker(null)
    setClickedLocationMarker(null) // Bei Default-Locations keinen Klick-Marker
  }

  const refreshData = () => {
    if (location) {
      fetchSpatialVehicles(location) // Explizit mit der aktuellen Location
    } else {
      toast({
        title: "Kein Standort ausgewählt",
        description: "Bitte wählen Sie zuerst einen Standort aus, um die Daten zu aktualisieren.",
        variant: "default",
      })
    }
  }

  const useMockData = () => {
    stopLiveTracking()
    setApiError(null)
    setLoading(true)
    setLocation(null) // Kein aktiver Standort für Mock-Daten
    setLocationName("Demo Daten")
    setUserLocationMarker(null)
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
      stopLiveTracking() // Live-Tracking stoppen bei Klick auf Karte
      setClickedLocationMarker(newCenter)
      setUserLocationMarker(null)
      setLocationName("Ausgewählter Punkt")
      setLocation(newCenter) // Dies löst den useEffect für fetchSpatialVehicles aus
    }
  }

  const currentMapZoom = isLiveTracking
    ? LIVE_TRACKING_ZOOM
    : location
      ? ACTIVE_SEARCH_INITIAL_ZOOM
      : DEFAULT_MAP_ZOOM_OVERVIEW

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
              disabled={loading && !isLiveTracking} // Deaktivieren während normalem Laden
            >
              <RefreshCw className="h-4 w-4" />
              Aktualisieren
            </Button>
          </div>
        </div>

        {lastUpdated && locationName && (
          <p className="text-sm text-muted-foreground mb-4 hidden sm:block">
            Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString()} {isLiveTracking && "(Live)"}
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
              isLiveTrackingActive={isLiveTracking}
            />
            <div className="mt-4 sm:hidden">
              <div className="flex items-center justify-start space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="flex items-center gap-1"
                  disabled={loading && !isLiveTracking}
                >
                  <RefreshCw className="h-4 w-4" />
                  Aktualisieren
                </Button>
                {lastUpdated && locationName && (
                  <p className="text-xs text-muted-foreground">
                    Aktualisiert: {lastUpdated.toLocaleTimeString()} {isLiveTracking && "(Live)"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-lg overflow-hidden border h-[70vh] relative" ref={mapContainerRef}>
              {locationName &&
                !loading && ( // Badge-Anzeige auch während Live-Loading der Fahrzeuge
                  <div className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 px-3 py-1 rounded-md shadow-md text-sm font-medium flex items-center">
                    {clickedLocationMarker && <MapPin className="h-4 w-4 mr-1.5 text-red-500" />}
                    {userLocationMarker && <Compass className="h-4 w-4 mr-1.5 text-blue-500" />}
                    {!userLocationMarker && !clickedLocationMarker && location && (
                      <MapPin className="h-4 w-4 mr-1.5 text-gray-500" />
                    )}
                    {`${locationName} • ${FIXED_SEARCH_RADIUS}m Radius`}
                    <Badge variant="secondary" className="ml-2">
                      {vehicles.length} Fahrzeuge
                    </Badge>
                  </div>
                )}
              {loading &&
                !isLiveTracking && ( // Ladeanzeige nur, wenn KEIN Live-Tracking aktiv ist (da Fahrzeuge im Hintergrund laden)
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Fahrzeuge werden geladen...</span>
                  </div>
                )}
              <LeafletMap
                center={location || DEFAULT_MAP_CENTER}
                initialZoom={currentMapZoom} // Dynamischer Zoom basierend auf Live-Tracking
                vehicles={vehicles}
                onVehicleSelect={handleVehicleSelect}
                searchRadius={FIXED_SEARCH_RADIUS}
                userLocation={userLocationMarker}
                clickedLocation={clickedLocationMarker}
                showRadius={!!location}
                onMapInteraction={handleMapInteractionSearch}
                isSearchOnMapMoveActive={false}
                deviceHeading={deviceHeading}
                showCompass={showCompass}
                isLiveTracking={isLiveTracking} // Map mitteilen, ob Live-Tracking aktiv ist
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
