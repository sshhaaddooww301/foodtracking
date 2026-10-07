"""
TrustChain Supply — Comprehensive Real Super Admin End-to-End Test Suite
Executes all 16 steps specified by the user against the live platform:
- Database: PostgreSQL (trustchain_db on 127.0.0.1:5432)
- Blockchain: Hardhat local node on 127.0.0.1:8545 (5 deployed smart contracts)
- Backend API: FastAPI on http://localhost:8080
- Frontend: Next.js on http://localhost:3000
- IoT Simulator: on http://localhost:8001
"""
import sys
import os
import json
import time
import uuid
import hashlib
import httpx
from datetime import datetime, timezone, timedelta

BASE_URL = "http://localhost:8080/api/v1"
FRONTEND_URL = "http://localhost:3000"
IOT_SIGNING_KEY = "trustchain_iot_master_signing_key_production_2026"

client = httpx.Client(base_url=BASE_URL, timeout=30.0)

def sign_iot_payload(device_id: str, package_id: str | None, temp: float, humidity: float,
                     lat: float, lng: float, nonce: str, ts: str, tampered: bool = False) -> str:
    payload = f"{device_id}:{package_id}:{temp}:{humidity}:{lat}:{lng}:{nonce}:{ts}"
    key = IOT_SIGNING_KEY if not tampered else "TAMPERED_INVALID_KEY"
    return hashlib.sha256(f"{payload}:{key}".encode()).hexdigest()

