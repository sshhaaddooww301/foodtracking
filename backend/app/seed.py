"""
Database seed script.
Usage: python -m app.seed
Inserts realistic demo data for all entities.
"""
import asyncio
import sys
import os
import random
import string
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, async_engine as engine
from app.models.base import Base
from app.models.models import (
    Organization, User, Product, Batch, Package, Shipment, ShipmentItem,
    HandoverEvent, IoTDevice, OracleNode, AuditLog,
)
from app.models.enums import (
    OrganizationType, UserRole, ProductCategory, ProductStatus,
    BatchStatus, PackageStatus, ShipmentStatus, HandoverEventType,
)
from app.core.security import hash_password
from app.utils.qr_service import generate_package_hash


ORGS = [
    {"name": "PharmaCorp India Ltd", "org_type": OrganizationType.MANUFACTURER, "city": "Mumbai", "state": "Maharashtra", "latitude": 19.076, "longitude": 72.877, "registration_number": "MH-PHARMA-001", "license_number": "MFG-L-001"},
    {"name": "FoodTech Exports Pvt Ltd", "org_type": OrganizationType.MANUFACTURER, "city": "Ahmedabad", "state": "Gujarat", "latitude": 23.022, "longitude": 72.571, "registration_number": "GJ-FOOD-001", "license_number": "MFG-L-002"},
    {"name": "NaturaHerbs Manufacturing", "org_type": OrganizationType.MANUFACTURER, "city": "Hyderabad", "state": "Telangana", "latitude": 17.385, "longitude": 78.487, "registration_number": "TG-HERB-001", "license_number": "MFG-L-003"},
    {"name": "MediDistrib National", "org_type": OrganizationType.DISTRIBUTOR, "city": "Delhi", "state": "Delhi", "latitude": 28.704, "longitude": 77.102, "registration_number": "DL-DIST-001"},
    {"name": "FreshChain Distributors", "org_type": OrganizationType.DISTRIBUTOR, "city": "Kolkata", "state": "West Bengal", "latitude": 22.572, "longitude": 88.363, "registration_number": "WB-DIST-001"},
    {"name": "ColdStore Logistics Hub", "org_type": OrganizationType.WAREHOUSE, "city": "Pune", "state": "Maharashtra", "latitude": 18.520, "longitude": 73.856, "registration_number": "MH-WH-001"},
    {"name": "Central Depot Warehousing", "org_type": OrganizationType.WAREHOUSE, "city": "Chennai", "state": "Tamil Nadu", "latitude": 13.082, "longitude": 80.270, "registration_number": "TN-WH-001"},
    {"name": "SwiftMove Logistics", "org_type": OrganizationType.LOGISTICS, "city": "Bengaluru", "state": "Karnataka", "latitude": 12.971, "longitude": 77.594, "registration_number": "KA-LOG-001"},
    {"name": "FastTrack Cargo Services", "org_type": OrganizationType.LOGISTICS, "city": "Jaipur", "state": "Rajasthan", "latitude": 26.912, "longitude": 75.787, "registration_number": "RJ-LOG-001"},
    {"name": "MediMart Retail Chain", "org_type": OrganizationType.RETAILER, "city": "Mumbai", "state": "Maharashtra", "latitude": 19.100, "longitude": 72.890, "registration_number": "MH-RET-001"},
    {"name": "HealthPlus Pharmacy Network", "org_type": OrganizationType.RETAILER, "city": "Delhi", "state": "Delhi", "latitude": 28.650, "longitude": 77.230, "registration_number": "DL-RET-001"},
]

