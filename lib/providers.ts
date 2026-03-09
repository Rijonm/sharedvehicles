export interface ProviderInfo {
  color: string
  shortName: string
  logo: string
  pricing?: { unlock: string; minute: string }
  swisspass?: boolean
}

export const providerConfig: Record<string, ProviderInfo> = {
  "Bolt Technology OÜ": {
    color: "#34D186",
    shortName: "Bolt",
    logo: "/providers/bolt.png",
    pricing: { unlock: "0.50", minute: "0.49" },
  },
  "Voi Technology AB": {
    color: "#F46D5B",
    shortName: "Voi",
    logo: "/providers/voi.png",
    pricing: { unlock: "1.00", minute: "0.44" },
  },
  "bird basel": {
    color: "#33BBFF",
    shortName: "Bird",
    logo: "/providers/bird.png",
    pricing: { unlock: "1.00", minute: "0.45" },
  },
  Lime: {
    color: "#00DE6D",
    shortName: "Lime",
    logo: "/providers/lime.png",
    pricing: { unlock: "1.00", minute: "0.46" },
  },
  "Lime City partners from Partners::RegionFeedMediator": {
    color: "#00DE6D",
    shortName: "Lime",
    logo: "/providers/lime.png",
    pricing: { unlock: "1.00", minute: "0.46" },
  },
  PubliBike: {
    color: "#9C1B6E",
    shortName: "PB",
    logo: "/providers/publibike.png",
    swisspass: true,
  },
  nextbike: {
    color: "#1641AC",
    shortName: "nb",
    logo: "/providers/nextbike.png",
  },
  "donkey republic": {
    color: "#F5A623",
    shortName: "DR",
    logo: "/providers/donkeyrepublic.png",
  },
  Velospot: {
    color: "#6B2D5B",
    shortName: "VS",
    logo: "/providers/velospot.png",
    swisspass: true,
  },
  Mobility: {
    color: "#E53935",
    shortName: "M",
    logo: "/providers/mobility.png",
  },
  "SHARE NOW": {
    color: "#2D3266",
    shortName: "SN",
    logo: "/providers/sharenow.png",
  },
  Ubeeqo: {
    color: "#3B4C8A",
    shortName: "U",
    logo: "/providers/ubeeqo.png",
  },
}

export function getProviderInfo(name: string): ProviderInfo {
  return providerConfig[name] || {
    color: "#6B7280",
    shortName: name.substring(0, 2).toUpperCase(),
    logo: "",
  }
}
