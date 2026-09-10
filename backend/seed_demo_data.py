"""Seed script to populate sample loan applications into SQLite database."""
import datetime
from app.database import Base, engine, SessionLocal
from app.models import Application
from app.mock_data import DEMO_PROFILES

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if applications already exist
    existing_count = db.query(Application).count()
    if existing_count > 0:
        print(f"Database already contains {existing_count} applications.")
        db.close()
        return

    print("Seeding sample loan applications...")
    
    apps_data = [
        Application(
            reference_no="LN-2026-1042",
            applicant_name="राम कुमार (Ram Kumar)",
            village_or_address="भोजपुर (Bhojpur)",
            loan_amount=50000.0,
            loan_purpose="किराना दुकान (Kirana business)",
            monthly_income=15000.0,
            income_source="छोटा व्यापार (small shop)",
            aadhaar_last4="4321",
            status="pending verification",
            language="hi-IN",
            transcript=DEMO_PROFILES["ram_kumar"]["transcript"],
            created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
        ),
        Application(
            reference_no="LN-2026-8912",
            applicant_name="सुनीता देवी (Sunita Devi)",
            village_or_address="रालेगण सिद्धि (Ralegan Siddhi)",
            loan_amount=80000.0,
            loan_purpose="डेयरी और गाय (Dairy/Farming)",
            monthly_income=22000.0,
            income_source="खेती और दूध बिक्री (farming)",
            aadhaar_last4="9876",
            status="pending verification",
            language="hi-IN",
            transcript=DEMO_PROFILES["sunita_devi"]["transcript"],
            created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=5)
        )
    ]

    for app_item in apps_data:
        db.add(app_item)
    
    db.commit()
    db.close()
    print("Seeding complete! 2 sample applications created with status 'pending verification'.")

if __name__ == "__main__":
    seed_data()
