import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fix the URL to use the correct path
    const apiUrl = "https://api.sharedmobility.ch/v1/sharedmobility/attributes"
    console.log("Fetching attributes from:", apiUrl)

    // Fetch attributes from the external API
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error (${response.status}):`, errorText)
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Return the data
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching attributes:", error)
    return NextResponse.json({ error: "Failed to fetch attributes", details: error.message }, { status: 500 })
  }
}
