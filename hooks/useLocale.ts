"use client"
import { useState, useEffect } from "react"
import type { Locale } from "@/lib/i18n"

const LOCALE_KEY = "myrideradar_locale"
const SUPPORTED: Locale[] = ["de", "fr", "it"]

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale
    if (stored && SUPPORTED.includes(stored)) return stored
    const browser = navigator.language.split("-")[0] as Locale
    if (SUPPORTED.includes(browser)) return browser
  } catch {}
  return "de"
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("de")
  useEffect(() => { setLocaleState(detectLocale()) }, [])
  const setLocale = (l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem(LOCALE_KEY, l) } catch {}
  }
  return { locale, setLocale }
}
