'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
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
    <button
      type="button"
      className="nav-item nav-item--button nav-item--logout"
      onClick={handleLogout}
      disabled={loading}
    >
      <span className="nav-ico">
        {loading ? <span className="btn-spinner" aria-hidden /> : <LogOut size={19} strokeWidth={2} />}
      </span>
      <span className="nav-label">{loading ? 'Saindo…' : 'Sair'}</span>
    </button>
  )
}
