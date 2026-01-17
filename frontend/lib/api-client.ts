import { getSession } from "next-auth/react"

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
 * Make an authenticated API request using the session token
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const session = await getSession() as CustomSession | null
  
  if (!session?.user?.sessionToken) {
    throw new Error('No valid session token found')
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.user.sessionToken}`,
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Get the current session token
 */
export async function getSessionToken(): Promise<string | null> {
  const session = await getSession() as CustomSession | null
  return session?.user?.sessionToken || null
}

/**
 * Get the current user info from session
 */
export async function getCurrentUser() {
  const session = await getSession() as CustomSession | null
  return session?.user || null
}