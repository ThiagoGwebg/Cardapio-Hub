'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackSignup } from '@/lib/analytics'

function Tracker() {
  const params = useSearchParams()
  useEffect(() => {
    if (params.get('bemvindo') === '1') trackSignup()
  }, [params])
  return null
}

// Dispara a conversão de Cadastro quando o usuário cai no dashboard logo após
// criar a loja (redirect com ?bemvindo=1). useSearchParams exige Suspense.
export default function SignupTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}
