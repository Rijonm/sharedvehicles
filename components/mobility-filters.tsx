"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Search, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MobilityFiltersProps {
  onLocationSearch: (location: [number, number], name: string) => void
  onSetCurrentLocation: () => void
  defaultLocations: { name: string; coords: [number, number] }[]
}

interface Suggestion {
  id: string
  attrs: {
    label: string
    lon: number
    lat: number
  }
}

export default function MobilityFilters({
  onLocationSearch,
  onSetCurrentLocation,
  defaultLocations,
}: MobilityFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false)
  const { toast } = useToast()
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "")

  // Debounced fetch for autocomplete suggestions from Swisstopo API
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([])
      setIsSuggestionsVisible(false)
      return
    }

    const handler = setTimeout(async () => {
      try {
        // Using Swisstopo API for stable Swiss geocoding
        const response = await fetch(
          `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=address,gg25&limit=5&searchText=${encodeURIComponent(
            searchQuery,
          )}`,
        )
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          setSuggestions(data.results)
          setIsSuggestionsVisible(true)
        } else {
          setSuggestions([])
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setSuggestions([])
      }
    }, 300) // 300ms delay

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery])

  // Handle clicks outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [searchContainerRef])

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      toast({
        title: "Bitte geben Sie einen Ort ein",
        description: "Geben Sie eine Stadt oder Adresse ein, um zu suchen",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=address,gg25&limit=1&searchText=${encodeURIComponent(
          query,
        )}`,
      )
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const { lat, lon, label } = data.results[0].attrs
        const displayName = stripHtml(label)
        setSearchQuery(displayName)
        setIsSuggestionsVisible(false)
        onLocationSearch([lat, lon], displayName)
        toast({
          title: "Standort aktualisiert",
          description: `Zeige Ergebnisse in der Nähe von ${displayName}`,
        })
      } else {
        toast({
          title: "Standort nicht gefunden",
          description: "Versuchen Sie einen anderen Suchbegriff",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error searching location:", error)
      toast({
        title: "Fehler bei der Standortsuche",
        description: "Bitte versuchen Sie es später erneut",
        variant: "destructive",
      })
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const { lat, lon, label } = suggestion.attrs
    const displayName = stripHtml(label)
    setSearchQuery(displayName)
    setIsSuggestionsVisible(false)
    onLocationSearch([lat, lon], displayName)
    toast({
      title: "Standort aktualisiert",
      description: `Zeige Ergebnisse in der Nähe von ${displayName}`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Standort</h2>
        <div className="relative" ref={searchContainerRef}>
          <div className="flex space-x-2">
            <Input
              placeholder="Stadt oder Adresse suchen"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 2 && setIsSuggestionsVisible(true)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
              autoComplete="off"
            />
            <Button onClick={() => handleSearch(searchQuery)} size="icon" aria-label="Suchen">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {isSuggestionsVisible && suggestions.length > 0 && (
            <Card className="absolute z-10 w-full mt-1 shadow-lg">
              <CardContent className="p-1">
                <ul className="space-y-1">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2 px-2"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {stripHtml(suggestion.attrs.label)}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Button onClick={onSetCurrentLocation} variant="outline" className="w-full mt-2 flex items-center gap-2">
          <LocateFixed className="h-4 w-4" />
          Mein Standort
        </Button>

        <Card className="mt-4">
          <CardHeader className="py-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Beliebte Städte
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-2">
              {defaultLocations.map((location) => (
                <Button
                  key={location.name}
                  variant="outline"
                  size="sm" // Behalte sm für die allgemeine Struktur, aber überschreibe Textgröße und Padding
                  className="w-full justify-start text-xs px-2 py-1 h-auto" // Kleinere Schrift und Padding
                  onClick={() => onLocationSearch(location.coords, location.name)}
                >
                  {location.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
