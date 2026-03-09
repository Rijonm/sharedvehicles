import type { MobilityVehicle, EsriJsonFeature } from "@/types/mobility"
// GBFSBike is no longer needed
// import type { GBFSBike } from "@/types/gbfs"

// Helper function to convert EsriJSON data to our MobilityVehicle format
export function convertEsriJsonToMobilityVehicle(feature: EsriJsonFeature): MobilityVehicle {
  const { geometry, attributes, featureId, id, layerBodId, layerName } = feature

  const providerApps: MobilityVehicle["properties"]["provider"]["apps"] = {}
  if (attributes.provider_apps_ios_store_uri) {
    providerApps.ios = {
      store_uri: [attributes.provider_apps_ios_store_uri],
      discovery_uri: attributes.provider_apps_ios_discovery_uri,
    }
  }
  if (attributes.provider_apps_android_store_uri) {
    providerApps.android = {
      store_uri: [attributes.provider_apps_android_store_uri],
      discovery_uri: attributes.provider_apps_android_discovery_uri,
    }
  }

  let stationData: MobilityVehicle["properties"]["station"] | undefined = undefined
  if (attributes.station_name) {
    stationData = {
      name: attributes.station_name,
      address: attributes.station_address || "",
      postcode: attributes.station_postcode || "",
      status: {
        installed: attributes.station_status_installed || false,
        renting: attributes.station_status_renting || false,
        returning: attributes.station_status_returning || false,
        num_vehicle_available: attributes.station_status_num_vehicle_available || 0,
      },
      region_id: attributes.station_region_id || "",
    }
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [geometry.x, geometry.y], // [longitude, latitude]
    },
    properties: {
      provider: {
        id: attributes.provider_id,
        name: attributes.provider_name,
        phone: attributes.provider_phone || "",
        timezone: attributes.provider_timezone,
        apps: providerApps,
      },
      id: attributes.id,
      available: attributes.available,
      pickup_type: attributes.pickup_type,
      station: stationData,
      vehicle_type: attributes.vehicle_type[0] || "unknown", // Take the first vehicle type
      vehicle: {
        status: {
          disabled: attributes.vehicle_status_disabled,
          reserved: attributes.vehicle_status_reserved,
        },
      },
    },
    featureId: featureId,
    id: id,
    layerBodId: layerBodId,
    layerName: layerName,
  }
}

// convertGBFSToMobilityVehicle function is removed as GBFS is no longer used.
