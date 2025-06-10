"use client"

import { useState } from "react"
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

export default function MobilityFilters({
  onLocationSearch,
  onSetCurrentLocation,
  defaultLocations,
}: MobilityFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Bitte geben Sie einen Ort ein",
        description: "Geben Sie eine Stadt oder Adresse ein, um zu suchen",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0]
        onLocationSearch([Number.parseFloat(lat), Number.parseFloat(lon)], display_name)
        toast({
          title: "Standort aktualisiert",
          description: `Zeige Ergebnisse in der Nähe von ${display_name}`,
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Standort</h2>
        <div className="flex space-x-2">
          <Input
            placeholder="Stadt oder Adresse suchen"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon" aria-label="Suchen">
            <Search className="h-4 w-4" />
          </Button>
          <Button onClick={onSetCurrentLocation} size="icon" variant="outline" aria-label="Mein Standort">
            <LocateFixed className="h-4 w-4" />
          </Button>
        </div>

        <Card className="mt-2">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Beliebte Städte
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-2">
              {defaultLocations.map((location) => (
                <Button
                  key={location.name}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onLocationSearch(location.coords, location.name)}
                >
                  {location.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Removed Provider, Vehicle Types, Pickup Types, Availability filters and Reset button */}
    </div>
  )
}
