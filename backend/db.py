from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ConversationEvent(Base):
    __tablename__ = "conversation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50), index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    conversation_id: Mapped[str | None] = mapped_column(String(255), index=True)
    sender_name: Mapped[str | None] = mapped_column(String(255))
    sender_email: Mapped[str | None] = mapped_column(String(255))
    message_text: Mapped[str | None] = mapped_column(Text)
    ai_intent: Mapped[str | None] = mapped_column(String(100), index=True)
    ai_reply: Mapped[str | None] = mapped_column(Text)
    workflow_status: Mapped[str | None] = mapped_column(String(100), index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class MessagingChannelSession(Base):
    __tablename__ = "messaging_channel_sessions"
    __table_args__ = (
        UniqueConstraint("channel", "conversation_id", name="uq_messaging_channel_sessions_channel_conversation"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), index=True)
    customer_identity_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    service_search_query: Mapped[str | None] = mapped_column(Text)
    service_options_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    reply_controls_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    last_ai_intent: Mapped[str | None] = mapped_column(String(100), index=True)
    last_workflow_status: Mapped[str | None] = mapped_column(String(100), index=True)
    last_reply_delivery_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    last_callback_ack_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class PartnerProfile(Base):
    __tablename__ = "partner_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(100))
    website_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(500))
    featured: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    is_active: Mapped[int] = mapped_column(Integer, default=1, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ServiceMerchantProfile(Base):
    __tablename__ = "service_merchant_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), index=True)
    business_email: Mapped[str | None] = mapped_column(String(255))
    owner_email: Mapped[str | None] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(100))
    summary: Mapped[str | None] = mapped_column(Text)
    amount_aud: Mapped[float | None] = mapped_column(Float)
    currency_code: Mapped[str] = mapped_column(String(8), default="AUD", nullable=False)
    display_price: Mapped[str | None] = mapped_column(String(255))
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    venue_name: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(500))
    map_url: Mapped[str | None] = mapped_column(String(500))
    booking_url: Mapped[str | None] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(String(500), index=True)
    tags_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    featured: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[int] = mapped_column(Integer, default=1, nullable=False, index=True)
    publish_state: Mapped[str] = mapped_column(String(32), default="draft", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantUserMembership(Base):
    __tablename__ = "tenant_user_memberships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    auth_provider: Mapped[str] = mapped_column(String(64), nullable=False, default="google")
    provider_subject: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(64), nullable=False, default="tenant_admin")
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantUserCredential(Base):
    __tablename__ = "tenant_user_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    tenant_slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_salt: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(64), nullable=False, default="tenant_admin")
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantEmailLoginCode(Base):
    __tablename__ = "tenant_email_login_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), index=True)
    tenant_slug: Mapped[str | None] = mapped_column(String(255), index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    auth_intent: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    code_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


def create_engine(database_url: str) -> AsyncEngine:
    return create_async_engine(database_url, future=True)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def init_database(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        advisory_lock_id = 2026042201
        await connection.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": advisory_lock_id})
        try:
            # Serialize ORM-driven bootstrap so parallel backend startups do not race on sequence creation.
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(
                text(
                    "ALTER TABLE service_merchant_profiles "
                    "ADD COLUMN IF NOT EXISTS business_email VARCHAR(255)"
                )
            )
            await connection.execute(
                text(
                    "ALTER TABLE service_merchant_profiles "
                    "ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64)"
                )
            )
            await connection.execute(
                text(
                    "ALTER TABLE service_merchant_profiles "
                    "ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255)"
                )
            )
            await connection.execute(
                text(
                    "ALTER TABLE service_merchant_profiles "
                    "ADD COLUMN IF NOT EXISTS publish_state VARCHAR(32) NOT NULL DEFAULT 'draft'"
                )
            )
            await connection.execute(
                text(
                    "ALTER TABLE service_merchant_profiles "
                    "ADD COLUMN IF NOT EXISTS currency_code VARCHAR(8) NOT NULL DEFAULT 'AUD'"
                )
            )
            await connection.execute(
                text(
                    "ALTER TABLE service_merchant_profiles "
                    "ADD COLUMN IF NOT EXISTS display_price VARCHAR(255)"
                )
            )
        finally:
            await connection.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": advisory_lock_id})


@asynccontextmanager
async def get_session(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    session = session_factory()
    try:
        yield session
    finally:
        await session.close()
