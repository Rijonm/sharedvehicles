"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Search, Navigation, ChevronDown, Star } from "lucide-react"
import { searchLocationSuggestions, searchLocation } from "@/lib/api"

interface MobilityFiltersProps {
  onLocationSearch: (location: [number, number], name: string) => void
  onSetCurrentLocation: () => void
  defaultLocations: { name: string; coords: [number, number] }[]
  locationName: string
  vehicleCount: number
  lastUpdated: Date | null
  activeTypes: Set<string>
  onTypeToggle: (type: string) => void
  searchRadius: number
  onRadiusChange: (r: number) => void
  currentCoords: [number, number] | null
}

interface Suggestion {
  id: string
  attrs: {
    label: string
    lon: number
    lat: number
  }
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "")

const FAVORITES_KEY = "myrideradar_favorites"
function loadFavorites(): { name: string; coords: [number, number] }[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]") } catch { return [] }
}
function saveFavorites(favs: { name: string; coords: [number, number] }[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
}

export default function MobilityFilters({
  onLocationSearch,
  onSetCurrentLocation,
  defaultLocations,
  locationName,
  activeTypes,
  onTypeToggle,
  searchRadius,
  onRadiusChange,
  currentCoords,
}: MobilityFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [favorites, setFavorites] = useState<{ name: string; coords: [number, number] }[]>([])
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([])
      setIsSuggestionsVisible(false)
      return
    }

    const handler = setTimeout(async () => {
      const results = await searchLocationSuggestions(searchQuery)
      if (results.length > 0) {
        setSuggestions(results)
        setIsSuggestionsVisible(true)
      } else {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false)
        setIsExpanded(false)
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => { setFavorites(loadFavorites()) }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    const result = await searchLocation(query)
    if (result) {
      setSearchQuery("")
      setIsSuggestionsVisible(false)
      setIsExpanded(false)
      setIsFocused(false)
      onLocationSearch([result.lat, result.lon], result.label)
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const { lat, lon, label } = suggestion.attrs
    const displayName = stripHtml(label)
    setSearchQuery("")
    setIsSuggestionsVisible(false)
    setIsExpanded(false)
    setIsFocused(false)
    onLocationSearch([lat, lon], displayName)
  }

  const handleCurrentLocation = () => {
    setIsExpanded(false)
    setIsFocused(false)
    onSetCurrentLocation()
  }

  return (
    <div ref={searchContainerRef} className="relative">
      {/* Main Search Bar */}
      <div
        className={`glass rounded-2xl shadow-lg transition-apple overflow-hidden ${
          isFocused || isExpanded ? "shadow-xl ring-1 ring-black/5 dark:ring-white/10" : ""
        }`}
      >
        {/* Search Input Row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Search className="h-4.5 w-4.5 text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={locationName || "Standort suchen..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true)
              setIsExpanded(true)
              if (searchQuery.length > 2) setIsSuggestionsVisible(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(searchQuery)
              if (e.key === "Escape") {
                setIsFocused(false)
                setIsExpanded(false)
                inputRef.current?.blur()
              }
            }}
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50"
            autoComplete="off"
          />
          {!isFocused && !isExpanded && (
            <button
              onClick={() => {
                setIsExpanded(true)
                inputRef.current?.focus()
              }}
              className="p-1.5 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-apple"
              aria-label="Erweitern"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
            </button>
          )}
        </div>

        {/* Expanded Panel */}
        {isExpanded && (
          <div className="border-t border-black/5 dark:border-white/5 animate-fade-in">
            {/* My Location Button */}
            <button
              onClick={handleCurrentLocation}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-apple text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Mein Standort</p>
                <p className="text-xs text-muted-foreground">GPS-Position verwenden</p>
              </div>
            </button>

            {/* Vehicle Type Filters */}
            <div className="px-4 pt-3 pb-2 border-t border-black/5 dark:border-white/5">
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">
                Fahrzeugtyp
              </p>
              <div className="flex gap-2">
                {[
                  { key: "E-Scooter", label: "Scooter", icon: "🛴" },
                  { key: "E-Bike", label: "Bike", icon: "🚲" },
                  { key: "Car", label: "Auto", icon: "🚗" },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => onTypeToggle(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-apple ${
                      activeTypes.has(key)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/80 text-muted-foreground"
                    }`}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Radius */}
            <div className="px-4 pt-2 pb-3 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                  Suchradius
                </p>
                <span className="text-xs font-semibold text-primary">{searchRadius}m</span>
              </div>
              <input
                type="range"
                min={150}
                max={1000}
                step={50}
                value={searchRadius}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
                <span>150m</span>
                <span>1km</span>
              </div>
            </div>

            {/* Save Favorite Button */}
            {locationName && !defaultLocations.some(l => l.name === locationName) && (
              <button
                onClick={() => {
                  if (!currentCoords) return
                  const newFav = { name: locationName, coords: currentCoords }
                  const updated = [newFav, ...favorites.filter(f => f.name !== locationName)].slice(0, 5)
                  setFavorites(updated)
                  saveFavorites(updated)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-apple text-left"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-sm font-medium">Als Favorit speichern</p>
              </button>
            )}

            {/* Favorites */}
            {favorites.length > 0 && (
              <div className="px-4 pt-2 pb-1">
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">Favoriten</p>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((fav) => (
                    <button key={fav.name}
                      onClick={() => { setIsExpanded(false); setIsFocused(false); onLocationSearch(fav.coords, fav.name) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-xs font-medium transition-apple">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {fav.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Locations */}
            <div className="px-4 pt-2 pb-3">
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">
                Beliebte Orte
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultLocations.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      setIsExpanded(false)
                      setIsFocused(false)
                      onLocationSearch(loc.coords, loc.name)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium transition-apple"
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isSuggestionsVisible && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-apple text-left ${
                index > 0 ? "border-t border-black/5 dark:border-white/5" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium truncate">{stripHtml(suggestion.attrs.label)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
