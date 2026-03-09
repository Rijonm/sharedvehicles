import type { EsriJsonFeature } from "@/types/mobility"

const MOBILITY_API_BASE = "https://api.sharedmobility.ch/v1/sharedmobility"

export async function fetchMobilityVehicles(
  geometry: string,
  tolerance: string,
  filter: string,
  signal?: AbortSignal,
): Promise<EsriJsonFeature[]> {
  const url = new URL(`${MOBILITY_API_BASE}/identify`)
  url.searchParams.append("Geometry", geometry)
  url.searchParams.append("Tolerance", tolerance)
  url.searchParams.append("geometryFormat", "esrijson")
  url.searchParams.append("offset", "0")
  url.searchParams.append("filters", filter)

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal,
    })

    if (!response.ok) return []

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return []
    console.error("Mobility API error:", error)
    return []
  }
}

export async function fetchProviders(signal?: AbortSignal) {
  try {
    const response = await fetch("https://sharedmobility.ch/system_information.json", {
      headers: { Accept: "application/json" },
      signal,
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function searchLocation(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  try {
    const response = await fetch(
      `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=gazetteer,address,gg25&limit=1&searchText=${encodeURIComponent(query)}`,
    )
    const data = await response.json()
    if (data.results?.length > 0) {
      const { lat, lon, label } = data.results[0].attrs
      return { lat, lon, label: label.replace(/<[^>]*>/g, "") }
    }
    return null
  } catch {
    return null
  }
}

export async function searchLocationSuggestions(
  query: string,
): Promise<Array<{ id: string; attrs: { label: string; lon: number; lat: number } }>> {
  try {
    const response = await fetch(
      `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=gazetteer,address,gg25&limit=8&searchText=${encodeURIComponent(query)}`,
    )
    const data = await response.json()
    return data.results || []
  } catch {
    return []
  }
}
