import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Ride Radar",
    short_name: "RideRadar",
    description: "Finde Sharing-Angebote in deiner Nähe.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007aff", // Ein Blauton, passend zum Logo
    icons: [
      {
        src: "/logo.png", // Pfad zu deinem Logo
        sizes: "192x192",
        type: "image/png",
        purpose: "any", // Kann für verschiedene Zwecke verwendet werden
      },
      {
        src: "/logo.png", // Pfad zu deinem Logo
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png", // Für Maskable Icons, wichtig für Android
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
