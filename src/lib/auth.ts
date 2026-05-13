import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { User } from '@/types'

// NextAuth v5 configuration
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  basePath: '/api/auth',
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
      // Scrape only user.login and user.image as per privacy requirements
      profile(profile): any {
        return {
          id: profile.id.toString(),
          name: profile.login,
          email: profile.email,
          image: profile.avatar_url,
        }
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      }
      return true
    },
    async signIn({ account }) {
      if (account?.provider === 'github' && account.access_token) {
        try {
          // Sync with our backend to get a backend JWT
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/github/sync`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accessToken: account.access_token,
              }),
            }
          )

          if (!response.ok) {
            console.error('Backend sync failed')
            return false
          }

          const data = await response.json()
          // Store backend token in the account object so it's available in the JWT callback
          ;(account as any).backendToken = data.data.accessToken
          return true
        } catch (error) {
          console.error('Error syncing with backend:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.backendToken = account.backendToken as string
        token.githubToken = account.access_token as string
      }
      if (user) {
        token.username = (user as any).name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.accessToken = token.backendToken as string
        session.user.githubToken = token.githubToken as string
        session.user.login = token.username as string
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
})

// Module augmentation for NextAuth types
declare module 'next-auth' {
  interface User {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    login?: string
    accessToken?: string
    githubToken?: string
  }

  interface Session {
    user: User
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    backendToken?: string
    githubToken?: string
    username?: string
  }
}
