from enum import Enum
import enum
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float,
    ForeignKey, Integer, JSON, String, Text, Enum as SqlEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base


class DirectiveStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(200), nullable=False, unique=True, index=True)
    court_name = Column(String(255), nullable=True)
    date_of_order = Column(Date, nullable=True)
    pdf_path = Column(String(500), nullable=True)
    source = Column(String(100), nullable=True)
    status = Column(String(50), default="processing", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    directives = relationship(
        "Directive",
        back_populates="case",
        cascade="all, delete-orphan",
    )


class Directive(Base):
    __tablename__ = "directives"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    member1_id = Column(String(50), nullable=True)
    directive_text = Column(Text, nullable=False)
    responsible_entity = Column(String(255), nullable=True)
    deadline = Column(Date, nullable=True)
    deadline_raw = Column(String(300), nullable=True)  
    appeal_flag = Column(Boolean, default=False)
    ambiguity_flag = Column(Boolean, default=False)
    ambiguity_reason = Column(Text, nullable=True)
    directive_confidence_score = Column(Float, nullable=True)
    source_page = Column(Integer, nullable=True, index=True)
    
    
    status = Column(SqlEnum(DirectiveStatus), default=DirectiveStatus.PENDING, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", back_populates="directives")
    confidence_fields = relationship(
        "DirectiveFieldConfidence",
        back_populates="directive",
        cascade="all, delete-orphan",
    )
    action_plan = relationship(
        "ActionPlan",
        back_populates="directive",
        uselist=False,
        cascade="all, delete-orphan",
    )
    review_logs = relationship(
        "ReviewLog",
        back_populates="directive",
        cascade="all, delete-orphan",
    )
    alerts = relationship(
        "Alert",
        back_populates="directive",
        cascade="all, delete-orphan",
    )


class DirectiveFieldConfidence(Base):
    __tablename__ = "directive_fields_confidence"

    id = Column(Integer, primary_key=True, index=True)
    directive_id = Column(Integer, ForeignKey("directives.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)

    directive = relationship("Directive", back_populates="confidence_fields")


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, index=True)
    directive_id = Column(Integer, ForeignKey("directives.id", ondelete="CASCADE"), nullable=False)
    action = Column(Text, nullable=True)
    department = Column(String(255), nullable=True)
    timeline_days = Column(Integer, nullable=True)
    nature = Column(String(100), nullable=True)
    appeal_consideration = Column(Text, nullable=True)
    compliance_steps = Column(JSON, nullable=True)
    generation_source = Column(String(50), default="llm")
    generation_time_seconds = Column(Float, default=0.0)
    status = Column(String(50), default="pending_review")

    directive = relationship("Directive", back_populates="action_plan")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id = Column(Integer, primary_key=True, index=True)
    directive_id = Column(Integer, ForeignKey("directives.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String(100), nullable=False, default="system")
    action = Column(String(50), nullable=False)
    original_value = Column(JSON, nullable=False)
    corrected_value = Column(JSON, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    directive = relationship("Directive", back_populates="review_logs")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    directive_id = Column(Integer, ForeignKey("directives.id", ondelete="CASCADE"), nullable=False)
    officer_email = Column(String(255), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(Date, nullable=True, index=True)
    status = Column(String(50), default="pending")

    directive = relationship("Directive", back_populates="alerts")
