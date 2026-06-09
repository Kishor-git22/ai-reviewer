import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Decorator to mark routes as public (no authentication required)
 * Can be used at controller or method level
 *
 * Usage:
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return 'OK'
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
