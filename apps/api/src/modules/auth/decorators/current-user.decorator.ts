import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser, CookieRequest } from "../auth.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<CookieRequest>();
    if (!request.user) {
      throw new Error(
        "Current user is unavailable outside authenticated routes.",
      );
    }

    return request.user;
  },
);
