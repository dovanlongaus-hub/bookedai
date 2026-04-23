from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import Header, Request
from httpx import HTTPError

from api.v1_routes import (
    ActorContextPayload,
    AppError,
    AuditLogRepository,
    IntegrationRepository,
    PortalBookingActionRequestPayload,
    RepositoryContext,
    ServiceMerchantProfile,
    Settings,
    TENANT_BILLING_WRITE_ROLES,
    TENANT_CATALOG_WRITE_ROLES,
    TENANT_INTEGRATION_WRITE_ROLES,
    TENANT_SUBSCRIPTION_PLAN_CODES,
    TENANT_TEAM_MANAGE_ROLES,
    TENANT_TEAM_ROLE_CODES,
    TenantBillingAccountUpdateRequestPayload,
    TenantCatalogImportRequestPayload,
    TenantCatalogCreateRequestPayload,
    TenantCatalogUpdateRequestPayload,
    TenantClaimAccountRequestPayload,
    TenantCreateAccountRequestPayload,
    TenantEmailCodeRequestPayload,
    TenantEmailCodeVerifyRequestPayload,
    TenantGoogleAuthRequestPayload,
    TenantIntegrationProviderUpdateRequestPayload,
    TenantInviteMemberRequestPayload,
    TenantMemberAccessUpdateRequestPayload,
    TenantPluginInterfaceUpdateRequestPayload,
    TenantPasswordAuthRequestPayload,
    TenantProfileUpdateRequestPayload,
    TenantRepository,
    TenantSubscriptionUpdateRequestPayload,
    TenantUserMembership,
    ValidationAppError,
    _apply_catalog_quality_to_service,
    _apply_tenant_catalog_update,
    _build_google_maps_url,
    _build_tenant_auth_response,
    _count_claimable_services,
    _create_or_update_tenant_credential,
    _create_tenant_session_token,
    _deliver_tenant_invite_email,
    _deliver_tenant_email_login_code,
    _error_response,
    _load_tenant_credential,
    _load_tenant_credential_by_email,
    _load_valid_tenant_email_login_code,
    _load_tenant_membership,
    _load_tenant_memberships_for_google_identity,
    _membership_role,
    _normalize_tenant_email_auth_intent,
    _normalize_tenant_slug_candidate,
    _require_tenant_membership_role,
    _resolve_tenant_catalog_service,
    _resolve_tenant_request_context,
    _store_tenant_email_login_code,
    _slugify_value,
    _success_response,
    _tenant_period_id_from_invoice_id,
    _upsert_tenant_membership,
    _verify_google_identity_token,
    _verify_tenant_password,
    apply_catalog_quality_gate,
    build_portal_booking_snapshot,
    build_tenant_billing_snapshot,
    build_tenant_bookings_snapshot,
    build_tenant_catalog_snapshot,
    build_tenant_integrations_snapshot,
    build_tenant_invoice_receipt,
    build_tenant_onboarding_snapshot,
    build_tenant_overview,
    build_tenant_plugin_interface_snapshot,
    build_tenant_team_snapshot,
    get_session,
    queue_portal_booking_request,
    select,
)
from repositories.reporting_repository import ReportingRepository
from service_layer.tenant_app_service import (
    TENANT_BILLING_PLAN_CATALOG,
    _clean_optional_text,
    _sanitize_workspace_html,
    create_tenant_stripe_billing_portal_session,
    create_tenant_stripe_checkout_session,
)


def _derive_google_tenant_business_name(
    *,
    business_name: str | None,
    google_name: str | None,
    google_email: str | None,
) -> str:
    normalized_business_name = str(business_name or "").strip()
    if normalized_business_name:
        return normalized_business_name

    normalized_google_name = str(google_name or "").strip()
    if normalized_google_name:
        return normalized_google_name

    email_local_part = str(google_email or "").strip().split("@", 1)[0]
    readable_local_part = " ".join(
        part
        for part in email_local_part.replace(".", " ").replace("_", " ").replace("-", " ").split()
        if part
    )
    return readable_local_part.title() or "BookedAI Tenant"


async def _resolve_available_google_tenant_slug(
    tenant_repository: TenantRepository,
    *,
    tenant_slug: str | None,
    business_name: str,
    google_email: str | None,
) -> str:
    base_slug = _normalize_tenant_slug_candidate(
        str(tenant_slug or "").strip() or business_name or str(google_email or "").split("@", 1)[0]
    )
    candidate = base_slug
    suffix = 2
    while await tenant_repository.get_tenant_profile(candidate):
        candidate = _normalize_tenant_slug_candidate(f"{base_slug}-{suffix}")
        suffix += 1
    return candidate


async def _resolve_tenant_memberships_for_email(
    session,
    *,
    email: str,
) -> list[dict[str, str | None]]:
    return await _load_tenant_memberships_for_google_identity(
        session,
        email=email,
        google_sub=None,
    )


