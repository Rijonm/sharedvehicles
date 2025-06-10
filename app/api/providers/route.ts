import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Try to fetch from the GBFS system information endpoint first
    const gbfsUrl = "https://sharedmobility.ch/system_information.json"
    console.log("Fetching providers from GBFS endpoint:", gbfsUrl)

    try {
      const gbfsResponse = await fetch(gbfsUrl, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        next: { revalidate: 3600 }, // Cache for an hour
      })

      if (gbfsResponse.ok) {
        const gbfsData = await gbfsResponse.json()

        // If we have GBFS data, also fetch the provider list from the original API
        // to get more provider details
        const apiUrl = "https://api.sharedmobility.ch/v1/sharedmobility/providers"
        const apiResponse = await fetch(apiUrl, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          next: { revalidate: 3600 }, // Cache for an hour
        })

        if (apiResponse.ok) {
          const apiData = await apiResponse.json()

          // Return combined data
          return NextResponse.json({
            gbfs_info: gbfsData.data,
            providers: apiData.providers,
          })
        }

        // If original API fails, just return GBFS data
        return NextResponse.json({
          gbfs_info: gbfsData.data,
          providers: [],
        })
      }
    } catch (gbfsError) {
      console.error("Error fetching from GBFS endpoint:", gbfsError)
    }

    // Fallback to original API if GBFS fails
    const apiUrl = "https://api.sharedmobility.ch/v1/sharedmobility/providers"
    console.log("Fetching providers from original API:", apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for an hour
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error (${response.status}):`, errorText)
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching providers:", error)
    return NextResponse.json({ error: "Failed to fetch providers", details: error.message }, { status: 500 })
  }
}
