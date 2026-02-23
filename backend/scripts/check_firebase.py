#!/usr/bin/env python3
"""
Arvion AI — Firebase Setup Checker
=====================================
Run this BEFORE the seed script to verify Firebase is correctly configured.

Usage:
    cd c:\\Users\\sujit\\arvion-ai\\backend
    python scripts/check_firebase.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("\n🔍 Izra AI — Firebase Configuration Check")
print("=" * 50)

# 1. Check .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
issues = []

print("\n[1/4] Checking .env file...")
if not os.path.exists(env_path):
    print("  ❌ .env file not found at backend/.env")
    issues.append("Create backend/.env — copy from .env.example and fill in values")
else:
    with open(env_path, "r") as f:
        env_content = f.read()

    if "YOUR_PROJECT_ID" in env_content or "arvion-ai\n" in env_content:
        print("  ⚠️  FIREBASE_PROJECT_ID looks like a placeholder — update it!")
        issues.append("Set real FIREBASE_PROJECT_ID in backend/.env")
    else:
        print("  ✅ .env file found")

# 2. Check service account key
print("\n[2/4] Checking service account key...")
key_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "serviceAccountKey.json")
if not os.path.exists(key_path):
    print("  ❌ serviceAccountKey.json NOT found at backend/serviceAccountKey.json")
    issues.append("Download service account key from Firebase Console and place it at backend/serviceAccountKey.json")
else:
    import json
    try:
        with open(key_path, "r") as f:
            key_data = json.load(f)
        required_fields = ["type", "project_id", "private_key", "client_email"]
        missing = [f for f in required_fields if f not in key_data]
        if missing:
            print(f"  ❌ serviceAccountKey.json is missing fields: {missing}")
            issues.append(f"Invalid service account key — missing: {missing}")
        else:
            print(f"  ✅ Service account key found")
            print(f"     Project:  {key_data.get('project_id')}")
            print(f"     Account:  {key_data.get('client_email')}")
    except json.JSONDecodeError:
        print("  ❌ serviceAccountKey.json is not valid JSON")
        issues.append("Re-download the service account key from Firebase Console")

# 3. Try Firebase connection
print("\n[3/4] Testing Firebase connection...")
try:
    from app.services.firebase import init_firebase, get_db
    init_firebase()
    db = get_db()
    # Quick read test
    list(db.collection("universities").limit(1).stream())
    print("  ✅ Connected to Firestore successfully!")
except Exception as e:
    err = str(e)
    print(f"  ❌ Firebase connection failed: {err[:120]}")
    if "Could not deserialize key" in err:
        issues.append("Invalid private key in serviceAccountKey.json")
    elif "PROJECT_ID" in err or "project" in err.lower():
        issues.append("FIREBASE_PROJECT_ID in .env does not match the service account key")
    else:
        issues.append(f"Firebase error: {err[:80]}")

# 4. Check if seeding is needed
print("\n[4/4] Checking if Firestore is seeded...")
try:
    db = get_db()
    docs = list(db.collection("universities").limit(1).stream())
    if docs:
        print("  ✅ Universities collection exists — already seeded")
    else:
        print("  ⚠️  Universities collection is empty — run seed_firestore.py next")
        issues.append("Run: python scripts/seed_firestore.py")
except Exception:
    print("  ⏭  Skipped (Firebase not connected)")

# Summary
print("\n" + "=" * 50)
if not issues:
    print("✅ ALL CHECKS PASSED — ready to start the backend!")
    print("\n  Run: uvicorn app.main:app --reload\n")
else:
    print(f"❌ {len(issues)} issue(s) to fix:\n")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
    print()
