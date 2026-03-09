"use client"

import { useState, useEffect, useRef } from "react"
import { X, Share2, PlusSquare, Check } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface Props {
  hasResults: boolean
}

const STORAGE_KEY = "pwa-prompt-seen"

export default function PwaInstallPrompt({ hasResults }: Props) {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const triggered = useRef(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    if (window.matchMedia("(display-mode: standalone)").matches) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    if (!hasResults || triggered.current) return
    if (localStorage.getItem(STORAGE_KEY)) return
    triggered.current = true
    const id = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(id)
  }, [hasResults])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    dismiss()
  }

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, "1")
  }

  if (!visible) return null
  if (!isIOS && !deferredPrompt) return null

  const iosSteps = [
    { icon: <Share2 className="w-3.5 h-3.5 shrink-0" />, label: "Teilen" },
    { icon: <PlusSquare className="w-3.5 h-3.5 shrink-0" />, label: "Zum Home-Bildschirm" },
    { icon: <Check className="w-3.5 h-3.5 shrink-0" />, label: "Fertig" },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[650]" onClick={dismiss} />

      {/* Card */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[651] px-4 pwa-card-enter"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="glass rounded-2xl p-4 shadow-2xl max-w-sm mx-auto relative">
          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-apple"
            aria-label="Schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-3 pr-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="MyRideRadar" className="w-12 h-12 rounded-xl shadow-sm shrink-0" />
            <div>
              <div className="font-semibold text-sm leading-tight">MyRideRadar</div>
              <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                Immer griffbereit — ganz ohne Browser
              </div>
            </div>
          </div>

          {/* Action */}
          {isIOS ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {iosSteps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-medium pwa-step"
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  {step.icon}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-apple active:scale-[0.98]"
            >
              App installieren
            </button>
          )}
        </div>
      </div>
    </>
  )
}
