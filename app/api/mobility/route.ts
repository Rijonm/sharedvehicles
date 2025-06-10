import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Get parameters from the request
  const geometry = searchParams.get("Geometry")
  const tolerance = searchParams.get("Tolerance") || "5000" // Default 5km radius
  const filters = searchParams.getAll("filters")
  // Always use esrijson for this endpoint as per user request
  const geometryFormat = "esrijson"
  const offset = searchParams.get("offset") || "0"

  try {
    // Always use the identify endpoint for spatial queries
    const apiUrl = new URL("https://api.sharedmobility.ch/v1/sharedmobility/identify")

    // Add parameters to the API URL
    if (geometry) {
      apiUrl.searchParams.append("Geometry", geometry)
    } else {
      // If no specific location provided, use a default location in central Switzerland
      // This is Lucerne coordinates as a central point in Switzerland
      apiUrl.searchParams.append("Geometry", "8.3093,47.0502") // lon,lat
      // Use a large tolerance to cover most of Switzerland
      apiUrl.searchParams.append("Tolerance", "50000") // 50km radius
    }

    // Add the tolerance parameter
    if (geometry) {
      apiUrl.searchParams.append("Tolerance", tolerance)
    }

    apiUrl.searchParams.append("geometryFormat", geometryFormat)
    apiUrl.searchParams.append("offset", offset)

    // Add filters
    filters.forEach((filter) => {
      apiUrl.searchParams.append("filters", filter)
    })

    console.log("Fetching mobility data (esrijson) from:", apiUrl.toString())

    // Fetch data from the external API
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
