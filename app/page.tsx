'use client'

import { useEffect, useState } from 'react'
import './landing.css'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingHero from '@/components/landing/LandingHero'
import LandingStory from '@/components/landing/LandingStory'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFaq from '@/components/landing/LandingFaq'
import LandingFinalCta from '@/components/landing/LandingFinalCta'
import LandingFooter from '@/components/landing/LandingFooter'

export default function Home() {
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

  return (
    <div className={`landing ${themeMode}`}>
      <LandingHeader themeMode={themeMode} toggleThemeMode={toggleThemeMode} />
      <LandingHero />
      <LandingStory />
      <div className="l-perforation" />
      <LandingFeatures />
      <div className="l-perforation" />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingFaq />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  )
}
