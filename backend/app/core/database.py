from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.core.config import settings

# Create database engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String, default="user")  # user, admin
    created_at = Column(DateTime, default=datetime.utcnow)

class Inspection(Base):
    __tablename__ = "inspections"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_number = Column(Integer, unique=True, index=True)
    user_id = Column(Integer, index=True)
    full_name = Column(String)
    email = Column(String)
    phone = Column(String)
    client_type = Column(String)  # homeowner, tenant, property_manager
    street_address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    square_footage = Column(Float)
    status = Column(String, default="pending")  # pending, in_progress, completed, report_ready
    has_visible_mold = Column(Boolean, default=False)
    has_water_damage = Column(Boolean, default=False)
    visible_mold_details = Column(Text)  # JSON string
    water_damage_details = Column(Text)  # JSON string
    temperature = Column(Float)
    humidity = Column(Float)
    client_status_detail = Column(String)
    lab_analysis_images = Column(Text)  # JSON array of image URLs
    conclusion = Column(Text)  # Lab analysis conclusion
    recommendations = Column(Text)  # Lab analysis recommendations
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Sample(Base):
    __tablename__ = "samples"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, index=True)
    location = Column(String)
    sample_type = Column(String)  # swab, air, surface
    status = Column(String, default="pending")  # pending, received, analyzed, completed
    results = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True, index=True)  # lab_received, report_ready, review_request
    subject = Column(String)
    body = Column(Text)  # HTML content from rich text editor
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine) 