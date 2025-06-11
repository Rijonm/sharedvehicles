import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "My Ride Radar", // Angepasster Titel
  description: "Gibt dir eine Übersicht über alle Sharing Angebote in der Schweiz und deiner Umgebung.", // Angepasste Beschreibung
  manifest: "/manifest.ts", // Verweis auf die Manifest-Datei
  icons: {
    icon: "/logo.png", // Standard Favicon
    shortcut: "/logo.png", // Für ältere Browser
    apple: "/logo.png", // Für Apple Touch Icon
    // Du könntest hier auch spezifische Größen für Apple-Icons definieren,
    // aber Next.js kann oft das einzelne Icon gut skalieren.
    // z.B. apple: [ { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' } ]
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