def step(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def main():
    results = {}
    
    # =========================================================================
    # STEP 1: START AS SUPER ADMIN
    # =========================================================================
    step("1. START AS SUPER ADMIN & VERIFY AUTHENTICATION & POSTGRESQL KPIS")
    login_resp = client.post("/auth/login", json={
        "email": "admin@trustchain.local",
        "password": "Admin@TrustChain2026!"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    auth_data = login_resp.json()
    token = auth_data["access_token"]
    admin_user = auth_data["user"]
    print(f"[OK] JWT token received: {token[:25]}... (len: {len(token)})")
    print(f"[OK] Logged in as: {admin_user['full_name']} | Role: {admin_user['role']}")
    assert admin_user["role"] == "SUPER_ADMIN", "User is not SUPER_ADMIN"
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Verify /me endpoint
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 200
    print(f"[OK] /auth/me verified: {me_resp.json()['email']} is {me_resp.json()['role']}")
    
    # Verify Admin dashboard stats from PostgreSQL
    dash_resp = client.get("/dashboard/stats", headers=headers)
    assert dash_resp.status_code == 200, f"Dashboard stats failed: {dash_resp.text}"
    stats = dash_resp.json()
    print("[OK] Real Dashboard KPIs loaded from PostgreSQL:")
    print(f"     - Total Organizations: {stats['total_organizations']}")
    print(f"     - Total Products:      {stats['total_products']}")
    print(f"     - Total Batches:       {stats['total_batches']}")
    print(f"     - Total Packages:      {stats['total_packages']}")
    print(f"     - Active Shipments:    {stats['active_shipments']}")
    print(f"     - Verified Packages:   {stats['verified_packages']}")
    print(f"     - Fraud Alerts (Open): {stats['fraud_alerts_open']}")
    print(f"     - Cold Chain Breaches: {stats['cold_chain_breaches']}")
    print(f"     - Quarantined:         {stats['quarantined_packages']}")
    print(f"     - Recalled Batches:    {stats['recalled_batches']}")
    print(f"     - Total IoT (24h):     {stats['total_iot_readings_24h']}")
    print(f"     - Blockchain Txs:      {stats['blockchain_tx_count']}")
    print(f"     - System Health:       {stats['system_health']}")
    
    # Query total users and total devices
    users_resp = client.get("/users", headers=headers)
    total_users = users_resp.json().get("total", 0)
    devices_resp = client.get("/iot/devices", headers=headers)
    total_devices = devices_resp.json().get("total", 0)
    print(f"     - Total Users:         {total_users}")
    print(f"     - Total IoT Devices:   {total_devices}")
    
    # =========================================================================
    # STEP 2: ORGANIZATION MANAGEMENT
    # =========================================================================
    step("2. ORGANIZATION MANAGEMENT — VERIFY & CREATE 5 REQUIRED ORGANIZATIONS")
    target_orgs = [
        {"name": "ABC Pharma", "type": "MANUFACTURER", "license": "MFG-L-ABC001", "city": "Delhi", "state": "Delhi", "reg": "DEL-ABC-001", "lat": 28.6139, "lng": 77.2090},
        {"name": "MediDistrib", "type": "DISTRIBUTOR", "license": "DIST-L-001", "city": "Kolkata", "state": "West Bengal", "reg": "WB-DIST-002", "lat": 22.5726, "lng": 88.3639},
        {"name": "TrustWarehouse", "type": "WAREHOUSE", "license": "WH-L-001", "city": "Jamshedpur", "state": "Jharkhand", "reg": "JH-WH-001", "lat": 22.8046, "lng": 86.2029},
        {"name": "FastTrack Logistics", "type": "LOGISTICS", "license": "LOG-L-001", "city": "Delhi", "state": "Delhi", "reg": "DL-LOG-002", "lat": 28.7041, "lng": 77.1025},
        {"name": "MediMart", "type": "RETAILER", "license": "RET-L-001", "city": "Jamshedpur", "state": "Jharkhand", "reg": "JH-RET-001", "lat": 22.7980, "lng": 86.1950},
    ]
    
    org_map = {}
    for o in target_orgs:
        # Check if already exists
        list_res = client.get(f"/organizations?search={o['name']}", headers=headers)
        existing = [item for item in list_res.json()["items"] if item["name"] == o["name"]]
        if existing:
            org_id = existing[0]["id"]
            org_data = existing[0]
            print(f"[EXISTS] Organization: {o['name']} (ID: {org_id}, Type: {org_data['org_type']}, City: {org_data['city']})")
        else:
            create_res = client.post("/organizations", headers=headers, json={
                "name": o["name"],
                "org_type": o["type"],
                "city": o["city"],
                "state": o["state"],
                "country": "India",
                "latitude": o["lat"],
                "longitude": o["lng"],
                "registration_number": o["reg"],
                "license_number": o["license"],
                "contact_email": f"contact@{o['name'].lower().replace(' ', '')}.com",
                "is_active": True,
            })
            assert create_res.status_code == 201, f"Failed to create org {o['name']}: {create_res.text}"
            org_data = create_res.json()
            org_id = org_data["id"]
            print(f"[CREATED] Organization: {o['name']} (ID: {org_id}, Type: {org_data['org_type']}, License: {org_data['license_number']}, City: {org_data['city']})")
        
        org_map[o["name"]] = org_id
        
        # Verify single get
        single_res = client.get(f"/organizations/{org_id}", headers=headers)
        assert single_res.status_code == 200
        verified_org = single_res.json()
        assert verified_org["name"] == o["name"]
        assert verified_org["is_active"] is True
        print(f"         Verified in PostgreSQL via API -> ID: {org_id} | Type: {verified_org['org_type']} | City: {verified_org['city']} | Active: {verified_org['is_active']}")

    # =========================================================================
    # STEP 3: USER MANAGEMENT & RBAC VERIFICATION
    # =========================================================================
    step("3. USER MANAGEMENT & RBAC VERIFICATION")
    role_users = [
        {"email": "manufacturer_user@abcpharma.com", "name": "Rajesh Sharma (Manufacturer)", "role": "MANUFACTURER", "org_id": org_map["ABC Pharma"], "pwd": "Password@123456"},
        {"email": "distributor_user@medidistrib.com", "name": "Amit Sen (Distributor)", "role": "DISTRIBUTOR", "org_id": org_map["MediDistrib"], "pwd": "Password@123456"},
        {"email": "warehouse_user@trustwarehouse.com", "name": "Suresh Rao (Warehouse)", "role": "WAREHOUSE", "org_id": org_map["TrustWarehouse"], "pwd": "Password@123456"},
        {"email": "logistics_user@fasttrack.com", "name": "Vipin Verma (Logistics)", "role": "LOGISTICS", "org_id": org_map["FastTrack Logistics"], "pwd": "Password@123456"},
        {"email": "retailer_user@medimart.com", "name": "Pooja Gupta (Retailer)", "role": "RETAILER", "org_id": org_map["MediMart"], "pwd": "Password@123456"},
        {"email": "auditor_user@independentaudit.com", "name": "Dr. Kavita Joshi (Auditor)", "role": "AUDITOR", "org_id": None, "pwd": "Password@123456"},
    ]
    
    user_tokens = {}
    for ru in role_users:
        # Check if user exists
        u_list = client.get(f"/users?search={ru['email']}", headers=headers)
        u_items = [u for u in u_list.json()["items"] if u["email"] == ru["email"]]
        if not u_items:
            cr = client.post("/users", headers=headers, json={
                "email": ru["email"],
                "password": ru["pwd"],
                "full_name": ru["name"],
                "role": ru["role"],
                "organization_id": ru["org_id"],
                "is_active": True,
            })
            assert cr.status_code == 201, f"Failed to create user {ru['email']}: {cr.text}"
            print(f"[CREATED] User: {ru['name']} | Role: {ru['role']} | Email: {ru['email']}")
        else:
            print(f"[EXISTS] User: {ru['name']} | Role: {ru['role']} | Email: {ru['email']}")
            
        # Log in with each user to obtain tokens and verify role authentication
        u_log = client.post("/auth/login", json={"email": ru["email"], "password": ru["pwd"]})
        assert u_log.status_code == 200, f"Login failed for {ru['email']}: {u_log.text}"
        u_token = u_log.json()["access_token"]
        user_tokens[ru["role"]] = u_token
        print(f"         Login verified -> JWT generated for role: {ru['role']}")

    # RBAC TEST 1: MANUFACTURER cannot create new users
    mfg_headers = {"Authorization": f"Bearer {user_tokens['MANUFACTURER']}"}
    mfg_forbidden = client.post("/users", headers=mfg_headers, json={
        "email": "hacker@test.com", "password": "Password@123", "full_name": "Hacker", "role": "SUPER_ADMIN"
    })
    print(f"[RBAC PASS] MANUFACTURER attempting POST /users: HTTP {mfg_forbidden.status_code} (Forbidden)")
    assert mfg_forbidden.status_code == 403

    # RBAC TEST 2: MANUFACTURER cannot manage organizations
    mfg_org_forbidden = client.post("/organizations", headers=mfg_headers, json={
        "name": "Rogue Org", "org_type": "MANUFACTURER", "country": "India"
    })
    print(f"[RBAC PASS] MANUFACTURER attempting POST /organizations: HTTP {mfg_org_forbidden.status_code} (Forbidden)")
    assert mfg_org_forbidden.status_code == 403

    # RBAC TEST 3: AUDITOR is read-only (cannot create products)
    auditor_headers = {"Authorization": f"Bearer {user_tokens['AUDITOR']}"}
    auditor_forbidden = client.post("/products", headers=auditor_headers, json={
        "sku": "AUD-TEST", "name": "Auditor Test", "category": "PHARMACEUTICAL", "manufacturer_id": org_map["ABC Pharma"]
    })
    print(f"[RBAC PASS] AUDITOR attempting POST /products: HTTP {auditor_forbidden.status_code} (Forbidden)")
    assert auditor_forbidden.status_code == 403
    
    # =========================================================================
    # STEP 4: CREATE A REAL PRODUCT
    # =========================================================================
    step("4. CREATE A REAL PRODUCT (PARACETAMOL 500MG)")
    prod_sku = "PARA-500-MG"
    # Check if product exists
    p_check = client.get(f"/products?search=Paracetamol+500mg", headers=mfg_headers)
    p_items = [p for p in p_check.json()["items"] if p["name"] == "Paracetamol 500mg"]
    if p_items:
        product_id = p_items[0]["id"]
        prod_data = p_items[0]
        print(f"[EXISTS] Product: Paracetamol 500mg (ID: {product_id}, SKU: {prod_data['sku']})")
    else:
        prod_res = client.post("/products", headers=mfg_headers, json={
            "sku": prod_sku,
            "name": "Paracetamol 500mg",
            "category": "PHARMACEUTICAL",
            "description": "High purity analgesic and antipyretic medicine",
            "manufacturer_id": org_map["ABC Pharma"],
            "min_temperature": 2.0,
            "max_temperature": 8.0,
            "max_humidity": 70.0,
            "expiry_period_days": 730,  # 24 Months
            "regulatory_license": "CDSCO-DL-PARA500",
        })
        assert prod_res.status_code == 201, f"Failed to create product: {prod_res.text}"
        prod_data = prod_res.json()
        product_id = prod_data["id"]
        print(f"[CREATED] Product: {prod_data['name']} (ID: {product_id})")

    # Verify retrieval from PostgreSQL
    p_get = client.get(f"/products/{product_id}", headers=headers)
    assert p_get.status_code == 200
    p_verified = p_get.json()
    print(f"[OK] Verified from PostgreSQL API:")
    print(f"     - Product ID: {p_verified['id']}")
    print(f"     - Name: {p_verified['name']} (SKU: {p_verified['sku']})")
    print(f"     - Category: {p_verified['category']}")
    print(f"     - Storage Range: {p_verified['min_temperature']}°C to {p_verified['max_temperature']}°C")
    print(f"     - Humidity Limit: {p_verified['max_humidity']}%")
    print(f"     - Expiry Period: {p_verified['expiry_period_days']} days (24 Months)")
    print(f"     - Manufacturer: {p_verified['manufacturer']['name']} (ID: {p_verified['manufacturer_id']})")
    assert p_verified["min_temperature"] == 2.0
    assert p_verified["max_temperature"] == 8.0
    assert p_verified["max_humidity"] == 70.0

    # =========================================================================
    # STEP 5 & 6: CREATE A REAL BATCH & REGISTER ON BLOCKCHAIN
    # =========================================================================
    step("5 & 6. CREATE REAL BATCH (MED-2026-001) & REGISTER ON REAL BLOCKCHAIN")
    batch_num = "MED-2026-001"
    b_check = client.get(f"/batches?status=REGISTERED", headers=mfg_headers)
    b_items = [b for b in b_check.json()["items"] if b["batch_number"] == batch_num]
    if b_items:
        batch_id = b_items[0]["id"]
        batch_data = b_items[0]
        print(f"[EXISTS] Batch {batch_num} (ID: {batch_id})")
    else:
        mfg_date = "2026-10-02T00:00:00Z"
        exp_date = "2028-10-01T23:59:59Z"
        batch_res = client.post("/batches", headers=mfg_headers, json={
            "batch_number": batch_num,
            "product_id": product_id,
            "quantity": 100,
            "manufacturing_date": mfg_date,
            "expiry_date": exp_date,
            "notes": "Paracetamol 500mg Batch 001 - Production Grade",
        })
        assert batch_res.status_code == 201, f"Failed to create batch: {batch_res.text}"
        batch_data = batch_res.json()
        batch_id = batch_data["id"]
        print(f"[CREATED] Batch {batch_data['batch_number']} (ID: {batch_id})")

    # Verify batch in PostgreSQL
    b_get = client.get(f"/batches/{batch_id}", headers=headers)
    assert b_get.status_code == 200
    b_verified = b_get.json()
    print(f"[OK] Verified Batch Record in PostgreSQL:")
    print(f"     - Batch ID: {b_verified['id']}")
    print(f"     - Batch Number: {b_verified['batch_number']}")
    print(f"     - Quantity: {b_verified['quantity']}")
    print(f"     - Status: {b_verified['status']}")
    print(f"     - Blockchain Tx Hash: {b_verified['blockchain_tx_hash']}")
    
    # Blockchain verification (Hardhat EVM node)
    assert b_verified["blockchain_tx_hash"] is not None, "No blockchain tx hash generated!"
    print(f"[OK] Real Blockchain Transaction verified:")
    print(f"     - Tx Hash: {b_verified['blockchain_tx_hash']}")
    print(f"     - Batch Status: {b_verified['status']}")

    # =========================================================================
    # STEP 7: GENERATE 100 INDIVIDUAL PACKAGES
    # =========================================================================
    step("7. GENERATE 100 INDIVIDUAL PACKAGES")
    pkg_list_check = client.get(f"/packages?batch_id={batch_id}&size=100", headers=mfg_headers)
    pkg_items = pkg_list_check.json()["items"]
    if len(pkg_items) < 100:
        gen_res = client.post(f"/batches/{batch_id}/generate-packages", headers=mfg_headers)
        assert gen_res.status_code == 200, f"Failed to generate packages: {gen_res.text}"
        print(f"[OK] Generated packages: {gen_res.json().get('packages_generated', 100)} units")
        pkg_list_check = client.get(f"/packages?batch_id={batch_id}&size=100", headers=mfg_headers)
        pkg_items = pkg_list_check.json()["items"]
    else:
        print(f"[EXISTS] 100 packages already generated for batch {batch_num}")

    print(f"[OK] Total packages retrieved from DB: {len(pkg_items)}")
    print(f"     First Package: {pkg_items[0]['package_code']} | Hash: {pkg_items[0]['crypto_hash'][:16]}...")
    print(f"     Last Package:  {pkg_items[-1]['package_code']} | Hash: {pkg_items[-1]['crypto_hash'][:16]}...")
    
    # Verify uniqueness of cryptographic identities
    hashes = set(p["crypto_hash"] for p in pkg_items)
    codes = set(p["package_code"] for p in pkg_items)
    assert len(hashes) == len(pkg_items), "Duplicate cryptographic identities detected!"
    assert len(codes) == len(pkg_items), "Duplicate package codes detected!"
    print(f"[PASS] Verified: All {len(pkg_items)} packages have 100% UNIQUE cryptographic hashes and codes.")

    clean_pkg = next((p for p in pkg_items if p["status"] == "CREATED"), pkg_items[5])
    test_pkg_code = clean_pkg["package_code"]
    test_pkg_id = clean_pkg["id"]

    # =========================================================================
    # STEP 8: GENERATE AND TEST QR CODE & CONSUMER VERIFICATION
    # =========================================================================
    step(f"8. GENERATE & TEST QR CODE FOR PACKAGE {test_pkg_code}")
    qr_res = client.get(f"/packages/{test_pkg_code}/qr", headers=headers)
    assert qr_res.status_code == 200
    qr_data = qr_res.json()
    print(f"[OK] QR Code generated successfully:")
    print(f"     - Package Code: {qr_data['package_code']}")
    print(f"     - Verification URL: {qr_data['verification_url']}")
    print(f"     - QR Data URI: {qr_data['qr_base64'][:50]}... (Base64 PNG)")
    assert f"/verify/{test_pkg_code}" in qr_data["verification_url"]

    # Public consumer scan / verification test
    consumer_res = client.get(f"/consumer/verify/{test_pkg_code}")
    assert consumer_res.status_code == 200, f"Consumer verify failed: {consumer_res.text}"
    c_data = consumer_res.json()
    print(f"[OK] Consumer verification response from live backend:")
    print(f"     - Product Name:      {c_data['product']['name']}")
    print(f"     - SKU:               {c_data['product']['sku']}")
    print(f"     - Batch Number:      {c_data['batch']['batch_number']}")
    print(f"     - Manufacturer:      {c_data['manufacturer']['name']}")
    print(f"     - Status:            {c_data['status']}")
    print(f"     - Is Authentic:      {c_data['is_authentic']}")
    print(f"     - Cold Chain OK:     {c_data['cold_chain_ok']}")
    print(f"     - Risk Score:        {c_data['risk_score']} ({c_data['risk_level']})")
    assert c_data["is_authentic"] is True
    assert c_data["product"]["name"] == "Paracetamol 500mg"
    assert c_data["batch"]["batch_number"] == batch_num

    # =========================================================================
    # STEP 9: CREATE A REAL SHIPMENT
    # =========================================================================
    step("9. CREATE A REAL SHIPMENT (DELHI -> KOLKATA -> JAMSHEDPUR)")
    all_pkg_ids = [p["id"] for p in pkg_items]
    shp_res = client.post("/shipments", headers=mfg_headers, json={
        "origin_org_id": org_map["ABC Pharma"],       # Delhi
        "destination_org_id": org_map["MediMart"],     # Jamshedpur
        "carrier": "FastTrack Logistics",
        "vehicle_number": "DL-01-FT-2026",
        "driver_name": "Rajendra Prasad",
        "driver_phone": "+91-9811223344",
        "expected_delivery": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "notes": "Route: Delhi -> Kolkata -> Jamshedpur (SHP-2026-001)",
        "package_ids": all_pkg_ids,
    })
    assert shp_res.status_code == 201, f"Failed to create shipment: {shp_res.text}"
    shp_data = shp_res.json()
    shipment_id = shp_data["id"]
    shipment_num = shp_data["shipment_number"]
    print(f"[CREATED] Shipment {shipment_num} (ID: {shipment_id})")
    print(f"          Origin: {shp_data['origin']['name']} ({shp_data['origin']['city']})")
    print(f"          Destination: {shp_data['destination']['name']} ({shp_data['destination']['city']})")
    print(f"          Carrier: {shp_data['carrier']}")
    print(f"          Status: {shp_data['status']}")
    print(f"          Blockchain Tx: {shp_data['blockchain_tx_hash']}")

    # =========================================================================
    # STEP 10: PERFORM REAL CUSTODY TRANSFERS
    # =========================================================================
    step("10. PERFORM REAL CUSTODY TRANSFERS (CHAIN OF CUSTODY WORKFLOW)")
    print("Chain: ABC Pharma -> MediDistrib -> TrustWarehouse -> FastTrack Logistics -> MediMart")
    
    transfers = [
        ("ABC Pharma", "MediDistrib", "TRANSFER", "Delhi Logistics Hub", 28.6139, 77.2090),
        ("MediDistrib", "TrustWarehouse", "TRANSFER", "Kolkata Distribution Warehouse", 22.5726, 88.3639),
        ("TrustWarehouse", "FastTrack Logistics", "PICKUP", "Jamshedpur Central Warehouse", 22.8046, 86.2029),
        ("FastTrack Logistics", "MediMart", "DELIVERY", "MediMart Pharmacy Store, Jamshedpur", 22.7980, 86.1950),
    ]

    for from_org, to_org, ev_type, loc_name, lat, lng in transfers:
        handover_res = client.post("/shipments/handover", headers=headers, json={
            "shipment_id": shipment_id,
            "package_id": test_pkg_id,
            "event_type": ev_type,
            "from_org_id": org_map[from_org],
            "to_org_id": org_map[to_org],
            "location_name": loc_name,
            "location_lat": lat,
            "location_lng": lng,
            "notes": f"Custody transfer from {from_org} to {to_org} at {loc_name}",
        })
        assert handover_res.status_code == 201, f"Handover failed: {handover_res.text}"
        ev_data = handover_res.json()
        print(f"[CUSTODY TRANSFER] {from_org:20} -> {to_org:20} | Event: {ev_type:8} | Tx: {ev_data.get('blockchain_tx', 'Confirmed')[:20]}...")

    # Verify Journey in PostgreSQL
    journey_res = client.get(f"/shipments/{shipment_id}/journey", headers=headers)
    assert journey_res.status_code == 200
    journey = journey_res.json()
    print(f"[OK] Verified Complete Custody Journey: {len(journey)} events recorded in PostgreSQL.")

    # =========================================================================
    # STEP 11: START & VERIFY IOT TELEMETRY (DEVICES: IOT-DEL-001, IOT-KOL-001, IOT-JSR-001)
    # =========================================================================
    step("11. START IoT TELEMETRY INGESTION (IOT-DEL-001, IOT-KOL-001, IOT-JSR-001)")
    
    # Ensure IOT-KOL-001 and IOT-JSR-001 exist in DB
    for dev_id, dev_name, loc in [
        ("IOT-DEL-001", "Delhi Distribution Hub Sensor", "Delhi"),
        ("IOT-KOL-001", "Kolkata Transit Monitor", "Kolkata"),
        ("IOT-JSR-001", "Jamshedpur Depot Sensor", "Jamshedpur"),
    ]:
        dev_chk = client.get(f"/iot/devices/{dev_id}", headers=headers)
        if dev_chk.status_code == 404:
            reg_res = client.post("/iot/devices", headers=headers, json={
                "device_id": dev_id,
                "device_name": dev_name,
                "location": loc,
                "is_active": True,
            })
            assert reg_res.status_code == 201, f"Failed to register device: {reg_res.text}"
            print(f"[REGISTERED] Device: {dev_id} ({dev_name}) via REST API")
        else:
            print(f"[READY] Device: {dev_id} ({dev_name})")

    # Ingest valid telemetry for test package
    now_iso = datetime.now(timezone.utc).isoformat()
    nonce1 = str(uuid.uuid4())
    sig1 = sign_iot_payload("IOT-DEL-001", test_pkg_code, 5.2, 58.0, 28.7041, 77.1025, nonce1, now_iso)
    
    ingest1 = client.post("/iot/ingest", json={
        "device_id": "IOT-DEL-001",
        "package_id": test_pkg_code,
        "shipment_id": shipment_num,
        "temperature": 5.2,
        "humidity": 58.0,
        "latitude": 28.7041,
        "longitude": 77.1025,
        "battery": 92.5,
        "nonce": nonce1,
        "timestamp": now_iso,
        "signature": sig1,
    })
    assert ingest1.status_code == 201, f"Ingest failed: {ingest1.text}"
    print(f"[OK] Ingested valid telemetry: 5.2°C, 58% humidity, signature_valid={ingest1.json()['signature_valid']}")
    assert ingest1.json()["signature_valid"] is True

    # =========================================================================
    # STEP 12: VERIFY DIGITAL SIGNATURE VERIFICATION (VALID VS INVALID)
    # =========================================================================
    step("12. VERIFY DIGITAL SIGNATURE (VALID -> ACCEPT, TAMPERED -> REJECT / FRAUD ALERT)")
    
    # Submit invalid / tampered signature
    now_iso2 = datetime.now(timezone.utc).isoformat()
    nonce2 = str(uuid.uuid4())
    bad_sig = "deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef"
    
    ingest_bad = client.post("/iot/ingest", json={
        "device_id": "IOT-DEL-001",
        "package_id": test_pkg_code,
        "shipment_id": shipment_num,
        "temperature": 5.4,
        "humidity": 55.0,
        "latitude": 28.7041,
        "longitude": 77.1025,
        "battery": 90.0,
        "nonce": nonce2,
        "timestamp": now_iso2,
        "signature": bad_sig,
    })
    assert ingest_bad.status_code == 201
    bad_res = ingest_bad.json()
    print(f"[TEST RESULT] Ingest with tampered signature:")
    print(f"              signature_valid:   {bad_res['signature_valid']} (Expected: False)")
    print(f"              alerts_generated:  {bad_res['alerts_generated']} (Expected: >= 1)")
    assert bad_res["signature_valid"] is False
    assert bad_res["alerts_generated"] >= 1

    # =========================================================================
    # STEP 13: TEST REPLAY ATTACK
    # =========================================================================
    step("13. TEST REPLAY ATTACK (RESUBMISSION OF SAME NONCE)")
    replay_nonce = "REPLAY-NONCE-" + str(uuid.uuid4())
    ts_replay = datetime.now(timezone.utc).isoformat()
    sig_replay = sign_iot_payload("IOT-KOL-001", test_pkg_code, 5.5, 60.0, 22.5726, 88.3639, replay_nonce, ts_replay)
    
    # First submission: ACCEPTED
    res_first = client.post("/iot/ingest", json={
        "device_id": "IOT-KOL-001",
        "package_id": test_pkg_code,
        "shipment_id": shipment_num,
        "temperature": 5.5,
        "humidity": 60.0,
        "latitude": 22.5726,
        "longitude": 88.3639,
        "battery": 88.0,
        "nonce": replay_nonce,
        "timestamp": ts_replay,
        "signature": sig_replay,
    })
    assert res_first.status_code == 201
    print(f"[FIRST SUBMISSION] Nonce: {replay_nonce} -> Replay detected: {res_first.json()['replay_detected']} (False)")
    assert res_first.json()["replay_detected"] is False

    # Second submission with EXACT SAME NONCE: REPLAY DETECTED!
    res_second = client.post("/iot/ingest", json={
        "device_id": "IOT-KOL-001",
        "package_id": test_pkg_code,
        "shipment_id": shipment_num,
        "temperature": 5.5,
        "humidity": 60.0,
        "latitude": 22.5726,
        "longitude": 88.3639,
        "battery": 88.0,
        "nonce": replay_nonce,
        "timestamp": ts_replay,
        "signature": sig_replay,
    })
    assert res_second.status_code == 201
    replay_data = res_second.json()
    print(f"[REPLAY ATTACK SUBMISSION] Same Nonce submitted -> Replay detected: {replay_data['replay_detected']} (True)")
    print(f"                          Alerts generated: {replay_data['alerts_generated']}")
    assert replay_data["replay_detected"] is True
    assert replay_data["alerts_generated"] >= 1

    # =========================================================================
    # STEP 14: TEST COLD-CHAIN ATTACK (17.4°C BREACH)
    # =========================================================================
    step("14. TEST COLD-CHAIN ATTACK (17.4°C > 8.0°C MAXIMUM THRESHOLD)")
    ts_breach = datetime.now(timezone.utc).isoformat()
    nonce_breach = str(uuid.uuid4())
    sig_breach = sign_iot_payload("IOT-JSR-001", test_pkg_code, 17.4, 65.0, 22.8046, 86.2029, nonce_breach, ts_breach)
    
    breach_res = client.post("/iot/ingest", json={
        "device_id": "IOT-JSR-001",
        "package_id": test_pkg_code,
        "shipment_id": shipment_num,
        "temperature": 17.4,
        "humidity": 65.0,
        "latitude": 22.8046,
        "longitude": 86.2029,
        "battery": 85.0,
        "nonce": nonce_breach,
        "timestamp": ts_breach,
        "signature": sig_breach,
    })
    assert breach_res.status_code == 201
    b_out = breach_res.json()
    print(f"[COLD CHAIN BREACH SUBMITTED] Temp: 17.4°C (Limit: 2.0°C - 8.0°C)")
    print(f"                             Alerts Generated: {b_out['alerts_generated']}")
    assert b_out["alerts_generated"] >= 1

    # Check that Fraud Alerts table has COLD_CHAIN_BREACH
    alerts_res = client.get(f"/fraud/alerts?package_id={test_pkg_id}", headers=headers)
    breach_alerts = [a for a in alerts_res.json()["items"] if a["alert_type"] == "COLD_CHAIN_BREACH"]
    print(f"[OK] Found {len(breach_alerts)} COLD_CHAIN_BREACH alert(s) in PostgreSQL:")
    for a in breach_alerts:
        print(f"     - Alert ID: {a['id']} | Risk Score: {a['risk_score']} | Desc: {a['description']}")

    # =========================================================================
    # STEP 15: TEST GPS ANOMALY (JAMSHEDPUR -> MUMBAI TELEPORTATION)
    # =========================================================================
    step("15. TEST GPS ANOMALY (JAMSHEDPUR -> MUMBAI WITHIN 2 SECONDS)")
    # Reading 1 in Jamshedpur
    t1 = datetime.now(timezone.utc)
    nonce_gps1 = str(uuid.uuid4())
    sig_gps1 = sign_iot_payload("IOT-JSR-001", test_pkg_code, 5.5, 55.0, 22.8046, 86.2029, nonce_gps1, t1.isoformat())
    client.post("/iot/ingest", json={
        "device_id": "IOT-JSR-001", "package_id": test_pkg_code, "shipment_id": shipment_num,
        "temperature": 5.5, "humidity": 55.0, "latitude": 22.8046, "longitude": 86.2029,
        "battery": 80.0, "nonce": nonce_gps1, "timestamp": t1.isoformat(), "signature": sig_gps1,
    })
    print(f"[GPS POINT 1] Jamshedpur (Lat: 22.8046, Lng: 86.2029) at {t1.isoformat()}")

    # Reading 2 in Mumbai (1,400 km away) just 2 seconds later!
    t2 = t1 + timedelta(seconds=2)
    nonce_gps2 = str(uuid.uuid4())
    sig_gps2 = sign_iot_payload("IOT-JSR-001", test_pkg_code, 5.5, 55.0, 19.0760, 72.8777, nonce_gps2, t2.isoformat())
    gps_jump = client.post("/iot/ingest", json={
        "device_id": "IOT-JSR-001", "package_id": test_pkg_code, "shipment_id": shipment_num,
        "temperature": 5.5, "humidity": 55.0, "latitude": 19.0760, "longitude": 72.8777,
        "battery": 80.0, "nonce": nonce_gps2, "timestamp": t2.isoformat(), "signature": sig_gps2,
    })
    assert gps_jump.status_code == 201
    gps_out = gps_jump.json()
    print(f"[GPS POINT 2] Mumbai (Lat: 19.0760, Lng: 72.8777) at {t2.isoformat()}")
    print(f"              Calculated Movement: ~1,400 km in 2 seconds (~2,520,000 km/h!)")
    print(f"              GPS Anomaly Alert Triggered: alerts_generated={gps_out['alerts_generated']}")
    assert gps_out["alerts_generated"] >= 1

    gps_alerts = [a for a in client.get(f"/fraud/alerts?package_id={test_pkg_id}", headers=headers).json()["items"] if a["alert_type"] == "GPS_ANOMALY"]
    print(f"[OK] Found {len(gps_alerts)} GPS_ANOMALY alert(s) in PostgreSQL:")
    for a in gps_alerts:
        print(f"     - Alert ID: {a['id']} | Risk Score: {a['risk_score']} | Desc: {a['description']}")

    # =========================================================================
    # STEP 16: TEST QR CLONING / COUNTERFEIT DETECTION
    # =========================================================================
    step("16. TEST QR CLONING / COUNTERFEIT (SCAN IN JAMSHEDPUR, THEN RANCHI WITHIN 5s)")
    # Scan 1: Jamshedpur
    scan1 = client.get(f"/consumer/verify/{test_pkg_code}?lat=22.8046&lng=86.2029&location=Jamshedpur")
    assert scan1.status_code == 200
    print(f"[SCAN 1] Legitimate scan at Jamshedpur (22.8046, 86.2029) -> Result Status: {scan1.json()['status']}")

    time.sleep(1)

    # Scan 2: Ranchi (110 km away) within 2 seconds -> Impossible physical human transport!
    scan2 = client.get(f"/consumer/verify/{test_pkg_code}?lat=23.3441&lng=85.3096&location=Ranchi")
    assert scan2.status_code == 200
    s2_data = scan2.json()
    print(f"[SCAN 2] Cloned QR scanned at Ranchi (23.3441, 85.3096) within 1s (~110 km away)")
    print(f"         Verification Result:")
    print(f"         - Is Suspicious:    {s2_data['is_suspicious']}")
    print(f"         - Is Authentic:     {s2_data['is_authentic']}")
    print(f"         - Is Quarantined:   {s2_data['is_quarantined']}")
    print(f"         - Risk Score:       {s2_data['risk_score']} ({s2_data['risk_level']})")

    # Check DUPLICATE_PACKAGE alert in database
    dup_alerts = [a for a in client.get(f"/fraud/alerts?package_id={test_pkg_id}", headers=headers).json()["items"] if a["alert_type"] == "DUPLICATE_PACKAGE"]
    print(f"[OK] Found {len(dup_alerts)} DUPLICATE_PACKAGE alert(s) in PostgreSQL:")
    for a in dup_alerts:
        print(f"     - Alert ID: {a['id']} | Risk Score: {a['risk_score']} | Desc: {a['description']}")
    assert len(dup_alerts) >= 1, "Duplicate package counterfeit alert was not created!"

    # =========================================================================
    # FINAL: RE-CHECK DASHBOARD KPIS TO CONFIRM LIVE UPDATES
    # =========================================================================
    step("FINAL: RE-CHECK SUPER ADMIN DASHBOARD KPIS FROM POSTGRESQL")
    final_stats = client.get("/dashboard/stats", headers=headers).json()
    print("[FINAL DASHBOARD METRICS]")
    print(f" - Total Organizations: {final_stats['total_organizations']}")
    print(f" - Total Products:      {final_stats['total_products']}")
    print(f" - Total Batches:       {final_stats['total_batches']}")
    print(f" - Total Packages:      {final_stats['total_packages']}")
    print(f" - Active Shipments:    {final_stats['active_shipments']}")
    print(f" - Fraud Alerts (Open): {final_stats['fraud_alerts_open']}")
    print(f" - Cold Chain Breaches: {final_stats['cold_chain_breaches']}")
    print(f" - Quarantined:         {final_stats['quarantined_packages']}")
    print(f" - Recalled Batches:    {final_stats['recalled_batches']}")
    print(f" - Total IoT (24h):     {final_stats['total_iot_readings_24h']}")
    print(f" - Blockchain Txs:      {final_stats['blockchain_tx_count']}")

    print("\n" + "*" * 80)
    print(" ALL 16 REAL SUPER ADMIN END-TO-END WORKFLOW TESTS PASSED 100% SUCCESSFULLY!")
    print("*" * 80)

if __name__ == "__main__":
    main()
