"use client"

import type { MobilityVehicle } from "@/types/mobility"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bike, Car, ExternalLink, MapPin, Phone, X, CreditCard } from "lucide-react"
import Link from "next/link"

const providerPricing: Record<string, { unlockFee: string; perMinuteRate: string }> = {
  "Bolt Technology OÜ": { unlockFee: "0.50 CHF", perMinuteRate: "0.49 CHF" },
  "Voi Technology AB": { unlockFee: "1 CHF", perMinuteRate: "0.44 CHF" },
  "bird basel": { unlockFee: "1 CHF", perMinuteRate: "0.45 CHF" },
  "Lime City partners from Partners::RegionFeedMediator": { unlockFee: "1 CHF", perMinuteRate: "0.46 CHF" },
  // Stelle sicher, dass die Namen exakt mit denen aus der API übereinstimmen
  // Beispiel für Lime, falls der Name in der API leicht abweicht:
  // "Lime": { unlockFee: "1 CHF", perMinuteRate: "0.46 CHF" },
}

interface VehicleDetailsProps {
  vehicle: MobilityVehicle
  onClose: () => void
}

export default function VehicleDetails({ vehicle, onClose }: VehicleDetailsProps) {
  const { properties } = vehicle
  const { provider, station, vehicle_type, available } = properties
  const pricing = providerPricing[provider.name] // Hier holen wir die Tarifinfo

  // Get appropriate icon based on vehicle type
  const getVehicleIcon = () => {
    switch (vehicle_type?.toLowerCase()) {
      case "bicycle":
      case "bike":
      case "e-bike":
        return <Bike className="h-5 w-5" />
      case "car":
        return <Car className="h-5 w-5" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            {getVehicleIcon()}
            {provider.name}
          </CardTitle>
          <CardDescription>
            {vehicle_type}{" "}
            {available ? (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">
                Verfügbar
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 hover:bg-red-50">
                Nicht verfügbar
              </Badge>
            )}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {station && (
            <div className="grid gap-1">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Stationsinformationen
              </h3>
              <p className="text-sm">{station.name}</p>
              {station.address && <p className="text-sm text-muted-foreground">{station.address}</p>}
              {station.postcode && <p className="text-sm text-muted-foreground">{station.postcode}</p>}
              {station.status && (
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground">
                    Verfügbare Fahrzeuge: {station.status.num_vehicle_available || 0}
                  </p>
                </div>
              )}
            </div>
          )}

          {provider && (
            <div className="grid gap-1">
              <h3 className="font-semibold text-sm">Anbieterdetails</h3>
              {provider.phone && (
                <p className="text-sm flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {provider.phone}
                </p>
              )}
            </div>
          )}

          {pricing && (
            <div className="grid gap-1">
              <h3 className="font-semibold text-sm flex items-center gap-1">
                <CreditCard className="h-4 w-4" /> Tarifinformationen
              </h3>
              <p className="text-sm">Freischaltgebühr: {pricing.unlockFee}</p>
              <p className="text-sm">Pro Minute: {pricing.perMinuteRate}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onClose}>
          Schließen
        </Button>
        {provider.apps?.ios?.store_uri?.[0] && (
          <Button asChild size="sm">
            <Link href={provider.apps.ios.store_uri[0]} target="_blank" rel="noopener noreferrer">
              App öffnen <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
