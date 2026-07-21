import { SetMetadata } from "@nestjs/common";

// Marks a route as not requiring a bearer token (the global JwtGuard skips it).
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