PRODUCTS = [
    {"sku": "AMOX-500-CAP", "name": "Amoxicillin 500mg Capsules", "category": ProductCategory.PHARMACEUTICAL, "min_temperature": 2.0, "max_temperature": 30.0, "max_humidity": 65.0, "expiry_period_days": 730, "drug_schedule": "H", "description": "Broad-spectrum antibiotic for bacterial infections", "regulatory_license": "CDSCO-D-001"},
    {"sku": "PARA-650-TAB", "name": "Paracetamol 650mg Tablets", "category": ProductCategory.PHARMACEUTICAL, "min_temperature": 2.0, "max_temperature": 30.0, "max_humidity": 60.0, "expiry_period_days": 1095, "drug_schedule": "OTC", "description": "Analgesic and antipyretic", "regulatory_license": "CDSCO-D-002"},
    {"sku": "INS-RAPID-10ML", "name": "Rapid-Acting Insulin 10ml", "category": ProductCategory.PHARMACEUTICAL, "min_temperature": 2.0, "max_temperature": 8.0, "max_humidity": 70.0, "expiry_period_days": 365, "drug_schedule": "H1", "description": "Cold-chain sensitive insulin vial", "regulatory_license": "CDSCO-D-003"},
    {"sku": "VIT-C-1000-TAB", "name": "Vitamin C 1000mg Effervescent", "category": ProductCategory.SUPPLEMENT, "min_temperature": 5.0, "max_temperature": 25.0, "max_humidity": 50.0, "expiry_period_days": 730, "description": "Immune support supplement"},
    {"sku": "OLV-OIL-500ML", "name": "Extra Virgin Olive Oil 500ml", "category": ProductCategory.FOOD, "min_temperature": 10.0, "max_temperature": 25.0, "max_humidity": 60.0, "expiry_period_days": 730, "description": "Cold-pressed olive oil"},
    {"sku": "HONEY-RAW-500G", "name": "Raw Organic Honey 500g", "category": ProductCategory.FOOD, "min_temperature": 10.0, "max_temperature": 30.0, "max_humidity": 55.0, "expiry_period_days": 1825, "description": "Certified organic raw honey"},
    {"sku": "TURMERIC-EXT-60CAP", "name": "Turmeric Extract 60 Capsules", "category": ProductCategory.SUPPLEMENT, "min_temperature": 2.0, "max_temperature": 30.0, "max_humidity": 60.0, "expiry_period_days": 730, "description": "High-potency curcumin extract"},
    {"sku": "MILK-WHOLE-1L", "name": "Whole Pasteurised Milk 1L", "category": ProductCategory.BEVERAGE, "min_temperature": 2.0, "max_temperature": 6.0, "max_humidity": 80.0, "expiry_period_days": 7, "description": "Cold-chain dairy product"},
]

IOT_DEVICES = [
    {"device_id": "IOT-MUM-001", "device_name": "Mumbai Cold Store Sensor", "location": "Mumbai"},
    {"device_id": "IOT-DEL-001", "device_name": "Delhi Distribution Hub Sensor", "location": "Delhi"},
    {"device_id": "IOT-BLR-001", "device_name": "Bengaluru Transit Tracker", "location": "Bengaluru"},
    {"device_id": "IOT-PUN-001", "device_name": "Pune Warehouse Monitor", "location": "Pune"},
    {"device_id": "IOT-HYD-001", "device_name": "Hyderabad Cold Chain Tracker", "location": "Hyderabad"},
    {"device_id": "IOT-CHN-001", "device_name": "Chennai Depot Sensor", "location": "Chennai"},
]

ORACLE_NODES = [
    {"oracle_id": "ORACLE-A", "name": "Primary Oracle Node A", "endpoint_url": "http://oracle-service:8002/node/A", "accuracy_score": 0.98},
    {"oracle_id": "ORACLE-B", "name": "Secondary Oracle Node B", "endpoint_url": "http://oracle-service:8002/node/B", "accuracy_score": 0.96},
    {"oracle_id": "ORACLE-C", "name": "Tertiary Oracle Node C", "endpoint_url": "http://oracle-service:8002/node/C", "accuracy_score": 0.97},
]






