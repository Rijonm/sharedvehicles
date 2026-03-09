export interface MobilityVehicle {
  type: string
  geometry: {
    type: string
    coordinates: [number, number] // [longitude, latitude]
  }
  properties: {
    provider: {
      id: string
      name: string
      phone: string
      timezone: string
      apps: {
        ios?: {
          store_uri?: string[]
          discovery_uri?: string
        }
        android?: {
          store_uri?: string[]
          discovery_uri?: string
        }
      }
    }
    id: string
    available: boolean
    pickup_type: string
    station?: {
      name: string
      address: string
      postcode: string
      status: {
        installed: boolean
        renting: boolean
        returning: boolean
        num_vehicle_available: number
      }
      region_id: string
    }
    vehicle_type: string
    vehicle?: {
      status: {
        disabled: boolean
        reserved: boolean
      }
    }
  }
  featureId: string
  id: string
  layerBodId: string
  layerName: string
}

export interface Provider {
  provider_id: string
  name: string
  ttl: number
  language: string
  vehicle_type: string
  timezone: string
  rental_apps: {
    ios?: {
      store_uri: string
      discovery_uri: string
    }
    android?: {
      store_uri: string
      discovery_uri: string
    }
  }
  url: string
  phone_number: string
  purchase_url: string
  email: string
  last_updated: number
}

export interface Attribute {
  values: string[]
  alias: string
  type: string
  name: string
}

// Add new types for EsriJSON
export interface EsriJsonGeometry {
  x: number // longitude
  y: number // latitude
  spatialReference: {
    wkid: number
  }
}

export interface EsriJsonAttributes {
  provider_id: string
  provider_name: string
  provider_phone?: string // Added optional phone
  provider_timezone: string
  provider_apps_ios_store_uri?: string
  provider_apps_android_store_uri?: string
  provider_apps_ios_discovery_uri?: string
  provider_apps_android_discovery_uri?: string
  id: string
  available: boolean
  pickup_type: string
  station_name?: string // Optional station info
  station_address?: string
  station_postcode?: string
  station_status_installed?: boolean
  station_status_renting?: boolean
  station_status_returning?: boolean
  station_status_num_vehicle_available?: number
  station_region_id?: string
  vehicle_type: string[] // This is an array in esrijson
  vehicle_status_disabled: boolean
  vehicle_status_reserved: boolean
}

export interface EsriJsonFeature {
  geometry: EsriJsonGeometry
  attributes: EsriJsonAttributes
  featureId: string
  id: string
  layerBodId: string
  layerName: string
}
