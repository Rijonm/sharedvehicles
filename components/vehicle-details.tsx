"use client"

import type { MobilityVehicle } from "@/types/mobility"
import { MapPin, Phone, CreditCard, ExternalLink, X, ChevronUp } from "lucide-react"
import { useState } from "react"
import { getProviderInfo } from "@/lib/providers"

interface VehicleDetailsProps {
  vehicle: MobilityVehicle
  onClose: () => void
}

export default function VehicleDetails({ vehicle, onClose }: VehicleDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { properties } = vehicle
  const { provider, station, vehicle_type, available } = properties
  const info = getProviderInfo(provider.name)
  const pricing = info.pricing
  const color = info.color
  const isIos = typeof window !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const appLink = isIos
    ? (provider.apps?.ios?.discovery_uri || provider.apps?.ios?.store_uri?.[0] || provider.apps?.android?.discovery_uri || provider.apps?.android?.store_uri?.[0])
    : (provider.apps?.android?.discovery_uri || provider.apps?.android?.store_uri?.[0] || provider.apps?.ios?.discovery_uri || provider.apps?.ios?.store_uri?.[0])

  return (
    <div className="animate-slide-up">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="glass rounded-t-3xl shadow-2xl overflow-hidden mx-0">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/20" />
        </div>

        {/* Compact Header */}
        <div className="px-5 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: info.logo ? "white" : color }}
              >
                {info.logo ? (
                  <img src={info.logo} alt={info.shortName} className="w-full h-full object-cover" />
                ) : (
                  info.shortName
                )}
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">{provider.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{vehicle_type}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      available
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {available ? "Verfügbar" : "Belegt"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(station || provider.phone || pricing) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-apple"
                  aria-label={isExpanded ? "Weniger anzeigen" : "Mehr anzeigen"}
                >
                  <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-apple"
                aria-label="Schliessen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expandable Details */}
          {isExpanded && (
            <div className="mt-4 space-y-3 animate-fade-in">
              {station && (
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{station.name}</p>
                      {station.address && <p className="text-xs text-muted-foreground mt-0.5">{station.address}</p>}
                      {station.postcode && <p className="text-xs text-muted-foreground">{station.postcode}</p>}
                      {station.status?.num_vehicle_available != null && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          <span className="font-medium text-foreground">{station.status.num_vehicle_available}</span>{" "}
                          Fahrzeuge verfügbar
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {pricing && (
                <div className="flex items-center gap-3 px-1">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Freischaltung </span>
                    <span className="font-medium">{pricing.unlock} CHF</span>
                    <span className="text-muted-foreground mx-2">·</span>
                    <span className="text-muted-foreground">Pro Minute </span>
                    <span className="font-medium">{pricing.minute} CHF</span>
                  </div>
                </div>
              )}

              {provider.phone && (
                <div className="flex items-center gap-3 px-1">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${provider.phone}`} className="text-sm text-primary font-medium">
                    {provider.phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {appLink && (
            <a
              href={appLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-4 py-3 rounded-2xl text-white text-sm font-semibold transition-apple hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: color }}
            >
              Jetzt mieten
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
