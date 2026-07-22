'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (loading) return
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Não foi possível sair. Tente novamente.')
      setLoading(false)
      return
    }
    router.push('/login')
    router.refresh()
    // Não reseta `loading`: mantém desabilitado até a navegação concluir.
  }

  return (
    <button className="advance-btn" onClick={handleLogout} disabled={loading}>
      {loading ? (
        <>
          <span className="btn-spinner" aria-hidden />
          Saindo…
        </>
      ) : (
        'Sair'
      )}
    </button>
  )
}
