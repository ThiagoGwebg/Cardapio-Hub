import Link from 'next/link'
import '../landing.css'

export const metadata = {
  title: 'Política de Privacidade — CardápioÁgil',
  description: 'Como o CardápioÁgil coleta, usa e protege seus dados.',
}

export default function PrivacyPage() {
  return (
    <div className="landing">
      <header className="l-nav">
        <Link href="/" className="l-logo">
          cardápio<em>ágil</em>
        </Link>
      </header>

      <div className="l-container" style={{ padding: '56px 24px 96px', maxWidth: 760 }}>
        <div className="l-eyebrow">Legal</div>
        <h1 className="l-h2" style={{ marginBottom: 6 }}>Política de Privacidade</h1>
        <p style={{ color: 'var(--muted2)', fontSize: 12, marginBottom: 40 }}>
          Última atualização: 5 de julho de 2026
        </p>

        <div style={{ color: 'var(--text2)', fontSize: 14.5, lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <section>
            <h2 style={sectionTitle}>1. Quem somos</h2>
            <p>
              Esta política descreve como o <strong>CardápioÁgil</strong> (&quot;nós&quot;), plataforma de
              cardápio digital e gestão de pedidos para pequenos negócios de alimentação, coleta,
              usa, compartilha e protege os dados pessoais de lojistas que usam o painel e de
              clientes finais que fazem pedidos pelo cardápio público, em conformidade com a Lei
              Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
            <p style={{ color: 'var(--muted2)', fontSize: 13, marginTop: 8 }}>
              Razão social, CNPJ e dados de contato do controlador: <em>[a preencher]</em>.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>2. Quais dados coletamos</h2>
            <p><strong>De quem cria uma loja (lojista):</strong> nome, e-mail, senha (armazenada de forma criptografada), WhatsApp, endereço da loja e, quando aplicável, dados de cobrança processados pelo Stripe.</p>
            <p><strong>De quem faz um pedido pelo cardápio público (cliente final):</strong> nome, telefone e os itens do pedido, usados apenas para que a loja processe aquela compra.</p>
            <p><strong>De quem preenche o formulário &quot;Teste agora&quot;:</strong> nome, empresa, e-mail, WhatsApp, faixa de faturamento mensal e segmento do negócio.</p>
            <p><strong>Dados de navegação:</strong> informações técnicas básicas (endereço IP, tipo de dispositivo, páginas acessadas) coletadas automaticamente para segurança e funcionamento do serviço.</p>
          </section>

          <section>
            <h2 style={sectionTitle}>3. Para que usamos seus dados</h2>
            <ul style={listStyle}>
              <li>Criar e operar sua loja, cardápio e painel de pedidos.</li>
              <li>Processar e notificar pedidos entre cliente final e lojista.</li>
              <li>Processar pagamentos de assinatura (plano Pro) via Stripe.</li>
              <li>Entrar em contato comercial quando você preenche o formulário de interesse.</li>
              <li>Garantir a segurança da plataforma e cumprir obrigações legais.</li>
            </ul>
          </section>

          <section>
            <h2 style={sectionTitle}>4. Com quem compartilhamos dados</h2>
            <p>Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço estritamente necessários para operar a plataforma:</p>
            <ul style={listStyle}>
              <li><strong>Supabase</strong> — banco de dados e autenticação.</li>
              <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
              <li><strong>Stripe</strong> — processamento de pagamentos de assinatura.</li>
              <li><strong>WhatsApp</strong> — ao finalizar um pedido, um link abre uma conversa direta entre cliente e loja; essa mensagem não passa pelos nossos servidores.</li>
            </ul>
          </section>

          <section>
            <h2 style={sectionTitle}>5. Como protegemos seus dados</h2>
            <p>
              Os dados ficam armazenados no Supabase com controle de acesso por linha (RLS): cada
              loja só acessa seus próprios dados, e informações sensíveis (como leads e senhas)
              não são expostas ao navegador. Toda comunicação com a plataforma é criptografada
              (HTTPS).
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>6. Seus direitos</h2>
            <p>Nos termos da LGPD, você pode a qualquer momento solicitar:</p>
            <ul style={listStyle}>
              <li>Confirmação de que tratamos seus dados e acesso a eles.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Exclusão dos seus dados pessoais, exceto quando a lei exigir retenção.</li>
              <li>Portabilidade dos dados a outro fornecedor.</li>
              <li>Revogação do consentimento dado, quando aplicável.</li>
            </ul>
            <p>Para exercer qualquer um desses direitos, entre em contato pelo e-mail informado na seção 8.</p>
          </section>

          <section>
            <h2 style={sectionTitle}>7. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa ou pelo tempo necessário para
              cumprir obrigações legais e fiscais. Ao solicitar a exclusão da conta, seus dados
              pessoais são removidos, ressalvadas as informações que precisamos manter por
              exigência legal.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>8. Contato</h2>
            <p>
              Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser enviadas
              para <em>[e-mail de contato a preencher]</em>.
            </p>
          </section>

          <section>
            <h2 style={sectionTitle}>9. Alterações desta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Mudanças relevantes serão
              comunicadas na plataforma, com a data de atualização revisada no topo desta página.
            </p>
          </section>
        </div>

        <div style={{ marginTop: 48 }}>
          <Link href="/" className="l-hero-link">← Voltar pra página inicial</Link>
        </div>
      </div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'Nunito, sans-serif',
  fontWeight: 800,
  fontSize: 17,
  color: 'var(--text)',
  marginBottom: 10,
}

const listStyle: React.CSSProperties = {
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginTop: 6,
}
