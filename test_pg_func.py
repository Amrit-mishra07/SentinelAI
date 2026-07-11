from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
import sys
sys.path.insert(0, "./apps/aipcsr-api")
from app.models.scan import Scan

engine = create_engine("postgresql://aipcsr:aipcsr_dev@127.0.0.1:5432/aipcsr")
Session = sessionmaker(bind=engine)
db = Session()
try:
    print(db.query(func.date(Scan.created_at)).all())
    print("SUCCESS func.date")
except Exception as e:
    print("ERROR:", e)

try:
    from app.models.vulnerability import Vulnerability
    print(db.query(Vulnerability).filter(Vulnerability.severity == 'critical').all())
    print("SUCCESS severity == 'critical'")
except Exception as e:
    print("ERROR:", e)
