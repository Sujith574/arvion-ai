from app.services.firebase import init_firebase, get_db
init_firebase()
db = get_db()

unis = list(db.collection("universities").stream())
print(f"Universities: {len(unis)} docs")
for u in unis:
    print(f"  - {u.id}: {u.to_dict().get('name')}")

kb = list(db.collection("university_knowledge").stream())
print(f"\nKnowledge entries: {len(kb)}")

users = list(db.collection("users").stream())
print(f"Users: {len(users)}")
for u in users:
    d = u.to_dict()
    print(f"  - {d.get('email')} [{d.get('role')}]")