async def tenant_email_code_request(request: Request, payload: TenantEmailCodeRequestPayload):
    normalized_email = payload.email.strip().lower()
    if not normalized_email:
        return _error_response(
            ValidationAppError(
                "tenant_email_code_email_required",
                "Email is required before BookedAI can send a tenant login code.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    auth_intent = _normalize_tenant_email_auth_intent(payload.auth_intent, default="sign-in")
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id: str | None = None
        tenant_slug: str | None = None
        tenant_name: str | None = None
        metadata: dict[str, str | None] = {
            "business_name": str(payload.business_name or "").strip() or None,
            "full_name": str(payload.full_name or "").strip() or None,
            "industry": str(payload.industry or "").strip() or None,
            "tenant_slug": str(payload.tenant_slug or "").strip() or None,
        }

        if auth_intent == "sign-in":
            if payload.tenant_ref:
                tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
                if not tenant_id:
                    return _error_response(
                        AppError(
                            code="tenant_not_found",
                            message="The requested tenant could not be resolved for email sign-in.",
                            status_code=404,
                            details={"tenant_ref": payload.tenant_ref},
                        ),
                        tenant_id=None,
                        actor_context=None,
                    )
                membership = await _load_tenant_membership(
                    session,
                    tenant_id=tenant_id,
                    email=normalized_email,
                    statuses=("active",),
                )
                if not membership:
                    return _error_response(
                        AppError(
                            code="tenant_email_code_membership_not_found",
                            message="No active tenant membership matches that email for this workspace.",
                            status_code=404,
                        ),
                        tenant_id=tenant_id,
                        actor_context=None,
                    )
                tenant_slug = str(membership.get("tenant_slug") or "").strip() or str(payload.tenant_ref)
                tenant_profile = await tenant_repository.get_tenant_profile(tenant_id)
                tenant_name = str((tenant_profile or {}).get("name") or "").strip() or tenant_slug
            else:
                memberships = await _resolve_tenant_memberships_for_email(session, email=normalized_email)
                if not memberships:
                    return _error_response(
                        AppError(
                            code="tenant_email_code_membership_not_found",
                            message="No active tenant workspace was found for that email. Use New workspace or Google create instead.",
                            status_code=404,
                        ),
                        tenant_id=None,
                        actor_context=None,
                    )
                if len(memberships) > 1:
                    return _error_response(
                        AppError(
                            code="tenant_email_code_multiple_memberships",
                            message="This email is linked to multiple tenant workspaces. Open the exact workspace URL first, then request the login code again.",
                            status_code=409,
                            details={"tenant_slugs": [item["tenant_slug"] for item in memberships if item.get("tenant_slug")]},
                        ),
                        tenant_id=None,
                        actor_context=None,
                    )
                membership = memberships[0]
                tenant_id = str(membership.get("tenant_id") or "").strip()
                tenant_slug = str(membership.get("tenant_slug") or "").strip()
                tenant_profile = await tenant_repository.get_tenant_profile(tenant_id)
                tenant_name = str((tenant_profile or {}).get("name") or "").strip() or tenant_slug

        elif auth_intent == "claim":
            if not payload.tenant_ref:
                return _error_response(
                    ValidationAppError(
                        "tenant_claim_invalid",
                        "Open the tenant workspace first before requesting an invite-acceptance code.",
                    ),
                    tenant_id=None,
                    actor_context=None,
                )
            tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
            if not tenant_id:
                return _error_response(
                    AppError(
                        code="tenant_not_found",
                        message="The requested tenant could not be resolved for invite acceptance.",
                        status_code=404,
                    ),
                    tenant_id=None,
                    actor_context=None,
                )
            tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
            tenant_slug = str((tenant_profile or {}).get("slug") or payload.tenant_ref).strip()
            tenant_name = str((tenant_profile or {}).get("name") or tenant_slug).strip()

        else:
            business_name = str(payload.business_name or "").strip()
            if not business_name:
                return _error_response(
                    ValidationAppError(
                        "tenant_account_create_invalid",
                        "Business name and email are required to create a tenant workspace by email code.",
                    ),
                    tenant_id=None,
                    actor_context=None,
                )
            tenant_name = business_name
            tenant_slug = str(payload.tenant_slug or "").strip() or None

        _code_row, code = await _store_tenant_email_login_code(
            session,
            email=normalized_email,
            auth_intent=auth_intent,
            tenant_id=tenant_id,
            tenant_slug=tenant_slug,
            metadata=metadata,
        )
        delivery = await _deliver_tenant_email_login_code(
            request,
            email=normalized_email,
            code=code,
            auth_intent=auth_intent,
            tenant_name=tenant_name,
            tenant_slug=tenant_slug,
        )
        await session.commit()

    return _success_response(
        {
            "email": normalized_email,
            "auth_intent": auth_intent,
            "tenant_slug": tenant_slug,
            "tenant_name": tenant_name,
            "delivery": delivery,
        },
        tenant_id=tenant_id,
        actor_context=None,
    )


async def tenant_email_code_verify(request: Request, payload: TenantEmailCodeVerifyRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_email = payload.email.strip().lower()
    normalized_code = "".join(character for character in str(payload.code or "") if character.isdigit())
    if not normalized_email or len(normalized_code) < 4:
        return _error_response(
            ValidationAppError(
                "tenant_email_code_invalid",
                "Email and the verification code are required to complete tenant sign-in.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    auth_intent = _normalize_tenant_email_auth_intent(payload.auth_intent, default="sign-in")
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        requested_tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref) if payload.tenant_ref else None
        login_code = await _load_valid_tenant_email_login_code(
            session,
            email=normalized_email,
            auth_intent=auth_intent,
            code=normalized_code,
            tenant_id=requested_tenant_id,
        )
        if not login_code:
            return _error_response(
                AppError(
                    code="tenant_email_code_invalid",
                    message="That tenant email code is invalid or has expired. Request a new code and try again.",
                    status_code=401,
                ),
                tenant_id=requested_tenant_id,
                actor_context=None,
            )

        login_code.consumed_at = datetime.now(UTC)
        metadata = login_code.metadata_json if isinstance(login_code.metadata_json, dict) else {}
        tenant_id = str(login_code.tenant_id or requested_tenant_id or "").strip() or None
        tenant_profile: dict[str, str | None] | None = None
        membership: dict[str, str | None] | None = None
        role = "tenant_admin"
        full_name = str(payload.full_name or metadata.get("full_name") or "").strip() or None

        if auth_intent == "sign-in":
            memberships = await _resolve_tenant_memberships_for_email(session, email=normalized_email)
            if requested_tenant_id:
                memberships = [item for item in memberships if str(item.get("tenant_id") or "").strip() == requested_tenant_id]
            if not memberships:
                return _error_response(
                    AppError(
                        code="tenant_email_code_membership_not_found",
                        message="No active tenant membership matches that email any longer.",
                        status_code=404,
                    ),
                    tenant_id=requested_tenant_id,
                    actor_context=None,
                )
            if len(memberships) > 1:
                return _error_response(
                    AppError(
                        code="tenant_email_code_multiple_memberships",
                        message="This email is linked to multiple tenant workspaces. Open the exact workspace URL first, then request a new code there.",
                        status_code=409,
                        details={"tenant_slugs": [item["tenant_slug"] for item in memberships if item.get("tenant_slug")]},
                    ),
                    tenant_id=None,
                    actor_context=None,
                )
            membership = memberships[0]
            tenant_id = str(membership.get("tenant_id") or "").strip()
            role = str(membership.get("role") or "tenant_admin")
            tenant_profile = await tenant_repository.get_tenant_profile(tenant_id)
            credential = await _load_tenant_credential_by_email(
                session,
                tenant_id=tenant_id,
                email=normalized_email,
            )
            if credential:
                role = str(credential.role or role or "tenant_admin")

        elif auth_intent == "claim":
            tenant_ref = payload.tenant_ref or str(login_code.tenant_slug or "").strip()
            if not tenant_ref:
                return _error_response(
                    ValidationAppError(
                        "tenant_claim_invalid",
                        "Tenant reference is required to accept this invite.",
                    ),
                    tenant_id=None,
                    actor_context=None,
                )
            claim_payload = TenantClaimAccountRequestPayload(
                tenant_ref=tenant_ref,
                email=normalized_email,
                username=normalized_email,
                password=normalized_code,
                full_name=full_name,
            )
            return await tenant_claim_account(request, claim_payload)

        else:
            business_name = str(payload.business_name or metadata.get("business_name") or "").strip()
            if not business_name:
                return _error_response(
                    ValidationAppError(
                        "tenant_account_create_invalid",
                        "Business name is required to finish tenant workspace creation.",
                    ),
                    tenant_id=None,
                    actor_context=None,
                )
            create_payload = TenantCreateAccountRequestPayload(
                business_name=business_name,
                email=normalized_email,
                username=normalized_email,
                password=normalized_code,
                full_name=full_name,
                industry=str(payload.industry or metadata.get("industry") or "").strip() or None,
                tenant_slug=str(payload.tenant_slug or metadata.get("tenant_slug") or "").strip() or None,
            )
            return await tenant_create_account(request, create_payload)

        await session.commit()

    if not tenant_profile or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_email_code_verify_failed",
                message="Tenant email-code verification could not be completed.",
                status_code=500,
            ),
            tenant_id=None,
            actor_context=None,
        )

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=tenant_id,
        tenant_profile=tenant_profile,
        email=normalized_email,
        name=full_name,
        picture_url=None,
        provider="password",
        role=role,
        membership=membership,
    )
    return _success_response(response, tenant_id=tenant_id, actor_context=actor_context)


async def tenant_google_auth(request: Request, payload: TenantGoogleAuthRequestPayload):
    cfg: Settings = request.app.state.settings
    google_identity = await _verify_google_identity_token(cfg, id_token=payload.id_token)
    auth_intent = str(payload.auth_intent or "create").strip().lower()
    if auth_intent not in {"sign-in", "create"}:
        return _error_response(
            ValidationAppError(
                "tenant_google_auth_invalid_intent",
                "Google tenant auth intent must be either sign-in or create.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id: str | None = None
        tenant_profile: dict[str, str | None] | None = None
        membership: dict[str, str | None] | None = None
        role = "tenant_admin"

        if payload.tenant_ref:
            tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
            if not tenant_id:
                return _error_response(
                    AppError(
                        code="tenant_not_found",
                        message="The requested tenant could not be resolved for Google sign-in.",
                        status_code=404,
                        details={"tenant_ref": payload.tenant_ref},
                    ),
                    tenant_id=None,
                    actor_context=None,
                )

            tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
            if not tenant_profile:
                return _error_response(
                    AppError(
                        code="tenant_not_found",
                        message="The tenant profile could not be loaded.",
                        status_code=404,
                    ),
                    tenant_id=None,
                    actor_context=None,
                )

            membership = await _upsert_tenant_membership(
                session,
                tenant_profile=tenant_profile,
                email=google_identity["email"] or "",
                full_name=google_identity["name"],
                google_sub=google_identity["google_sub"],
                auth_provider="google",
            )
        else:
            memberships = await _load_tenant_memberships_for_google_identity(
                session,
                email=google_identity["email"] or "",
                google_sub=google_identity["google_sub"],
            )

            if len(memberships) > 1:
                return _error_response(
                    AppError(
                        code="tenant_google_auth_multiple_memberships",
                        message="This Google account is linked to multiple tenant workspaces. Open the exact workspace URL or sign in with the tenant username instead.",
                        status_code=409,
                        details={"tenant_slugs": [item["tenant_slug"] for item in memberships if item.get("tenant_slug")]},
                    ),
                    tenant_id=None,
                    actor_context=None,
                )

            if len(memberships) == 1:
                membership = memberships[0]
                tenant_id = str(membership.get("tenant_id") or "").strip()
                role = str(membership.get("role") or "tenant_admin")
                tenant_profile = await tenant_repository.get_tenant_profile(tenant_id)
                if tenant_profile:
                    membership = await _upsert_tenant_membership(
                        session,
                        tenant_profile=tenant_profile,
                        email=google_identity["email"] or "",
                        full_name=google_identity["name"],
                        google_sub=google_identity["google_sub"],
                        auth_provider="google",
                    )
            else:
                normalized_business_name = _derive_google_tenant_business_name(
                    business_name=payload.business_name,
                    google_name=google_identity["name"],
                    google_email=google_identity["email"],
                )
                normalized_slug = await _resolve_available_google_tenant_slug(
                    tenant_repository,
                    tenant_slug=payload.tenant_slug,
                    business_name=normalized_business_name,
                    google_email=google_identity["email"],
                )

                tenant_profile = await tenant_repository.create_tenant(
                    slug=normalized_slug,
                    name=normalized_business_name,
                    timezone="Australia/Sydney",
                    locale="en-AU",
                    industry=str(payload.industry or "").strip() or None,
                )
                tenant_id = str(tenant_profile.get("id") or "").strip()
                membership = await _upsert_tenant_membership(
                    session,
                    tenant_profile=tenant_profile,
                    email=google_identity["email"] or "",
                    full_name=google_identity["name"] or normalized_business_name,
                    google_sub=google_identity["google_sub"],
                    auth_provider="google",
                )

        await session.commit()

    if not tenant_profile or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_google_auth_failed",
                message="Tenant Google authentication could not be completed.",
                status_code=500,
            ),
            tenant_id=None,
            actor_context=None,
        )

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=tenant_id,
        tenant_profile=tenant_profile,
        email=google_identity["email"] or "",
        name=google_identity["name"],
        picture_url=google_identity["picture_url"],
        provider="google",
        role=role,
        membership=membership,
        google_sub=google_identity["google_sub"],
    )
    return _success_response(response, tenant_id=tenant_id, actor_context=actor_context)