async def seed():
    print("[*] Initializing schema and seed...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("[*] Starting TrustChain Supply seed...")

        # Check if already seeded
        existing = await db.execute(select(Organization).limit(1))
        if existing.scalar_one_or_none():
            print("✅ Database already seeded. Skipping.")
            return

        # 1. Create Organizations
        print("  Creating organizations...")
        org_objects = []
        for o in ORGS:
            org = Organization(
                name=o["name"],
                org_type=o["org_type"].value,
                city=o.get("city"),
                state=o.get("state"),
                country="India",
                latitude=o.get("latitude"),
                longitude=o.get("longitude"),
                registration_number=o.get("registration_number"),
                license_number=o.get("license_number"),
                contact_email=f"contact@{o['name'].lower().replace(' ', '')}.com",
                is_active=True,
            )
            db.add(org)
            org_objects.append(org)
        await db.flush()

        manufacturers = [o for o in org_objects if o.org_type == OrganizationType.MANUFACTURER.value]
        distributors = [o for o in org_objects if o.org_type == OrganizationType.DISTRIBUTOR.value]
        warehouses = [o for o in org_objects if o.org_type == OrganizationType.WAREHOUSE.value]
        logistics = [o for o in org_objects if o.org_type == OrganizationType.LOGISTICS.value]
        retailers = [o for o in org_objects if o.org_type == OrganizationType.RETAILER.value]

        # 2. Create Users
        print("  Creating users...")
        super_admin = User(
            email="admin@trustchain.app",
            hashed_password=hash_password("Admin@123456"),
            full_name="Platform Administrator",
            role=UserRole.SUPER_ADMIN.value,
            is_active=True,
        )
        db.add(super_admin)

        super_admin_local = User(
            email="admin@trustchain.local",
            hashed_password=hash_password("Admin@TrustChain2026!"),
            full_name="Platform Administrator",
            role=UserRole.SUPER_ADMIN.value,
            is_active=True,
        )
        db.add(super_admin_local)

        role_org_pairs = [
            (UserRole.MANUFACTURER, manufacturers[0], "manufacturer@pharmcorp.com", "Rajesh Kumar", "Admin@123456"),
            (UserRole.MANUFACTURER, manufacturers[0], "pharma@cipla.demo", "Dr. Rajesh Cipla", "Admin@TrustChain2026!"),
            (UserRole.MANUFACTURER, manufacturers[1], "mfg@foodtech.com", "Priya Sharma", "Admin@123456"),
            (UserRole.DISTRIBUTOR, distributors[0], "dist@medidistrib.com", "Arjun Singh", "Admin@123456"),
            (UserRole.LOGISTICS, logistics[0], "dist@apollologistics.demo", "Vikram Apollo Logistics", "Admin@TrustChain2026!"),
            (UserRole.WAREHOUSE, warehouses[0], "wh@coldstore.com", "Sunita Patel", "Admin@123456"),
            (UserRole.LOGISTICS, logistics[0], "ops@swiftmove.com", "Vikram Nair", "Admin@123456"),
            (UserRole.RETAILER, retailers[0], "retail@medimart.com", "Ananya Iyer", "Admin@123456"),
            (UserRole.AUDITOR, None, "auditor@trustchain.app", "Compliance Auditor", "Admin@123456"),
            (UserRole.AUDITOR, None, "auditor@fda-regulator.demo", "Dr. Alok Regulatory Auditor", "Admin@TrustChain2026!"),
        ]

        for role, org, email, name, pwd in role_org_pairs:
            u = User(
                email=email,
                hashed_password=hash_password(pwd),
                full_name=name,
                role=role.value,
                organization_id=org.id if org else None,
                is_active=True,
            )
            db.add(u)

        await db.flush()

        # 3. Create Products
        print("  Creating products...")
        product_objects = []
        for i, p in enumerate(PRODUCTS):
            mfg = manufacturers[i % len(manufacturers)]
            product = Product(
                sku=p["sku"],
                name=p["name"],
                category=p["category"].value,
                description=p.get("description"),
                manufacturer_id=mfg.id,
                min_temperature=p.get("min_temperature"),
                max_temperature=p.get("max_temperature"),
                max_humidity=p.get("max_humidity"),
                expiry_period_days=p.get("expiry_period_days"),
                regulatory_license=p.get("regulatory_license"),
                drug_schedule=p.get("drug_schedule"),
                status=ProductStatus.ACTIVE.value,
            )
            db.add(product)
            product_objects.append(product)
        await db.flush()

        # 4. Create Batches and Packages
        print("  Creating batches and packages...")
        now = datetime.now(timezone.utc)
        batch_objects = []
        for i, product in enumerate(product_objects[:5]):  # 5 products get batches
            for j in range(2):  # 2 batches per product
                seq = i * 2 + j + 1
                manufacturing_date = now - timedelta(days=random.randint(30, 180))
                expiry_date = manufacturing_date + timedelta(days=product.expiry_period_days or 365)

                batch = Batch(
                    batch_number=f"BATCH-{seq:08d}",
                    product_id=product.id,
                    quantity=random.randint(50, 200),
                    manufacturing_date=manufacturing_date,
                    expiry_date=expiry_date,
                    status=BatchStatus.REGISTERED.value,
                    created_by=super_admin.id,
                    blockchain_tx_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                )
                db.add(batch)
                batch_objects.append(batch)
        await db.flush()

        # Generate packages for first 3 batches
        print("  Generating packages...")
        pkg_seq = 0
        all_packages = []
        for batch in batch_objects[:3]:
            pkg_count = min(batch.quantity, 20)  # Cap at 20 for seed
            for k in range(pkg_count):
                pkg_seq += 1
                package_code = f"PKG-{pkg_seq:06d}"
                crypto_hash = generate_package_hash(package_code, str(batch.id), str(batch.product_id))
                pkg = Package(
                    package_code=package_code,
                    batch_id=batch.id,
                    qr_payload=package_code,
                    crypto_hash=crypto_hash,
                    current_owner_id=manufacturers[0].id,
                    status=PackageStatus.REGISTERED.value,
                    risk_score=0.0,
                    risk_level="LOW",
                    blockchain_identity=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                )
                db.add(pkg)
                all_packages.append(pkg)
        await db.flush()

        # 5. Create IoT Devices
        print("  Creating IoT devices...")
        for dev_data in IOT_DEVICES:
            device = IoTDevice(
                device_id=dev_data["device_id"],
                device_name=dev_data["device_name"],
                organization_id=random.choice(org_objects).id,
                public_key="-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VdAyEAGDm2CpMlIYNzRmpUOxG0lfwO6YD+1yMjMZ9iFkNVhis=\n-----END PUBLIC KEY-----",
                is_active=True,
                firmware_version="v2.1.0",
                location=dev_data["location"],
            )
            db.add(device)

        # 6. Create Oracle Nodes
        print("  Creating oracle nodes...")
        for oracle_data in ORACLE_NODES:
            oracle = OracleNode(
                oracle_id=oracle_data["oracle_id"],
                name=oracle_data["name"],
                endpoint_url=oracle_data["endpoint_url"],
                status="ACTIVE",
                accuracy_score=oracle_data["accuracy_score"],
                total_attestations=random.randint(1000, 5000),
                failed_attestations=random.randint(5, 50),
            )
            db.add(oracle)

        # 7. Create a sample Shipment
        print("  Creating sample shipment...")
        if all_packages and len(org_objects) >= 4:
            shipment = Shipment(
                shipment_number="SHP-00000001",
                origin_org_id=manufacturers[0].id,
                destination_org_id=distributors[0].id,
                carrier="SwiftMove Logistics",
                vehicle_number="MH-01-AB-1234",
                driver_name="Ramesh Chandra",
                driver_phone="+91-9876543210",
                status=ShipmentStatus.IN_TRANSIT.value,
                expected_delivery=now + timedelta(days=2),
                created_by=super_admin.id,
                current_lat=19.076,
                current_lng=72.877,
                current_location_name="Mumbai, Maharashtra",
                temperature_compliant=True,
            )
            db.add(shipment)
            await db.flush()

            # Add packages to shipment
            for pkg in all_packages[:5]:
                item = ShipmentItem(shipment_id=shipment.id, package_id=pkg.id)
                pkg.status = PackageStatus.IN_TRANSIT.value
                db.add(item)
                db.add(pkg)

            # Create handover events
            events = [
                HandoverEvent(
                    shipment_id=shipment.id,
                    event_type=HandoverEventType.PICKUP.value,
                    from_org_id=manufacturers[0].id,
                    to_org_id=logistics[0].id,
                    performed_by=super_admin.id,
                    location_lat=19.076,
                    location_lng=72.877,
                    location_name="Mumbai Manufacturing Plant",
                    event_timestamp=now - timedelta(hours=12),
                ),
                HandoverEvent(
                    shipment_id=shipment.id,
                    event_type=HandoverEventType.TRANSFER.value,
                    from_org_id=logistics[0].id,
                    to_org_id=warehouses[0].id,
                    performed_by=super_admin.id,
                    location_lat=18.520,
                    location_lng=73.856,
                    location_name="Pune ColdStore Hub",
                    event_timestamp=now - timedelta(hours=6),
                ),
            ]
            for e in events:
                db.add(e)

        await db.commit()
        print("[+] Seed complete!")
        print("\nDemo Login Credentials:")
        print("  Super Admin:    admin@trustchain.local    / Admin@TrustChain2026!")
        print("  Manufacturer:   pharma@cipla.demo         / Admin@TrustChain2026!")
        print("  Logistics:      dist@apollologistics.demo / Admin@TrustChain2026!")
        print("  Auditor:        auditor@fda-regulator.demo / Admin@TrustChain2026!")


if __name__ == "__main__":
    asyncio.run(seed())
