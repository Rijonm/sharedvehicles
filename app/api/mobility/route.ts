import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const geometry = searchParams.get("Geometry")
  const tolerance = searchParams.get("Tolerance") // This will be fixed to 500 by the client
  const filters = searchParams.getAll("filters") // This will be fixed to E-Scooter by the client
  const geometryFormat = "esrijson"
  const offset = searchParams.get("offset") || "0"

  try {
    const apiUrl = new URL("https://api.sharedmobility.ch/v1/sharedmobility/identify")

    if (geometry) {
      apiUrl.searchParams.append("Geometry", geometry)
    } else {
      // Default to Lucerne if no geometry is provided (should ideally not happen with client-side defaults)
      apiUrl.searchParams.append("Geometry", "8.3093,47.0502")
      apiUrl.searchParams.append("Tolerance", "50000") // Wider tolerance for default
    }

    if (tolerance) {
      // Client will send the fixed tolerance
      apiUrl.searchParams.append("Tolerance", tolerance)
    }

    apiUrl.searchParams.append("geometryFormat", geometryFormat)
    apiUrl.searchParams.append("offset", offset)

    filters.forEach((filter) => {
      // Client will send the fixed E-Scooter filter
      apiUrl.searchParams.append("filters", filter)
    })

    console.log("Fetching mobility data (esrijson) from:", apiUrl.toString())

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Mobility API error (${response.status}):`, errorText)
      throw new Error(`The Mobility API responded with status ${response.status}.`)
    }

    const responseText = await response.text()
    try {
      const data = JSON.parse(responseText)
      return NextResponse.json(data)
    } catch (error) {
      console.error("Failed to parse JSON from Mobility API. Response text:", responseText.substring(0, 500) + "...")
      throw new Error("The Mobility API returned an invalid (non-JSON) response.")
    }
  } catch (error) {
    console.error("Error in /api/mobility route:", error)
    return NextResponse.json({ error: "Failed to fetch mobility data", details: error.message }, { status: 500 })
  }
}
