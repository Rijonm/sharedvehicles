"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Search, Navigation, ChevronDown } from "lucide-react"
import { searchLocationSuggestions, searchLocation } from "@/lib/api"

interface MobilityFiltersProps {
  onLocationSearch: (location: [number, number], name: string) => void
  onSetCurrentLocation: () => void
  defaultLocations: { name: string; coords: [number, number] }[]
  locationName: string
  vehicleCount: number
  lastUpdated: Date | null
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

export default function MobilityFilters({
  onLocationSearch,
  onSetCurrentLocation,
  defaultLocations,
  locationName,
}: MobilityFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
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
