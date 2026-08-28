'use client'

import { useEffect, useState } from 'react'
import '../../app/landing.css'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingHero from '@/components/landing/LandingHero'
import LandingProof from '@/components/landing/LandingProof'
import LandingSpotlights from '@/components/landing/LandingSpotlights'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingEasy from '@/components/landing/LandingEasy'
import LandingStory from '@/components/landing/LandingStory'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFaq from '@/components/landing/LandingFaq'
import LandingFinalCta from '@/components/landing/LandingFinalCta'
import LandingFooter from '@/components/landing/LandingFooter'

// Todo o interativo da home vive aqui para que `app/page.tsx` possa ser um server
// component — só assim a home consegue exportar `metadata` e injetar o JSON-LD.
export default function LandingShell() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('landing-theme')
    if (saved === 'dark' || saved === 'light') {
      setThemeMode(saved)
    } else {
      const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches
      setThemeMode(isSystemLight ? 'light' : 'dark')
    }
  }, [])

  const toggleThemeMode = () => {
    const next = themeMode === 'light' ? 'dark' : 'light'
    setThemeMode(next)
    localStorage.setItem('landing-theme', next)
  }

  // Ritmo da página: faixa laranja (hero) → conteúdo claro → faixa teal (easy) →
  // conteúdo claro → faixa laranja (CTA) → rodapé escuro. As faixas é que fazem a
  // leitura andar; sem elas a home vira uma parede única de cards.
  return (
    <div className={`landing ${themeMode}`}>
      <LandingHeader themeMode={themeMode} toggleThemeMode={toggleThemeMode} />
      <LandingHero />
      <LandingProof />
      <LandingSpotlights />
      <LandingFeatures />
      <LandingEasy />
      <LandingStory />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingFaq />
      <LandingFinalCta withForm />
      <LandingFooter />
    </div>
  )
}
