import type { Metadata, Viewport } from 'next'
import '../admin.css'
import { requireAdmin } from '@/lib/admin'
import { fetchLeads } from './actions'
import LeadsBoard from './LeadsBoard'

export const metadata: Metadata = {
  title: 'Leads — CardápioÁgil',
  manifest: '/admin/leads/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Leads' },
  icons: { apple: '/admin/leads/app-icon.svg' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#14161b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export const dynamic = 'force-dynamic'

export default async function AdminLeadsPage() {
  await requireAdmin()
  const leads = await fetchLeads()

  return <LeadsBoard initialLeads={leads} />
}
