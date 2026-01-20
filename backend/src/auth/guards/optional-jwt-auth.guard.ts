import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Optional JWT Auth Guard
 * 
 * This guard allows requests to proceed even if no JWT token is provided
 * or if the token is invalid. It's useful for endpoints that can work
 * both with authenticated and guest users.
 * 
 * If a valid JWT token is present:
 *   - The user info is populated in request.user via JWT strategy
 *   - Controllers can access user info via @CurrentUser() decorator
 * 
 * If no token or invalid token:
 *   - The request proceeds without user info
 *   - @CurrentUser() will return undefined
 * 
 * Usage:
 *   @UseGuards(OptionalJwtAuthGuard)
 *   create(@CurrentUser() user?: any) { ... }
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    /**
     * Override handleRequest to make authentication optional
     * Always returns the user (or undefined) without throwing errors
     */
    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        // If there's an error or no user, just return undefined
        // This allows the request to proceed without authentication
        if (err || !user) {
            return undefined
        }
        
        // If authentication succeeded, return the user
        return user
    }
}
