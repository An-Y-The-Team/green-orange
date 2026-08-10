import {
  ExecutionContext,
  SetMetadata,
  createParamDecorator,
} from "@nestjs/common";

// Marks a controller (or route) as the worker/mini-app surface: JwtGuard then
// accepts ONLY crew tokens there, and crew tokens are accepted NOWHERE else.
export const IS_WORKER_KEY = "isWorker";
export const Worker = () => SetMetadata(IS_WORKER_KEY, true);

// Pulls the authenticated crew member id the guard stashed on the request.
export const CurrentCrew = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.crew_member_id;
  }
);
