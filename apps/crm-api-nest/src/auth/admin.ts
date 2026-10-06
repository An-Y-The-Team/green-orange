import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { JWTPayload } from "jose";

/**
 * The Authentik group allowed to see workers' personal papers (CCCD, chứng
 * chỉ). Same group crm-web gates /settings/users on (USER_ADMIN_GROUP).
 * Python counterpart: `CRM_ADMIN_GROUP` in app/api/deps.py.
 */
export const CRM_ADMIN_GROUP = "crm-admins";

/**
 * Membership comes from the token's `groups` claim, which Authentik's default
 * `profile` scope mapping emits. Local mode (dev / teaching) has no groups, so
 * every local user counts as an admin there.
 */
export const isCrmAdmin = (payload: JWTPayload): boolean =>
  Array.isArray(payload.groups) && payload.groups.includes(CRM_ADMIN_GROUP);

/** True when the guard marked the caller a crm-admin. */
export const IsCrmAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.admin === true;
  }
);
