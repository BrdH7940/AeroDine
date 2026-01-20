/**
 * Guest Session Management
 * Handles guest session ID for tracking guest orders across devices
 */

const GUEST_SESSION_KEY = 'guestSessionId'
const GUEST_SESSION_EXPIRY_DAYS = 30 // Session expires after 30 days

/**
 * Get or create guest session ID
 * Returns existing session ID from storage, or creates a new one
 */
export function getOrCreateGuestSessionId(): string {
    // Try to get from localStorage first
    const stored = localStorage.getItem(GUEST_SESSION_KEY)
    if (stored) {
        try {
            const { sessionId, expiry } = JSON.parse(stored)
            // Check if session is still valid
            if (expiry && new Date(expiry) > new Date()) {
                return sessionId
            }
        } catch {
            // Invalid format, create new
        }
    }

    // Create new session ID
    const newSessionId = generateSessionId()
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + GUEST_SESSION_EXPIRY_DAYS)

    localStorage.setItem(
        GUEST_SESSION_KEY,
        JSON.stringify({
            sessionId: newSessionId,
            expiry: expiry.toISOString(),
        })
    )

    return newSessionId
}

/**
 * Get existing guest session ID (returns null if not found or expired)
 */
export function getGuestSessionId(): string | null {
    const stored = localStorage.getItem(GUEST_SESSION_KEY)
    if (!stored) return null

    try {
        const { sessionId, expiry } = JSON.parse(stored)
        // Check if session is still valid
        if (expiry && new Date(expiry) > new Date()) {
            return sessionId
        }
        // Expired, remove it
        localStorage.removeItem(GUEST_SESSION_KEY)
        return null
    } catch {
        localStorage.removeItem(GUEST_SESSION_KEY)
        return null
    }
}

/**
 * Update guest session ID (when received from server)
 */
export function updateGuestSessionId(sessionId: string): void {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + GUEST_SESSION_EXPIRY_DAYS)

    localStorage.setItem(
        GUEST_SESSION_KEY,
        JSON.stringify({
            sessionId,
            expiry: expiry.toISOString(),
        })
    )
}

/**
 * Clear guest session ID
 */
export function clearGuestSessionId(): void {
    localStorage.removeItem(GUEST_SESSION_KEY)
}

/**
 * Generate a unique session ID
 * Format: timestamp-randomstring
 */
function generateSessionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${random}`
}
