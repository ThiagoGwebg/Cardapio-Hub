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
  return (
    <div className="landing">
      <LandingHeader />
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
