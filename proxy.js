import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request) {
  return updateSession(request)
}

export const config = {
  // Manifest e ícone da PWA ficam de fora: precisam responder sem sessão (o navegador
  // busca esses arquivos por conta própria pra decidir se oferece instalar o app).
  matcher: ['/dashboard', '/dashboard/((?!manifest\\.webmanifest|app-icon\\.svg).*)'],
}
