'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  return (
    <button
      className="advance-btn"
      onClick={async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
      }}
    >
      Sair
    </button>
  )
}