async def tenant_password_auth(request: Request, payload: TenantPasswordAuthRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_identifier = payload.username.strip().lower()
    normalized_password = payload.password.strip()
    if not normalized_identifier or not normalized_password:
        return _error_response(
            ValidationAppError(
                "tenant_auth_invalid_credentials",
                "Email or username and password are required for tenant sign-in.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        credential = None
        if "@" in normalized_identifier and payload.tenant_ref:
            tenant_repository = TenantRepository(RepositoryContext(session=session))
            requested_tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
            if requested_tenant_id:
                credential = await _load_tenant_credential_by_email(
                    session,
                    tenant_id=requested_tenant_id,
                    email=normalized_identifier,
                )
        if not credential:
            credential = await _load_tenant_credential(session, username=normalized_identifier)
        if not credential or not _verify_tenant_password(
            password=normalized_password,
            salt=credential.password_salt,
            expected_hash=credential.password_hash,
        ):
            return _error_response(
                AppError(
                    code="tenant_auth_invalid_credentials",
                    message="The tenant email or password is incorrect.",
                    status_code=401,
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = str(credential.tenant_id or "").strip()
        tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The tenant profile could not be loaded for credential-based sign-in.",
                    status_code=404,
                    details={"tenant_ref": payload.tenant_ref, "username": normalized_identifier},
                ),
                tenant_id=None,
                actor_context=None,
            )

        if payload.tenant_ref:
            requested_tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
            if requested_tenant_id and requested_tenant_id != tenant_id:
                return _error_response(
                    AppError(
                        code="tenant_auth_tenant_mismatch",
                        message="This tenant account does not belong to the requested tenant.",
                        status_code=403,
                    ),
                    tenant_id=requested_tenant_id,
                    actor_context=None,
                )

        membership = await _load_tenant_membership(
            session,
            tenant_id=tenant_id,
            email=str(credential.email or "").strip().lower(),
        )
        if not membership:
            tenant_profile = {
                **tenant_profile,
                "id": tenant_id,
                "slug": str(credential.tenant_slug or tenant_profile.get("slug") or ""),
            }
            membership = await _upsert_tenant_membership(
                session,
                tenant_profile=tenant_profile,
                email=str(credential.email or "").strip().lower(),
                full_name=normalized_identifier,
                google_sub=None,
                auth_provider="password",
            )
            await session.commit()

    session_token, expires_at = _create_tenant_session_token(
        cfg,
        email=str(credential.email or "").strip().lower(),
        tenant_ref=str(credential.tenant_slug or tenant_profile["slug"] or tenant_id),
        name=normalized_identifier,
        picture_url=None,
        google_sub=None,
    )
    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(credential.role or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "provider": "password",
            "user": {
                "email": str(credential.email or "").strip().lower(),
                "full_name": normalized_identifier,
                "picture_url": None,
            },
            "tenant": tenant_profile,
            "capabilities": [
                "tenant_overview",
                "tenant_catalog_import",
                "tenant_catalog_review",
                "tenant_catalog_publish",
            ],
            "membership": membership,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def tenant_create_account(request: Request, payload: TenantCreateAccountRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_email = payload.email.strip().lower()
    normalized_username = payload.username.strip().lower()
    normalized_password = payload.password.strip()
    normalized_business_name = payload.business_name.strip()
    normalized_slug = _normalize_tenant_slug_candidate(payload.tenant_slug or normalized_business_name)
    if (
        not normalized_email
        or not normalized_username
        or not normalized_password
        or not normalized_business_name
    ):
        return _error_response(
            ValidationAppError(
                "tenant_account_create_invalid",
                "Business name, email, username, and password are required to create a tenant account.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        existing_tenant = await tenant_repository.get_tenant_profile(normalized_slug)
        if existing_tenant:
            return _error_response(
                AppError(
                    code="tenant_account_slug_taken",
                    message="That tenant workspace slug already exists. Use claim workspace instead.",
                    status_code=409,
                    details={"tenant_slug": normalized_slug},
                ),
                tenant_id=str(existing_tenant.get("id") or ""),
                actor_context=None,
            )

        existing_credential = await _load_tenant_credential(session, username=normalized_username)
        if existing_credential:
            return _error_response(
                AppError(
                    code="tenant_auth_username_taken",
                    message="That username is already in use.",
                    status_code=409,
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_profile = await tenant_repository.create_tenant(
            slug=normalized_slug,
            name=normalized_business_name,
            timezone=payload.timezone or "Australia/Sydney",
            locale=payload.locale or "en-AU",
            industry=payload.industry.strip() if payload.industry else None,
        )
        membership = await _upsert_tenant_membership(
            session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            full_name=payload.full_name or normalized_business_name,
            google_sub=None,
            auth_provider="password",
        )
        await _create_or_update_tenant_credential(
            session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            username=normalized_username,
            password=normalized_password,
        )
        await session.commit()

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=str(tenant_profile.get("id") or ""),
        tenant_profile=tenant_profile,
        email=normalized_email,
        name=payload.full_name or normalized_business_name,
        picture_url=None,
        provider="password",
        role=str(membership.get("role") or "tenant_admin"),
        membership=membership,
    )
    return _success_response(
        response,
        tenant_id=str(tenant_profile.get("id") or ""),
        actor_context=actor_context,
    )


async def tenant_claim_account(request: Request, payload: TenantClaimAccountRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_email = payload.email.strip().lower()
    normalized_username = payload.username.strip().lower()
    normalized_password = payload.password.strip()
    if not payload.tenant_ref.strip() or not normalized_email or not normalized_username or not normalized_password:
        return _error_response(
            ValidationAppError(
                "tenant_claim_invalid",
                "Tenant reference, email, username, and password are required to claim a tenant workspace.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved for account claim.",
                    status_code=404,
                    details={"tenant_ref": payload.tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The tenant profile could not be loaded for account claim.",
                    status_code=404,
                ),
                tenant_id=None,
                actor_context=None,
            )

        membership_record = (
            await session.execute(
                select(TenantUserMembership).where(
                    TenantUserMembership.tenant_id == tenant_id,
                    TenantUserMembership.email == normalized_email,
                    TenantUserMembership.status.in_(("active", "invited")),
                )
            )
        ).scalar_one_or_none()
        membership = None
        accepted_existing_invite = False
        if membership_record:
            accepted_existing_invite = str(membership_record.status or "").strip().lower() == "invited"
            membership_record.status = "active"
            membership = {
                "tenant_id": membership_record.tenant_id,
                "tenant_slug": membership_record.tenant_slug,
                "email": membership_record.email,
                "role": membership_record.role,
                "status": membership_record.status,
            }

        if not membership:
            membership_count = await tenant_repository.count_active_memberships(tenant_id)
            claimable_service_count = await _count_claimable_services(
                session,
                tenant_profile=tenant_profile,
                email=normalized_email,
            )
            if membership_count > 0 and claimable_service_count == 0:
                return _error_response(
                    AppError(
                        code="tenant_claim_not_allowed",
                        message="This tenant workspace cannot be claimed or accepted with the supplied email yet.",
                        status_code=403,
                    ),
                    tenant_id=tenant_id,
                    actor_context=None,
                )

            membership = await _upsert_tenant_membership(
                session,
                tenant_profile=tenant_profile,
                email=normalized_email,
                full_name=payload.full_name or normalized_username,
                google_sub=None,
                auth_provider="password",
            )

        await _create_or_update_tenant_credential(
            session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            username=normalized_username,
            password=normalized_password,
            role=str(membership.get("role") or "tenant_admin"),
        )
        if accepted_existing_invite:
            audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            await audit_repository.append_entry(
                tenant_id=tenant_id,
                event_type="tenant.team.member_invite_accepted",
                entity_type="tenant_member",
                entity_id=normalized_email,
                actor_type="tenant_app",
                actor_id=normalized_email,
                payload={
                    "summary": "Tenant invite accepted from the tenant portal.",
                    "email": normalized_email,
                    "role": membership.get("role"),
                    "tenant_slug": membership.get("tenant_slug"),
                },
            )
        await session.commit()

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=tenant_id,
        tenant_profile=tenant_profile,
        email=normalized_email,
        name=payload.full_name or normalized_username,
        picture_url=None,
        provider="password",
        role=str(membership.get("role") or "tenant_admin"),
        membership=membership,
    )
    return _success_response(response, tenant_id=tenant_id, actor_context=actor_context)


async def tenant_overview(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        overview = await build_tenant_overview(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        overview,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


async def tenant_bookings(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_bookings_snapshot(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


async def tenant_plugin_interface(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_plugin_interface_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership) if tenant_session else "tenant_preview",
            "can_manage_plugin": bool(
                tenant_session and _membership_role(membership) in TENANT_CATALOG_WRITE_ROLES
            ),
            "operator_note": (
                "Tenant admins and operators can manage the official partner plugin configuration, copy widget snippets, and keep the tenant website embed aligned with the BookedAI runtime."
            ),
        }
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


async def tenant_plugin_interface_update(
    request: Request,
    payload: TenantPluginInterfaceUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before changing the plugin interface setup.",
                status_code=401,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        missing_message="Only tenant admins and operators can change the partner plugin interface.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_not_found",
                message="The requested tenant could not be resolved.",
                status_code=404,
                details={"tenant_ref": tenant_ref},
            ),
            tenant_id=None,
            actor_context=None,
        )

    scoped_tenant_ref = str(
        tenant_ref
        or tenant_session.get("tenant_ref")
        or membership.get("tenant_slug")
        or tenant_id
    ).strip()

    update_payload = {
        "partner_name": payload.partner_name,
        "partner_website_url": payload.partner_website_url,
        "bookedai_host": payload.bookedai_host,
        "embed_path": payload.embed_path,
        "widget_script_path": payload.widget_script_path,
        "tenant_ref": scoped_tenant_ref,
        "widget_id": payload.widget_id,
        "accent_color": payload.accent_color,
        "button_label": payload.button_label,
        "modal_title": payload.modal_title,
        "headline": payload.headline,
        "prompt": payload.prompt,
        "inline_target_selector": payload.inline_target_selector,
        "support_email": payload.support_email,
        "support_whatsapp": payload.support_whatsapp,
        "logo_url": payload.logo_url,
    }
    sanitized_payload = {
        key: str(value).strip()
        for key, value in update_payload.items()
        if value is not None and str(value).strip()
    }

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))

        next_settings = {
            "partner_plugin_interface": sanitized_payload,
        }
        if payload.headline is not None and str(payload.headline).strip():
            next_settings["main_message"] = str(payload.headline).strip()

        await tenant_repository.upsert_tenant_settings(
            tenant_id=tenant_id,
            settings_json=next_settings,
        )
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.plugin_interface.updated",
            entity_type="tenant_settings",
            entity_id=tenant_id,
            actor_type="tenant_user",
            actor_id=str(tenant_session.get("email") or tenant_session.get("sub") or tenant_id),
            payload={
                "summary": "Tenant partner plugin configuration updated from the tenant portal.",
                "fields": sorted(sanitized_payload.keys()),
                "partner_website_url": sanitized_payload.get("partner_website_url"),
                "embed_path": sanitized_payload.get("embed_path"),
                "widget_id": sanitized_payload.get("widget_id"),
                "tenant_ref": sanitized_payload.get("tenant_ref"),
            },
        )
        await session.commit()

        snapshot = await build_tenant_plugin_interface_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_plugin": True,
            "operator_note": (
                "Tenant admins and operators can manage the official partner plugin configuration, copy widget snippets, and keep the tenant website embed aligned with the BookedAI runtime."
            ),
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


async def tenant_integrations(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_integrations_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership) if tenant_session else "tenant_preview",
            "can_manage_integrations": bool(
                tenant_session and _membership_role(membership) in {"tenant_admin", "operator"}
            ),
            "write_mode": (
                "provider_controls"
                if tenant_session and _membership_role(membership) in {"tenant_admin", "operator"}
                else "read_only"
            ),
            "operator_note": (
                "Provider posture controls are available here for tenant admins and operators, while credential-level integration configuration changes remain admin-managed release controls."
            ),
        }
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_integration_provider_update(
    request: Request,
    provider: str,
    payload: TenantIntegrationProviderUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating integration provider posture.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_INTEGRATION_WRITE_ROLES,
        message="Only tenant admins and operators can update integration provider posture in the tenant portal.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    normalized_provider = provider.strip().lower()
    if not normalized_provider:
        return _error_response(
            AppError(
                code="invalid_provider",
                message="Select a valid provider before updating integration posture.",
                status_code=422,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    requested_status = payload.status.strip().lower() if payload.status else None
    requested_sync_mode = payload.sync_mode.strip().lower() if payload.sync_mode else None
    allowed_statuses = {"connected", "paused"}
    allowed_sync_modes = {"read_only", "write_back", "bidirectional"}
    if requested_status and requested_status not in allowed_statuses:
        return _error_response(
            AppError(
                code="invalid_integration_status",
                message="Select a valid integration provider status before saving.",
                status_code=422,
                details={"allowed_statuses": sorted(allowed_statuses)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if requested_sync_mode and requested_sync_mode not in allowed_sync_modes:
        return _error_response(
            AppError(
                code="invalid_integration_sync_mode",
                message="Select a valid integration sync mode before saving.",
                status_code=422,
                details={"allowed_sync_modes": sorted(allowed_sync_modes)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        integration_repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        updated_connection = await integration_repository.upsert_connection(
            tenant_id=tenant_id,
            provider=normalized_provider,
            status=requested_status or "paused",
            sync_mode=requested_sync_mode or "read_only",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.integrations.provider_updated",
            entity_type="integration_connection",
            entity_id=normalized_provider,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Integration provider posture updated from the tenant portal.",
                "provider": normalized_provider,
                "status": updated_connection.get("status"),
                "sync_mode": updated_connection.get("sync_mode"),
            },
        )
        await session.commit()
        snapshot = await build_tenant_integrations_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_integrations": True,
            "write_mode": "provider_controls",
            "operator_note": "Provider posture controls are active for this tenant session.",
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_billing(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        self_serve = snapshot.setdefault("self_serve", {})
        self_serve["can_manage_billing"] = bool(
            tenant_session and _membership_role(membership) in TENANT_BILLING_WRITE_ROLES
        )
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_billing_account_update(
    request: Request,
    payload: TenantBillingAccountUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating billing setup.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can change billing setup or plans.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        billing_account = await tenant_repository.upsert_billing_account(
            tenant_id=tenant_id,
            billing_email=payload.billing_email.strip() if payload.billing_email else None,
            merchant_mode=payload.merchant_mode.strip().lower() if payload.merchant_mode else "test",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.account_updated",
            entity_type="billing_account",
            entity_id=str(billing_account.get("id") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant billing account settings updated from the tenant portal.",
                "billing_email": billing_account.get("billing_email"),
                "merchant_mode": billing_account.get("merchant_mode"),
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(membership.get("role") or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def tenant_billing_checkout_session(
    request: Request,
    payload: TenantSubscriptionUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before starting Stripe checkout.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can start Stripe billing flows.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    plan_code = str(payload.package_code or payload.plan_code or "").strip().lower()
    selected_plan = next(
        (plan for plan in TENANT_BILLING_PLAN_CATALOG if str(plan.get("code") or "").strip().lower() == plan_code),
        None,
    )
    if not selected_plan:
        return _error_response(
            AppError(
                code="invalid_plan_code",
                message="Select a valid tenant subscription package before continuing to Stripe.",
                status_code=422,
                details={"allowed_plan_codes": sorted(TENANT_SUBSCRIPTION_PLAN_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    mode = str(payload.mode or "trial").strip().lower()
    if mode not in {"trial", "activate"}:
        mode = "trial"

    cfg: Settings = request.app.state.settings
    if not cfg.stripe_secret_key:
        return _error_response(
            AppError(
                code="stripe_not_configured",
                message="Stripe is not configured on this BookedAI runtime yet.",
                status_code=503,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved for Stripe checkout.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        billing_account = await tenant_repository.upsert_billing_account(
            tenant_id=tenant_id,
            billing_email=str(tenant_session.get("email") or "").strip().lower() or None,
            merchant_mode=None,
        )
        merchant_mode = str(billing_account.get("merchant_mode") or "").strip().lower()
        if merchant_mode not in {"live", "production"}:
            return _error_response(
                AppError(
                    code="tenant_billing_not_live",
                    message="Switch the tenant billing account to live mode before opening the real Stripe checkout flow.",
                    status_code=409,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            stripe_checkout = await create_tenant_stripe_checkout_session(
                session,
                cfg,
                tenant_profile=tenant_profile,
                billing_email=_clean_optional_text(billing_account.get("billing_email"))
                or str(tenant_session.get("email") or "").strip().lower()
                or None,
                plan_code=plan_code,
                plan_label=str(selected_plan.get("label") or plan_code.title()),
                plan_description=str(selected_plan.get("description") or "").strip(),
                monthly_amount_aud=int(selected_plan.get("monthly_amount_aud") or 0),
                mode=mode,
            )
        except HTTPError:
            return _error_response(
                AppError(
                    code="stripe_checkout_failed",
                    message="Stripe checkout could not be created for this tenant right now.",
                    status_code=502,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        except Exception as exc:
            return _error_response(
                AppError(
                    code="stripe_checkout_failed",
                    message=str(exc) or "Stripe checkout could not be created for this tenant right now.",
                    status_code=502,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.stripe_checkout_created",
            entity_type="subscription",
            entity_id=str(stripe_checkout.get("stripe_checkout_session_id") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Stripe checkout session created from the tenant billing workspace.",
                "package_code": plan_code,
                "plan_code": plan_code,
                "mode": mode,
                "stripe_customer_id": stripe_checkout.get("stripe_customer_id"),
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    return _success_response(
        {
            "checkout_url": stripe_checkout.get("checkout_url"),
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=str(membership.get("role") or "tenant_admin"),
            deployment_mode="standalone_app",
        ),
    )


async def tenant_billing_portal_session(
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before opening the Stripe billing portal.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can open the Stripe billing portal.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    cfg: Settings = request.app.state.settings
    if not cfg.stripe_secret_key:
        return _error_response(
            AppError(
                code="stripe_not_configured",
                message="Stripe is not configured on this BookedAI runtime yet.",
                status_code=503,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved for Stripe billing portal access.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        billing_account = await tenant_repository.upsert_billing_account(
            tenant_id=tenant_id,
            billing_email=str(tenant_session.get("email") or "").strip().lower() or None,
            merchant_mode=None,
        )
        merchant_mode = str(billing_account.get("merchant_mode") or "").strip().lower()
        if merchant_mode not in {"live", "production"}:
            return _error_response(
                AppError(
                    code="tenant_billing_not_live",
                    message="Switch the tenant billing account to live mode before opening the real Stripe billing portal.",
                    status_code=409,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            stripe_portal = await create_tenant_stripe_billing_portal_session(
                session,
                cfg,
                tenant_profile=tenant_profile,
                billing_email=_clean_optional_text(billing_account.get("billing_email"))
                or str(tenant_session.get("email") or "").strip().lower()
                or None,
            )
        except HTTPError:
            return _error_response(
                AppError(
                    code="stripe_portal_failed",
                    message="Stripe billing portal could not be opened for this tenant right now.",
                    status_code=502,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        except Exception as exc:
            return _error_response(
                AppError(
                    code="stripe_portal_failed",
                    message=str(exc) or "Stripe billing portal could not be opened for this tenant right now.",
                    status_code=502,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.stripe_portal_opened",
            entity_type="billing_account",
            entity_id=str(stripe_portal.get("stripe_customer_id") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Stripe billing portal opened from the tenant billing workspace.",
                "stripe_customer_id": stripe_portal.get("stripe_customer_id"),
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    return _success_response(
        {
            "portal_url": stripe_portal.get("portal_url"),
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=str(membership.get("role") or "tenant_admin"),
            deployment_mode="standalone_app",
        ),
    )


async def tenant_billing_subscription_update(
    request: Request,
    payload: TenantSubscriptionUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before changing tenant billing packages.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can change billing setup or packages.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    plan_code = str(payload.package_code or payload.plan_code or "").strip().lower()
    if plan_code not in TENANT_SUBSCRIPTION_PLAN_CODES:
        return _error_response(
            AppError(
                code="invalid_plan_code",
                message="Select a valid tenant subscription package before continuing.",
                status_code=422,
                details={"allowed_plan_codes": sorted(TENANT_SUBSCRIPTION_PLAN_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    mode = str(payload.mode or "trial").strip().lower()
    subscription_status = "trialing" if mode == "trial" else "active"
    now = datetime.now(UTC)
    period_days = 14 if subscription_status == "trialing" else 30

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        billing_account = await tenant_repository.upsert_billing_account(
            tenant_id=tenant_id,
            billing_email=str(tenant_session.get("email") or "").strip().lower() or None,
            merchant_mode="test",
        )
        subscription = await tenant_repository.upsert_subscription(
            tenant_id=tenant_id,
            billing_account_id=billing_account.get("id"),
            plan_code=plan_code,
            status=subscription_status,
            started_at=now,
            ended_at=None if subscription_status == "active" else now + timedelta(days=period_days),
        )
        await tenant_repository.replace_subscription_period(
            subscription_id=str(subscription.get("id")),
            period_days=period_days,
            status="trial_open" if subscription_status == "trialing" else "open",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.subscription_updated",
            entity_type="subscription",
            entity_id=str(subscription.get("id") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant subscription package changed from the tenant portal.",
                "package_code": plan_code,
                "plan_code": plan_code,
                "status": subscription_status,
                "mode": mode,
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(membership.get("role") or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )

async def tenant_billing_invoice_mark_paid(
    request: Request,
    invoice_id: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating invoice state.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can update invoice state.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    period_id = _tenant_period_id_from_invoice_id(invoice_id)
    if not period_id:
        return _error_response(
            AppError(
                code="invalid_invoice_id",
                message="The supplied invoice id is not valid for tenant billing actions.",
                status_code=422,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        period = await tenant_repository.get_subscription_period(period_id=period_id)
        if not period or str(period.get("tenant_id") or "") != tenant_id:
            return _error_response(
                AppError(
                    code="invoice_not_found",
                    message="The requested tenant invoice could not be found.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        updated_period = await tenant_repository.update_subscription_period_status(
            period_id=period_id,
            status="paid",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.invoice_marked_paid",
            entity_type="invoice",
            entity_id=invoice_id,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant invoice was marked paid from the tenant portal.",
                "invoice_id": invoice_id,
                "period_id": period_id,
                "status": updated_period.get("status") if updated_period else "paid",
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    return _success_response(
        {
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=str(membership.get("role") or "tenant_admin"),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_billing_invoice_receipt(
    request: Request,
    invoice_id: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before downloading receipt seams.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        invoice = next((item for item in billing.get("invoices", []) if str(item.get("id")) == invoice_id), None)
        if not invoice:
            return _error_response(
                AppError(
                    code="invoice_not_found",
                    message="The requested tenant invoice could not be found.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        receipt = build_tenant_invoice_receipt(invoice, tenant=billing.get("tenant", {}), billing=billing)

    return _success_response(
        receipt,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_onboarding(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_team(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership) if tenant_session else "tenant_preview",
            "can_manage_team": bool(tenant_session and _membership_role(membership) in TENANT_TEAM_MANAGE_ROLES),
            "can_manage_billing": bool(tenant_session and _membership_role(membership) in TENANT_BILLING_WRITE_ROLES),
        }
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_profile_update(
    request: Request,
    payload: TenantProfileUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating tenant profile details.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can edit tenant workspace profile, branding, or introduction content.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.update_tenant_profile(
            tenant_id=tenant_id,
            name=payload.business_name.strip() if payload.business_name else None,
            industry=payload.industry.strip() if payload.industry is not None else None,
            timezone=payload.timezone.strip() if payload.timezone else None,
            locale=payload.locale.strip() if payload.locale else None,
        )
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The tenant profile could not be updated because the tenant was not found.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        membership_record = (
            await session.execute(
                select(TenantUserMembership).where(
                    TenantUserMembership.tenant_id == tenant_id,
                    TenantUserMembership.email == str(tenant_session.get("email") or "").strip().lower(),
                    TenantUserMembership.status == "active",
                )
            )
        ).scalar_one_or_none()
        if membership_record and payload.operator_full_name is not None:
            membership_record.full_name = payload.operator_full_name.strip() or membership_record.full_name

        workspace_guides = {
            "overview": payload.guide_overview,
            "experience": payload.guide_experience,
            "catalog": payload.guide_catalog,
            "plugin": payload.guide_plugin,
            "bookings": payload.guide_bookings,
            "integrations": payload.guide_integrations,
            "billing": payload.guide_billing,
            "team": payload.guide_team,
        }
        sanitized_guides = {
            key: str(value).strip()
            for key, value in workspace_guides.items()
            if value is not None and str(value).strip()
        }
        workspace_settings: dict[str, object] = {}
        if payload.logo_url is not None and str(payload.logo_url).strip():
            workspace_settings["logo_url"] = str(payload.logo_url).strip()
        if payload.hero_image_url is not None and str(payload.hero_image_url).strip():
            workspace_settings["hero_image_url"] = str(payload.hero_image_url).strip()
        sanitized_intro_html = _sanitize_workspace_html(payload.introduction_html)
        if sanitized_intro_html:
            workspace_settings["introduction_html"] = sanitized_intro_html
        if sanitized_guides:
            workspace_settings["guides"] = sanitized_guides
        if workspace_settings:
            await tenant_repository.upsert_tenant_settings(
                tenant_id=tenant_id,
                settings_json={"tenant_workspace": workspace_settings},
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.profile.updated",
            entity_type="tenant_profile",
            entity_id=tenant_id,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant business profile updated from the tenant portal.",
                "business_name": tenant_profile.get("name"),
                "industry": tenant_profile.get("industry"),
                "timezone": tenant_profile.get("timezone"),
                "locale": tenant_profile.get("locale"),
                "workspace_fields": sorted(workspace_settings.keys()),
            },
        )

        await session.commit()
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(membership.get("role") or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "tenant": tenant_profile,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )

async def tenant_team_invite(
    request: Request,
    payload: TenantInviteMemberRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before inviting team members.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_TEAM_MANAGE_ROLES,
        message="Only tenant admins can invite team members or change tenant access roles.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    requested_role = payload.role.strip().lower()
    if requested_role not in TENANT_TEAM_ROLE_CODES:
        return _error_response(
            AppError(
                code="invalid_tenant_role",
                message="Select a valid tenant role before inviting a team member.",
                status_code=422,
                details={"allowed_roles": sorted(TENANT_TEAM_ROLE_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        member = await tenant_repository.upsert_tenant_member(
            tenant_id=tenant_id,
            tenant_slug=str((tenant_profile or {}).get("slug") or tenant_ref or ""),
            email=payload.email,
            full_name=payload.full_name,
            role=requested_role,
            status="invited",
        )
        tenant_slug = str((tenant_profile or {}).get("slug") or tenant_ref or "").strip()
        tenant_name = str((tenant_profile or {}).get("name") or tenant_slug or "BookedAI tenant").strip()
        invited_by_name = str(tenant_session.get("full_name") or "").strip() or str(
            tenant_session.get("email") or ""
        ).strip()
        invitee_email = str(member.get("email") or payload.email).strip().lower()
        invite_delivery = await _deliver_tenant_invite_email(
            request,
            tenant_name=tenant_name,
            tenant_slug=tenant_slug,
            invitee_email=invitee_email,
            invitee_full_name=str(member.get("full_name") or payload.full_name or "").strip() or None,
            role=requested_role,
            invited_by_name=invited_by_name,
            invited_by_email=str(tenant_session.get("email") or "").strip().lower(),
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.team.member_invited",
            entity_type="tenant_member",
            entity_id=str(member.get("email") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant team member invited from the tenant portal.",
                "email": member.get("email"),
                "role": member.get("role"),
                "invite_delivery_status": invite_delivery["status"],
                "invite_url": invite_delivery["invite_url"],
            },
        )
        await session.commit()
        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_team": True,
            "can_manage_billing": _membership_role(membership) in TENANT_BILLING_WRITE_ROLES,
        }
        snapshot["invite_delivery"] = {
            "status": invite_delivery["status"],
            "smtp_configured": bool(invite_delivery["smtp_configured"]),
            "recipient_email": invitee_email,
            "role": requested_role,
            "invite_url": str(invite_delivery["invite_url"]),
            "operator_note": str(invite_delivery["operator_note"]),
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_team_member_update(
    request: Request,
    member_email: str,
    payload: TenantMemberAccessUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating team member access.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_TEAM_MANAGE_ROLES,
        message="Only tenant admins can invite team members or change tenant access roles.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    requested_role = payload.role.strip().lower() if payload.role else None
    if requested_role and requested_role not in TENANT_TEAM_ROLE_CODES:
        return _error_response(
            AppError(
                code="invalid_tenant_role",
                message="Select a valid tenant role before updating member access.",
                status_code=422,
                details={"allowed_roles": sorted(TENANT_TEAM_ROLE_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        updated_member = await tenant_repository.update_tenant_member_access(
            tenant_id=tenant_id,
            email=member_email,
            role=requested_role,
            status=payload.status.strip().lower() if payload.status else None,
        )
        if not updated_member:
            return _error_response(
                AppError(
                    code="tenant_member_not_found",
                    message="The requested tenant member could not be found.",
                    status_code=404,
                    details={"email": member_email},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.team.member_access_updated",
            entity_type="tenant_member",
            entity_id=str(updated_member.get("email") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant team member access updated from the tenant portal.",
                "email": updated_member.get("email"),
                "role": updated_member.get("role"),
                "status": updated_member.get("status"),
            },
        )
        await session.commit()
        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_team": True,
            "can_manage_billing": _membership_role(membership) in TENANT_BILLING_WRITE_ROLES,
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_team_member_resend_invite(
    request: Request,
    member_email: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before resending tenant invites.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_TEAM_MANAGE_ROLES,
        message="Only tenant admins can resend tenant invites.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    normalized_email = member_email.strip().lower()
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        team_snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        member = next(
            (item for item in team_snapshot.get("members", []) if str(item.get("email") or "").strip().lower() == normalized_email),
            None,
        )
        if not member:
            return _error_response(
                AppError(
                    code="tenant_member_not_found",
                    message="The requested tenant member could not be found.",
                    status_code=404,
                    details={"email": normalized_email},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        if str(member.get("status") or "").strip().lower() != "invited":
            return _error_response(
                AppError(
                    code="tenant_member_not_invited",
                    message="Only members still in invited status can receive a resent invite.",
                    status_code=409,
                    details={"email": normalized_email},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        tenant_slug = str((tenant_profile or {}).get("slug") or tenant_ref or "").strip()
        tenant_name = str((tenant_profile or {}).get("name") or tenant_slug or "BookedAI tenant").strip()
        invited_by_name = str(tenant_session.get("full_name") or "").strip() or str(
            tenant_session.get("email") or ""
        ).strip()
        invite_delivery = await _deliver_tenant_invite_email(
            request,
            tenant_name=tenant_name,
            tenant_slug=tenant_slug,
            invitee_email=normalized_email,
            invitee_full_name=str(member.get("full_name") or "").strip() or None,
            role=str(member.get("role") or "operator"),
            invited_by_name=invited_by_name,
            invited_by_email=str(tenant_session.get("email") or "").strip().lower(),
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.team.member_invite_resent",
            entity_type="tenant_member",
            entity_id=normalized_email,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant invite resent from the tenant portal.",
                "email": normalized_email,
                "role": member.get("role"),
                "invite_delivery_status": invite_delivery["status"],
                "invite_url": invite_delivery["invite_url"],
            },
        )
        await session.commit()
        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_team": True,
            "can_manage_billing": _membership_role(membership) in TENANT_BILLING_WRITE_ROLES,
        }
        snapshot["invite_delivery"] = {
            "status": invite_delivery["status"],
            "smtp_configured": bool(invite_delivery["smtp_configured"]),
            "recipient_email": normalized_email,
            "role": str(member.get("role") or "operator"),
            "invite_url": str(invite_delivery["invite_url"]),
            "operator_note": str(invite_delivery["operator_note"]),
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_catalog(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"] if tenant_session else None,
        )
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )

async def portal_booking_detail(booking_reference: str, request: Request):
    async with get_session(request.app.state.session_factory) as session:
        snapshot = await build_portal_booking_snapshot(
            session,
            booking_reference=booking_reference,
        )

    if not snapshot:
        return _error_response(
            AppError(
                code="portal_booking_not_found",
                message="The requested booking reference could not be found for the customer portal.",
                status_code=404,
                details={"booking_reference": booking_reference},
            ),
            tenant_id=None,
            actor_context=None,
        )

    return _success_response(snapshot, tenant_id=None, actor_context=None)

async def portal_booking_reschedule_request(
    booking_reference: str,
    request: Request,
    payload: PortalBookingActionRequestPayload,
):
    if not (payload.customer_note or payload.preferred_date or payload.preferred_time):
        return _error_response(
            ValidationAppError(
                "Please provide a note or a preferred new schedule before submitting a reschedule request.",
                details={"customer_note": ["note or preferred schedule is required"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        result = await queue_portal_booking_request(
            session,
            booking_reference=booking_reference,
            request_type="reschedule_request",
            customer_note=payload.customer_note,
            preferred_date=payload.preferred_date,
            preferred_time=payload.preferred_time,
            timezone=payload.timezone,
        )
        if not result:
            return _error_response(
                AppError(
                    code="portal_booking_not_found",
                    message="The requested booking reference could not be found for the customer portal.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        await session.commit()

    return _success_response(result, tenant_id=None, actor_context=None)

async def portal_booking_cancel_request(
    booking_reference: str,
    request: Request,
    payload: PortalBookingActionRequestPayload,
):
    if not payload.customer_note:
        return _error_response(
            ValidationAppError(
                "Please provide a brief note before submitting a cancellation request.",
                details={"customer_note": ["cancellation note is required"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        result = await queue_portal_booking_request(
            session,
            booking_reference=booking_reference,
            request_type="cancel_request",
            customer_note=payload.customer_note,
            preferred_date=None,
            preferred_time=None,
            timezone=payload.timezone,
        )
        if not result:
            return _error_response(
                AppError(
                    code="portal_booking_not_found",
                    message="The requested booking reference could not be found for the customer portal.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        await session.commit()

    return _success_response(result, tenant_id=None, actor_context=None)

async def tenant_catalog_import_website(
    request: Request,
    payload: TenantCatalogImportRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with the tenant Google account and an active tenant membership before importing catalog data.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_not_found",
                message="The requested tenant could not be resolved.",
                status_code=404,
                details={"tenant_ref": tenant_ref},
            ),
            tenant_id=None,
            actor_context=None,
        )

    openai_service = request.app.state.openai_service
    website_input = payload.website_url.strip()
    website_url = await openai_service.resolve_business_website(
        website_or_query=website_input,
        business_name=payload.business_name,
    )
    if not website_url:
        return _error_response(
            ValidationAppError(
                "tenant_import_website_not_found",
                "Could not find the business website from that URL or business name.",
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    combined_focus = " | ".join(
        value for value in [payload.search_focus, payload.location_hint] if value and value.strip()
    ) or None
    extracted = await openai_service.extract_services_from_website(
        website_url=website_url,
        business_name=payload.business_name,
        category_hint=payload.category,
        search_focus=combined_focus,
        required_fields=[
            "service_name",
            "duration_minutes",
            "location",
            "amount_aud",
            "currency_code",
            "display_price",
            "summary",
            "image_url",
            "booking_url",
        ],
    )
    if not extracted:
        return _error_response(
            ValidationAppError(
                "tenant_import_no_services",
                "Could not extract booking-relevant services from that website. Try a clearer service or pricing page.",
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    business_name = (payload.business_name or "").strip() or website_url.replace("https://", "").replace("http://", "").split("/")[0]
    business_email = (payload.business_email or tenant_session["email"] or "").strip().lower() or None

    async with get_session(request.app.state.session_factory) as session:
        for item in extracted:
            service_name = str(item.get("name") or "").strip()
            if not service_name:
                continue

            service_id = _slugify_value(f"{business_name}-{service_name}")
            existing = (
                await session.execute(
                    select(ServiceMerchantProfile).where(ServiceMerchantProfile.service_id == service_id)
                )
            ).scalar_one_or_none()

            mapped_values = {
                "service_id": service_id,
                "tenant_id": tenant_id,
                "business_name": business_name,
                "business_email": business_email,
                "owner_email": tenant_session["email"],
                "name": service_name,
                "category": str(item.get("category") or payload.category or "").strip() or None,
                "summary": str(item.get("summary") or "").strip() or None,
                "amount_aud": float(item["amount_aud"]) if item.get("amount_aud") is not None else None,
                "currency_code": str(item.get("currency_code") or "AUD").strip().upper() or "AUD",
                "display_price": str(item.get("display_price") or "").strip() or None,
                "duration_minutes": int(item["duration_minutes"]) if item.get("duration_minutes") is not None else None,
                "venue_name": str(item.get("venue_name") or business_name).strip() or None,
                "location": str(item.get("location") or payload.location_hint or "").strip() or None,
                "map_url": str(item.get("map_url") or "").strip() or None,
                "booking_url": str(item.get("booking_url") or website_url).strip() or None,
                "image_url": str(item.get("image_url") or "").strip() or None,
                "source_url": website_url,
                "tags_json": [str(tag).strip() for tag in item.get("tags", []) if str(tag).strip()],
                "featured": 1 if item.get("featured") else 0,
                "is_active": 0,
                "publish_state": "review",
            }
            mapped_values, _quality_warnings = apply_catalog_quality_gate(mapped_values)
            mapped_values["is_active"] = 0
            mapped_values["publish_state"] = "review"

            if mapped_values["map_url"] is None and (mapped_values["venue_name"] or mapped_values["location"]):
                mapped_values["map_url"] = _build_google_maps_url(
                    mapped_values["venue_name"],
                    mapped_values["location"],
                )

            if existing:
                for key, value in mapped_values.items():
                    setattr(existing, key, value)
            else:
                session.add(ServiceMerchantProfile(**mapped_values))

        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_catalog_create_service(
    request: Request,
    payload: TenantCatalogCreateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before creating catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can create or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        tenant_slug = str(tenant_profile.get("slug") or tenant_id).strip() or tenant_id
        draft_business_name = (
            _clean_optional_text(payload.business_name)
            or str(tenant_profile.get("name") or tenant_slug)
        )
        draft_service_name = _clean_optional_text(payload.name) or "New service draft"
        draft_category = _clean_optional_text(payload.category)
        service_id = _slugify_value(
            f"{tenant_slug}-{draft_service_name}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}"
        )
        service = ServiceMerchantProfile(
            service_id=service_id,
            tenant_id=tenant_id,
            business_name=draft_business_name,
            business_email=str(tenant_session.get("email") or "").strip().lower() or None,
            owner_email=str(tenant_session.get("email") or "").strip().lower() or None,
            name=draft_service_name,
            category=draft_category,
            summary="",
            currency_code="AUD",
            tags_json=[],
            featured=0,
            is_active=0,
            publish_state="draft",
        )
        _apply_catalog_quality_to_service(service)
        session.add(service)
        await session.flush()

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.catalog.service_created",
            entity_type="service_catalog",
            entity_id=service.service_id,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant catalog draft created from the tenant workspace.",
                "service_name": service.name,
                "publish_state": service.publish_state,
            },
        )
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )

async def tenant_catalog_update_service(
    service_id: str,
    request: Request,
    payload: TenantCatalogUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before editing catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            service = await _resolve_tenant_catalog_service(
                session,
                tenant_profile=tenant_profile,
                service_id=service_id,
                tenant_user_email=tenant_session["email"] or "",
            )
        except AppError as error:
            return _error_response(error, tenant_id=tenant_id, actor_context=None)

        _apply_tenant_catalog_update(service, payload)
        quality_warnings = _apply_catalog_quality_to_service(service)
        service.publish_state = "review" if quality_warnings else "draft"
        service.is_active = 0
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_catalog_publish_service(
    service_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before publishing catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            service = await _resolve_tenant_catalog_service(
                session,
                tenant_profile=tenant_profile,
                service_id=service_id,
                tenant_user_email=tenant_session["email"] or "",
            )
        except AppError as error:
            return _error_response(error, tenant_id=tenant_id, actor_context=None)

        quality_warnings = _apply_catalog_quality_to_service(service)
        if quality_warnings:
            return _error_response(
                ValidationAppError(
                    "This service cannot be published until booking-critical fields are complete.",
                    details={"quality_warnings": quality_warnings, "service_id": service_id},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        service.publish_state = "published"
        service.is_active = 1
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )

async def tenant_catalog_archive_service(
    service_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before archiving catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            service = await _resolve_tenant_catalog_service(
                session,
                tenant_profile=tenant_profile,
                service_id=service_id,
                tenant_user_email=tenant_session["email"] or "",
            )
        except AppError as error:
            return _error_response(error, tenant_id=tenant_id, actor_context=None)

        service.publish_state = "archived"
        service.is_active = 0
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )



async def tenant_revenue_metrics(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Revenue capture metrics: bookings confirmed, missed revenue, capture rate."""
    tenant_ref, tenant_id, _tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    days = 30
    async with get_session(request.app.state.session_factory) as session:
        reporting = ReportingRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        metrics = await reporting.get_revenue_capture_metrics(days=days)
    return _success_response(
        metrics,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )
