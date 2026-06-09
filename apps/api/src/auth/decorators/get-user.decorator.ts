import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "@prisma/client";

/**
 * Custom decorator to extract the current user from the request.
 * Must be used with JwtAuthGuard to ensure user is authenticated.
 *
 * Usage:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@GetUser() user: User) {
 *   return user
 * }
 */
export const GetUser = createParamDecorator(
  (
    data: keyof User | undefined,
    ctx: ExecutionContext,
  ): User | Partial<User> => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      return null;
    }

    // If a specific field is requested, return only that field
    if (data) {
      return { [data]: user[data] };
    }

    return user;
  },
);
