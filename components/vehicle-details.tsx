"use client"

import type { MobilityVehicle } from "@/types/mobility"
import { MapPin, Phone, CreditCard, ExternalLink, X, ChevronUp, Navigation } from "lucide-react"
import { useState } from "react"
import { getProviderInfo } from "@/lib/providers"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"

interface VehicleDetailsProps {
  vehicle: MobilityVehicle
  onClose: () => void
  locale: Locale
}

export default function VehicleDetails({ vehicle, onClose, locale }: VehicleDetailsProps) {
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
          <div className="w-10 h-[5px] rounded-full bg-black/10 dark:bg-white/15" />
        </div>

        {/* Compact Header */}
        <div className="px-5 pb-5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-md ring-1 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: info.logo ? "white" : color }}
              >
                {info.logo ? (
                  <img src={info.logo} alt={info.shortName} className="w-full h-full object-cover" />
                ) : (
                  info.shortName
                )}
              </div>
              <div>
                <h3 className="font-semibold text-[15px] leading-tight tracking-[-0.01em]">{provider.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-medium">{vehicle_type}</span>
                  {info.swisspass && (
                    <span className="badge-swisspass text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      SwissPass
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      available
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-emerald-500/10 dark:ring-emerald-400/20"
                        : "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400 ring-1 ring-red-500/10 dark:ring-red-400/20"
                    }`}
                  >
                    {available ? t(locale, "available") : t(locale, "occupied")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(station || provider.phone || pricing) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2.5 rounded-full bg-secondary/80 hover:bg-secondary transition-apple active:scale-95"
                  aria-label={t(locale, isExpanded ? "showLess" : "showMore")}
                >
                  <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2.5 rounded-full bg-secondary/80 hover:bg-secondary transition-apple active:scale-95"
                aria-label={t(locale, "close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expandable Details */}
          {isExpanded && (
            <div className="mt-4 space-y-3 animate-fade-in">
              {station && (
                <div className="bg-secondary/60 rounded-2xl p-4 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{station.name}</p>
                      {station.address && <p className="text-xs text-muted-foreground mt-0.5">{station.address}</p>}
                      {station.postcode && <p className="text-xs text-muted-foreground">{station.postcode}</p>}
                      {station.status?.num_vehicle_available != null && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-semibold text-foreground">{station.status.num_vehicle_available}</span>{" "}
                          {t(locale, "stationVehicles")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {pricing && (
                <div className="bg-secondary/60 rounded-2xl p-4 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-muted-foreground text-xs">{t(locale, "pricingUnlock")}</span>
                          <p className="font-semibold">{pricing.unlock} CHF</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div>
                          <span className="text-muted-foreground text-xs">{t(locale, "pricingPerMin")}</span>
                          <p className="font-semibold">{pricing.minute} CHF</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        {t(locale, "pricingDisclaimer")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {provider.phone && (
                <div className="flex items-center gap-3 px-1">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <a href={`tel:${provider.phone}`} className="text-sm text-primary font-semibold hover:underline">
                    {provider.phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {appLink && (
            <a
              href={appLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 rounded-2xl text-white text-sm font-semibold transition-apple hover:opacity-90 active:scale-[0.98] shadow-lg"
              style={{ backgroundColor: color, boxShadow: `0 4px 14px ${color}40` }}
            >
              {t(locale, "openInApp")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {(() => {
            const [lon, lat] = vehicle.geometry.coordinates
            const isIosNav = typeof window !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
            const navUrl = isIosNav
              ? `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w`
              : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
            return (
              <a href={navUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-2 py-3.5 rounded-2xl text-sm font-semibold border border-border bg-secondary/60 hover:bg-secondary transition-apple active:scale-[0.98]">
                <Navigation className="h-3.5 w-3.5" />
                {t(locale, "navigateOnFoot")}
              </a>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
