import { useSession } from "next-auth/react"
import { useCallback } from "react"

interface CustomSession {
  user: {
    id: string
    email: string
    name: string
    userType: string
    employeeId?: string
    adminId?: string
    sessionToken?: string
  }
}

/**
 * Hook to make authenticated API requests using the session token
 */
export function useAuthenticatedFetch() {
  const { data: session } = useSession()
  
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const customSession = session as CustomSession | null
    
    if (!customSession?.user?.sessionToken) {
      throw new Error('No valid session token found')
    }

    // Don't set Content-Type for FormData - let browser set it with boundary
    const isFormData = options.body instanceof FormData
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Authorization': `Bearer ${customSession.user.sessionToken}`,
      ...options.headers,
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }, [session])

  const isAuthenticated = !!(session as CustomSession | null)?.user?.sessionToken

  return {
    authenticatedFetch,
    isAuthenticated,
    sessionToken: (session as CustomSession | null)?.user?.sessionToken,
    user: (session as CustomSession | null)?.user
  }
}