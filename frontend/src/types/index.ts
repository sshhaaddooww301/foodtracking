export interface Organization {
  id: string;
  name: string;
  org_type: string;
  registration_number?: string;
  license_number?: string;
  contact_email?: string;
  contact_phone?: string;
  address_street?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
  wallet_address?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: "PHARMACEUTICAL" | "FOOD_BEVERAGE" | "OTHER";
  manufacturer_id: string;
  manufacturer?: Organization;
  dosage_form?: string;
  strength?: string;
  active_ingredients?: string[];
  unit_of_measure?: string;
  package_size?: string;
  requires_cold_chain: boolean;
  temp_min_celsius?: number;
  temp_max_celsius?: number;
  humidity_min_percent?: number;
  humidity_max_percent?: number;
  shelf_life_days?: number;
  fda_ndc_number?: string;
  regulatory_approval_number?: string;
  status: string;
  created_at: string;
}

export interface Batch {
  id: string;
  batch_number: string;
  product_id: string;
  product?: Product;
  quantity?: number;
  quantity_manufactured?: number;
  quantity_remaining?: number;
  manufacturing_date: string;
  expiry_date: string;
  status: string;
  blockchain_tx_hash?: string;
  ipfs_coa_hash?: string;
  created_at: string;
  packages_count?: number;
}

export interface Package {
  id: string;
  package_code: string;
  batch_id: string;
  batch?: Batch;
  status: string;
  current_location_lat?: number;
  current_location_lng?: number;
  current_location_name?: string;
  qr_code_svg?: string;
  nfc_uid?: string;
  blockchain_tx_hash?: string;
  is_quarantined?: boolean;
  created_at: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  origin_org_id?: string;
  destination_org_id?: string;
  origin?: Organization;
  destination?: Organization;
  carrier?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  status: string;
  expected_delivery?: string;
  actual_delivery?: string;
  current_lat?: number;
  current_lng?: number;
  current_location_name?: string;
  temperature_compliant: boolean;
  blockchain_tx_hash?: string;
  created_at: string;
  packages?: Package[];
}

export interface IoTDevice {
  id: string;
  device_id: string;
  name: string;
  device_type: string;
  battery_level: number;
  is_active: boolean;
  last_seen?: string;
  current_package_id?: string;
  current_shipment_id?: string;
}

export interface IoTReading {
  id: string;
  device_id: string;
  package_id?: string;
  shipment_id?: string;
  temperature: number;
  humidity: number;
  latitude: number;
  longitude: number;
  battery: number;
  nonce: string;
  signature: string;
  signature_valid: boolean;
  is_anomaly: boolean;
  reading_timestamp: string;
}

export interface FraudAlert {
  id: string;
  alert_type: string;
  package_id?: string;
  shipment_id?: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  evidence?: any;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  auto_quarantined: boolean;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  doc_type: string;
  ipfs_cid: string;
  file_hash: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  blockchain_tx_hash?: string;
  is_tampered: boolean;
  created_at: string;
}

export interface RecallRecord {
  id: string;
  recall_number: string;
  batch_id: string;
  batch?: Batch;
  reason: string;
  description?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  affected_packages_count: number;
  blockchain_tx_hash?: string;
  created_at: string;
}

export interface QuarantineRecord {
  id: string;
  package_id: string;
  package?: Package;
  reason: string;
  quarantined_by?: string;
  released_by?: string;
  released_at?: string;
  release_reason?: string;
  blockchain_tx_hash?: string;
  is_active: boolean;
  created_at: string;
}

export interface BlockchainTx {
  id: string;
  tx_hash: string;
  tx_type: string;
  contract_address?: string;
  block_number?: number;
  gas_used?: number;
  status: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface OracleNode {
  id: string;
  oracle_id: string;
  name: string;
  status: string;
  accuracy_score: number;
  total_attestations: number;
  failed_attestations: number;
  last_seen?: string;
}

export interface DashboardStats {
  total_organizations: number;
  total_products: number;
  total_batches: number;
  total_packages: number;
  active_shipments: number;
  verified_packages: number;
  fraud_alerts_open: number;
  cold_chain_breaches: number;
  quarantined_packages: number;
  recalled_batches: number;
  total_iot_readings_24h: number;
  blockchain_tx_count: number;
  system_health: Record<string, string>;
}

export interface VerificationResult {
  package_code: string;
  result: "AUTHENTIC" | "SUSPICIOUS" | "COUNTERFEIT" | "RECALLED" | "QUARANTINED";
  is_authentic: boolean;
  product_name: string;
  product_sku: string;
  batch_number: string;
  manufacturer_name: string;
  manufacturing_date: string;
  expiry_date: string;
  status: string;
  cold_chain_compliant: boolean;
  blockchain_tx_hash?: string;
  verified_at: string;
  warning_message?: string;
}
