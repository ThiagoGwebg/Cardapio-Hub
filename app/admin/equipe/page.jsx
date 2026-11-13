import { requireAdmin, getOwnerEmails, listTeamAdmins } from '@/lib/admin'
import TeamBoard from './TeamBoard'

export const metadata = {
  title: 'Equipe — Admin Cardápio Hub',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminTeamPage() {
  const { user, isOwner } = await requireAdmin()
  const team = await listTeamAdmins()

  return (
    <main className="adm-page">
      <h1 className="adm-title">Equipe</h1>
      <p className="adm-subtitle">
        Quem entra neste painel. Todo mundo aqui vê leads, lojas e faturas igual a você — só a
        própria lista de admins fica com o dono.
      </p>

      <TeamBoard
        owners={getOwnerEmails()}
        initial={team.map(({ id, email, name, invited_by, created_at }) => ({
          id,
          email,
          name,
          invitedBy: invited_by,
          createdAt: created_at,
        }))}
        isOwner={isOwner}
        currentEmail={(user.email || '').toLowerCase()}
      />
    </main>
  )
}
