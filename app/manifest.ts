import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyRideRadar",
    short_name: "MyRideRadar", // Hier wurde die Änderung vorgenommen
    description: "Finde Sharing-Angebote in deiner Nähe.",
    start_url: "/",
    display: "standalone", // Wichtig für das PWA-Feeling
    background_color: "#ffffff", // Explizit auf Weiß setzen
    theme_color: "#ffffff", // Auch die Theme-Farbe auf Weiß setzen für einen neutralen Look der Browser-UI
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
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
