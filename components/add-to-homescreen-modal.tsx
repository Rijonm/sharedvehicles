"use client"

import { useState } from "react"
import { X, Share, EllipsisVertical } from "lucide-react"

interface AddToHomescreenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddToHomescreenModal({ open, onOpenChange }: AddToHomescreenModalProps) {
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* Modal */}
      <div className="relative glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[400px] shadow-2xl animate-slide-up safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/20" />
        </div>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary transition-apple"
          aria-label="Schliessen"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-5 pb-6">
          <h2 className="text-lg font-semibold">App installieren</h2>
          <p className="text-sm text-muted-foreground mt-1">Für schnelleren Zugriff auf MyRideRadar.</p>

          {/* Tab Switcher */}
          <div className="flex gap-1 mt-5 p-1 bg-secondary/60 rounded-xl">
            <button
              onClick={() => setActiveTab("ios")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-apple ${
                activeTab === "ios"
                  ? "bg-white dark:bg-white/10 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              iPhone / iPad
            </button>
            <button
              onClick={() => setActiveTab("android")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-apple ${
                activeTab === "android"
                  ? "bg-white dark:bg-white/10 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Android
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-5">
            {activeTab === "ios" ? (
              <div className="space-y-4">
                <Step number={1} icon={<Share className="h-4 w-4 text-primary" />}>
                  Tippe auf das <strong>Teilen-Symbol</strong> in der Safari-Leiste
                </Step>
                <Step number={2}>
                  Scrolle nach unten und wähle <strong>&quot;Zum Home-Bildschirm&quot;</strong>
                </Step>
                <Step number={3}>
                  Tippe auf <strong>&quot;Hinzufügen&quot;</strong>
                </Step>
              </div>
            ) : (
              <div className="space-y-4">
                <Step number={1} icon={<EllipsisVertical className="h-4 w-4 text-primary" />}>
                  Tippe auf das <strong>Menü (⋮)</strong> in Chrome
                </Step>
                <Step number={2}>
                  Wähle <strong>&quot;Zum Startbildschirm hinzufügen&quot;</strong>
                </Step>
                <Step number={3}>
                  Bestätige mit <strong>&quot;Hinzufügen&quot;</strong>
                </Step>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ number, icon, children }: { number: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon || <span className="text-xs font-semibold text-primary">{number}</span>}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pt-1">{children}</p>
    </div>
  )
}
