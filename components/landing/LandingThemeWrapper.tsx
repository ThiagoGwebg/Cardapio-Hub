'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import '@/app/landing.css'

type ThemeContextType = {
  themeMode: 'light' | 'dark'
  toggleThemeMode: () => void
}

const LandingThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  toggleThemeMode: () => {},
})

export function useLandingTheme() {
  return useContext(LandingThemeContext)
}

export default function LandingThemeWrapper({
  children,
}: {
  children: React.ReactNode
}) {
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
    <LandingThemeContext.Provider value={{ themeMode, toggleThemeMode }}>
      <div className={`landing ${themeMode}`}>
        {children}
      </div>
    </LandingThemeContext.Provider>
  )
}
