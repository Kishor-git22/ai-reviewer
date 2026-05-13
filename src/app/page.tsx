import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LandingPage from './(auth)/landing/page'

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
