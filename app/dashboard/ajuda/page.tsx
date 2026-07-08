import Link from 'next/link'

export default function AjudaPage() {
  return (
    <>
      <div className="dash-header">
        <div className="dash-title">Central de Ajuda</div>
      </div>

      {/* Guia rápido */}
      <div className="help-guide-card">
        <div className="help-guide-title">
          <span>🚀</span> Guia Rápido — Comece em 4 passos
        </div>

        <div className="help-step">
          <div className="help-step-num">1</div>
          <div className="help-step-content">
            <div className="help-step-heading">Cadastre seus produtos</div>
            <div className="help-step-text">
              Adicione nome, preço, categoria e fotos dos itens do seu cardápio. Você pode organizar por categorias como "Pasteis", "Bebidas", etc.
            </div>
            <Link href="/dashboard/cardapio" className="help-step-link">Ir para Cardápio →</Link>
          </div>
        </div>

        <div className="help-step">
          <div className="help-step-num">2</div>
          <div className="help-step-content">
            <div className="help-step-heading">Configure sua loja</div>
            <div className="help-step-text">
              Defina o nome da loja, endereço, horários de funcionamento, taxa de entrega e formas de pagamento aceitas. Uma loja bem configurada passa mais confiança.
            </div>
            <Link href="/dashboard/loja" className="help-step-link">Ir para Minha Loja →</Link>
          </div>
        </div>

        <div className="help-step">
          <div className="help-step-num">3</div>
          <div className="help-step-content">
            <div className="help-step-heading">Compartilhe seu link</div>
            <div className="help-step-text">
              Copie o link do seu cardápio online e compartilhe no WhatsApp, Instagram, Facebook ou onde quiser. Seus clientes acessam e fazem pedidos direto pelo celular.
            </div>
            <Link href="/dashboard/links" className="help-step-link">Ir para Meus Links →</Link>
          </div>
        </div>

        <div className="help-step">
          <div className="help-step-num">4</div>
          <div className="help-step-content">
            <div className="help-step-heading">Acompanhe os pedidos em tempo real</div>
            <div className="help-step-text">
              Quando um cliente fizer um pedido, ele aparece automaticamente no painel. Você avança o status (Recebido → Preparando → Pronto) e o cliente é notificado.
            </div>
            <Link href="/dashboard/pedidos" className="help-step-link">Ir para Pedidos →</Link>
          </div>
        </div>
      </div>

      {/* Dicas */}
      <div className="help-guide-card">
        <div className="help-guide-title">
          <span>💡</span> Dicas para aproveitar melhor
        </div>
        {[
          {
            q: 'Como aumentar minhas vendas?',
            a: 'Mantenha seu cardápio sempre atualizado com fotos bonitas dos produtos. Compartilhe o link regularmente nos stories do Instagram e grupos de WhatsApp. Ative as notificações para não perder nenhum pedido.',
          },
          {
            q: 'Posso usar no celular?',
            a: 'Sim! O painel de gestão funciona perfeitamente no celular. Você pode gerenciar pedidos, adicionar produtos e ver o faturamento de qualquer lugar.',
          },
          {
            q: 'Como funciona o Kanban de pedidos?',
            a: 'É um quadro com colunas: Recebido, Em Preparo, Pronto e Concluído. Arraste os pedidos entre as colunas conforme avança no preparo. O cliente vê o status em tempo real.',
          },
          {
            q: 'O cliente precisa instalar algum app?',
            a: 'Não! O cardápio abre direto no navegador do celular. O cliente pode até instalar como um app na tela inicial (PWA) para acessar mais rápido.',
          },
          {
            q: 'Como funciona o plano Lite vs Pro?',
            a: 'No plano Lite você tem até 60 pedidos por mês e até 30 produtos no cardápio. No plano Pro, é ilimitado e você ainda ganha relatórios avançados, notificações por WhatsApp, vários usuários/lojas e suporte prioritário.',
          },
        ].map((item, i) => (
          <div className="help-faq-item" key={i}>
            <div className="help-faq-q">{item.q}</div>
            <div className="help-faq-a">{item.a}</div>
          </div>
        ))}
      </div>

      {/* Suporte */}
      <div className="help-guide-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Precisa de ajuda?
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Entre em contato pelo e-mail{' '}
          <a href="mailto:suporte@cardapioagil.com.br" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            suporte@cardapioagil.com.br
          </a>
        </div>
      </div>
    </>
  )
}
