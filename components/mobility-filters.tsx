"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, MapPin, Search, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MobilityFiltersProps {
  onFilterChange: (filters: string[]) => void
  onLocationSearch: (location: [number, number], name: string) => void
  onSetCurrentLocation: () => void
  defaultLocations: { name: string; coords: [number, number] }[]
  initialVehicleTypes?: string[] // Added prop for initial vehicle types
}

export default function MobilityFilters({
  onFilterChange,
  onLocationSearch,
  onSetCurrentLocation,
  defaultLocations,
  initialVehicleTypes = ["E-Scooter"], // Default to E-Scooter if not provided
}: MobilityFiltersProps) {
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([])
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>(initialVehicleTypes) // Use prop for initial state
  const [pickupTypes, setPickupTypes] = useState<string[]>([])
  const [selectedPickupType, setSelectedPickupType] = useState<string>("")
  const [availableOnly, setAvailableOnly] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [pickupOpen, setPickupOpen] = useState(false)
  const [prevFilters, setPrevFilters] = useState<string>(JSON.stringify([]))

  const { toast } = useToast()

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch("/api/providers")
        const data = await response.json()
        if (data.providers) {
          setProviders(
            data.providers.map((p: any) => ({
              id: p.provider_id,
              name: p.name,
            })),
          )
        }
      } catch (error) {
        console.error("Error fetching providers:", error)
      }
    }

    const fetchAttributes = async () => {
      try {
        const response = await fetch("/api/attributes")
        const data = await response.json()
        if (data.fields) {
          const vehicleTypeField = data.fields.find((field: any) => field.name === "ch.bfe.sharedmobility.vehicle_type")
          if (vehicleTypeField) {
            setVehicleTypes(vehicleTypeField.values)
          }

          const pickupTypeField = data.fields.find((field: any) => field.name === "ch.bfe.sharedmobility.pickup_type")
          if (pickupTypeField) {
            setPickupTypes(pickupTypeField.values)
          }
        }
      } catch (error) {
        console.error("Error fetching attributes:", error)
      }
    }

    fetchProviders()
    fetchAttributes()
  }, [])

  useEffect(() => {
    const newFilters: string[] = []

    if (selectedProvider) {
      newFilters.push(`ch.bfe.sharedmobility.provider.id=${selectedProvider}`)
    }

    // Ensure at least one vehicle type is selected, default to E-Scooter if none are
    if (selectedVehicleTypes.length > 0) {
      selectedVehicleTypes.forEach((type) => {
        newFilters.push(`ch.bfe.sharedmobility.vehicle_type=${type}`)
      })
    } else {
      // If no vehicle types are selected by the user, default to E-Scooter
      // This ensures the API call is always made with a vehicle type if the user deselects all
      newFilters.push(`ch.bfe.sharedmobility.vehicle_type=E-Scooter`)
    }

    if (selectedPickupType) {
      newFilters.push(`ch.bfe.sharedmobility.pickup_type=${selectedPickupType}`)
    }

    if (availableOnly) {
      newFilters.push("ch.bfe.sharedmobility.available=true")
    }

    const filtersString = JSON.stringify(newFilters)

    if (prevFilters !== filtersString) {
      setPrevFilters(filtersString)
      onFilterChange(newFilters)
    }
  }, [selectedProvider, selectedVehicleTypes, selectedPickupType, availableOnly, onFilterChange, prevFilters])

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

  const handleVehicleTypeToggle = (type: string) => {
    setSelectedVehicleTypes((prev) => {
      const newSelection = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      // If after toggling, no vehicle types are selected, default back to E-Scooter
      // Or, ensure at least one is always selected based on your preference.
      // For now, allow empty selection which will default to E-Scooter in the filter logic.
      return newSelection
    })
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

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Anbieter</h2>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
              {selectedProvider
                ? providers.find((provider) => provider.id === selectedProvider)?.name
                : "Alle Anbieter"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Anbieter suchen..." />
              <CommandList>
                <CommandEmpty>Kein Anbieter gefunden.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setSelectedProvider("")
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !selectedProvider ? "opacity-100" : "opacity-0")} />
                    Alle Anbieter
                  </CommandItem>
                  {providers.map((provider) => (
                    <CommandItem
                      key={provider.id}
                      onSelect={() => {
                        setSelectedProvider(selectedProvider === provider.id ? "" : provider.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", selectedProvider === provider.id ? "opacity-100" : "opacity-0")}
                      />
                      {provider.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Fahrzeugtypen</h2>
        <div className="space-y-2">
          {vehicleTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`vehicle-type-${type}`}
                checked={selectedVehicleTypes.includes(type)}
                onCheckedChange={() => handleVehicleTypeToggle(type)}
              />
              <Label htmlFor={`vehicle-type-${type}`}>{type}</Label>
            </div>
          ))}
          {vehicleTypes.length === 0 && <p className="text-sm text-muted-foreground">Lade Fahrzeugtypen...</p>}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Abholtyp</h2>
        <Popover open={pickupOpen} onOpenChange={setPickupOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={pickupOpen} className="w-full justify-between">
              {selectedPickupType || "Alle Abholtypen"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandList>
                <CommandEmpty>Keine Abholtypen gefunden.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setSelectedPickupType("")
                      setPickupOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !selectedPickupType ? "opacity-100" : "opacity-0")} />
                    Alle Abholtypen
                  </CommandItem>
                  {pickupTypes.map((type) => (
                    <CommandItem
                      key={type}
                      onSelect={() => {
                        setSelectedPickupType(selectedPickupType === type ? "" : type)
                        setPickupOpen(false)
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", selectedPickupType === type ? "opacity-100" : "opacity-0")}
                      />
                      {type}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Verfügbarkeit</h2>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="available-only"
            checked={availableOnly}
            onCheckedChange={(checked) => setAvailableOnly(checked as boolean)}
          />
          <Label htmlFor="available-only">Nur verfügbare anzeigen</Label>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => {
          setSelectedProvider("")
          setSelectedVehicleTypes(initialVehicleTypes) // Reset to initial/default vehicle types
          setSelectedPickupType("")
          setAvailableOnly(true)
        }}
        variant="outline"
      >
        Filter zurücksetzen
      </Button>
    </div>
  )
}
