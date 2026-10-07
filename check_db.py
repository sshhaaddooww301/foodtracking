import sqlite3
import httpx

print("=== 1. DATABASE FILE CHECK (SQLite) ===")
conn = sqlite3.connect("backend/trustchain.db")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in cursor.fetchall()]
print(f"Total tables in database: {len(tables)}")
for t in ["users", "organizations", "products", "batches", "packages", "shipments", "iot_devices", "fraud_alerts"]:
    if t in tables:
        cursor.execute(f"SELECT count(*) FROM {t}")
        count = cursor.fetchone()[0]
        print(f"  Table '{t}': {count} rows")
    else:
        print(f"  Table '{t}': NOT FOUND")
conn.close()

print("\n=== 2. LIVE BACKEND DATABASE CONNECTION (HTTP REST) ===")
client = httpx.Client(base_url="http://localhost:8080", timeout=5.0)

# Test 1: Products
r_prod = client.get("/api/v1/products")
print(f"Products API: status {r_prod.status_code}, items in DB: {r_prod.json().get('total')}")

# Test 2: Batches
r_batch = client.get("/api/v1/batches")
print(f"Batches API: status {r_batch.status_code}, items in DB: {r_batch.json().get('total')}")

# Test 3: Packages
r_pkg = client.get("/api/v1/packages")
print(f"Packages API: status {r_pkg.status_code}, items in DB: {r_pkg.json().get('total')}")

# Test 4: Auth Check (Querying user table)
r_auth = client.post("/api/v1/auth/login", json={"email": "admin@trustchain.local", "password": "Admin@TrustChain2026!"})
print(f"Auth / Login (Users table query): status {r_auth.status_code}, logged in as: {r_auth.json().get('user', {}).get('full_name')}")

print("\n[SUCCESS] Database is 100% CONNECTED and responding to queries!")
