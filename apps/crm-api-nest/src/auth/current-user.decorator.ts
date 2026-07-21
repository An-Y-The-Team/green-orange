import { ExecutionContext, createParamDecorator } from "@nestjs/common";

// Pulls the authenticated username the guard stashed on the request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.username;
  }
);
