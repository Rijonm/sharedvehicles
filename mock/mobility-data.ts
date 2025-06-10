import type { MobilityVehicle } from "@/types/mobility"

// Mock data for demonstration purposes
const mockData: MobilityVehicle[] = [
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [8.5417, 47.3769], // [longitude, latitude] for Zurich
    },
    properties: {
      provider: {
        id: "publibike",
        name: "PubliBike",
        phone: "+41 58 453 50 50",
        timezone: "Europe/Zurich",
        apps: {
          ios: {
            store_uri: ["https://apps.apple.com/ch/app/publibike/id1306679520"],
          },
          android: {
            store_uri: ["https://play.google.com/store/apps/details?id=ch.publibike.app"],
          },
        },
      },
      id: "bike-001",
      available: true,
      pickup_type: "station_based",
      station: {
        name: "Zurich HB",
        address: "Bahnhofplatz 1",
        postcode: "8001",
        status: {
          installed: true,
          renting: true,
          returning: true,
          num_vehicle_available: 8,
        },
        region_id: "zurich",
      },
      vehicle_type: "bicycle",
      vehicle: {
        status: {
          disabled: false,
          reserved: false,
        },
      },
    },
    featureId: "bike-001",
    id: "bike-001",
    layerBodId: "ch.bfe.sharedmobility",
    layerName: "Shared Mobility Angebote",
  },
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [8.5397, 47.3809], // Near Zurich HB
    },
    properties: {
      provider: {
        id: "mobility",
        name: "Mobility",
        phone: "+41 41 248 24 24",
        timezone: "Europe/Zurich",
        apps: {
          ios: {
            store_uri: ["https://apps.apple.com/ch/app/mobility/id1473061365"],
          },
          android: {
            store_uri: ["https://play.google.com/store/apps/details?id=ch.mobility.app"],
          },
        },
      },
      id: "car-001",
      available: true,
      pickup_type: "station_based",
      station: {
        name: "Zurich Central",
        address: "Zentralstrasse 10",
        postcode: "8001",
        status: {
          installed: true,
          renting: true,
          returning: true,
          num_vehicle_available: 3,
        },
        region_id: "zurich",
      },
      vehicle_type: "car",
      vehicle: {
        status: {
          disabled: false,
          reserved: false,
        },
      },
    },
    featureId: "car-001",
    id: "car-001",
    layerBodId: "ch.bfe.sharedmobility",
    layerName: "Shared Mobility Angebote",
  },
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [8.5457, 47.3729], // Near ETH Zurich
    },
    properties: {
      provider: {
        id: "tier",
        name: "TIER",
        phone: "+41 43 508 05 55",
        timezone: "Europe/Zurich",
        apps: {
          ios: {
            store_uri: ["https://apps.apple.com/ch/app/tier-scooter-sharing/id1436140272"],
          },
          android: {
            store_uri: ["https://play.google.com/store/apps/details?id=com.tier.app"],
          },
        },
      },
      id: "scooter-001",
      available: true,
      pickup_type: "free_floating",
      vehicle_type: "scooter",
      vehicle: {
        status: {
          disabled: false,
          reserved: false,
        },
      },
    },
    featureId: "scooter-001",
    id: "scooter-001",
    layerBodId: "ch.bfe.sharedmobility",
    layerName: "Shared Mobility Angebote",
  },
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [8.5377, 47.3749], // Near Zurich Opera House
    },
    properties: {
      provider: {
        id: "publibike",
        name: "PubliBike",
        phone: "+41 58 453 50 50",
        timezone: "Europe/Zurich",
        apps: {
          ios: {
            store_uri: ["https://apps.apple.com/ch/app/publibike/id1306679520"],
          },
          android: {
            store_uri: ["https://play.google.com/store/apps/details?id=ch.publibike.app"],
          },
        },
      },
      id: "bike-002",
      available: true,
      pickup_type: "station_based",
      station: {
        name: "Opera House",
        address: "Sechseläutenplatz",
        postcode: "8001",
        status: {
          installed: true,
          renting: true,
          returning: true,
          num_vehicle_available: 5,
        },
        region_id: "zurich",
      },
      vehicle_type: "bicycle",
      vehicle: {
        status: {
          disabled: false,
          reserved: false,
        },
      },
    },
    featureId: "bike-002",
    id: "bike-002",
    layerBodId: "ch.bfe.sharedmobility",
    layerName: "Shared Mobility Angebote",
  },
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [8.5317, 47.3789], // Near Zurich Hardbrücke
    },
    properties: {
      provider: {
        id: "mobility",
        name: "Mobility",
        phone: "+41 41 248 24 24",
        timezone: "Europe/Zurich",
        apps: {
          ios: {
            store_uri: ["https://apps.apple.com/ch/app/mobility/id1473061365"],
          },
          android: {
            store_uri: ["https://play.google.com/store/apps/details?id=ch.mobility.app"],
          },
        },
      },
      id: "car-002",
      available: false,
      pickup_type: "station_based",
      station: {
        name: "Hardbrücke",
        address: "Hardstrasse 200",
        postcode: "8005",
        status: {
          installed: true,
          renting: true,
          returning: true,
          num_vehicle_available: 0,
        },
        region_id: "zurich",
      },
      vehicle_type: "car",
      vehicle: {
        status: {
          disabled: false,
          reserved: true,
        },
      },
    },
    featureId: "car-002",
    id: "car-002",
    layerBodId: "ch.bfe.sharedmobility",
    layerName: "Shared Mobility Angebote",
  },
]

export default mockData
