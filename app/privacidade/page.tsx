import type { Metadata } from "next"
import Header from "@/app/_components/ui/header"

export const metadata: Metadata = {
  title: "Política de privacidade | Nobre Barbearia",
  description:
    "Quais dados a Nobre Barbearia guarda, para que são usados e como pedir correção ou exclusão.",
}

// Placeholders: trocar pelos dados reais do responsável antes de publicar.
const CONTACT_NAME = "Luiz Fernando"
const CONTACT_EMAIL = "Luizfernando@gmail.com"

const Section = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="space-y-3">
    <h2 className="font-display text-xl font-bold">{title}</h2>
    <div className="text-foreground/85 space-y-3 text-sm leading-relaxed">
      {children}
    </div>
  </section>
)

const PrivacyPage = () => {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="theme-nobre bg-background text-foreground flex-1 p-5">
        <article className="mx-auto max-w-2xl space-y-8 py-4">
          <header className="space-y-2">
            <h1 className="font-display text-3xl font-bold">
              Política de privacidade
            </h1>
            <p className="text-muted-foreground text-sm">
              Esta página explica quais dados a Nobre Barbearia guarda quando
              você usa o site, para que eles servem e como você pode pedir
              correção ou exclusão, conforme a Lei Geral de Proteção de Dados
              (Lei nº 13.709/2018, LGPD).
            </p>
          </header>

          <Section title="Quais dados guardamos">
            <p>
              O site guarda apenas o necessário para o agendamento funcionar:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Conta Google</strong>, se você entrar com o Google:
                nome, e-mail e foto de perfil. Junto com eles, o sistema de
                login grava os identificadores e tokens que o Google devolve no
                momento da entrada (identificador da conta, token de acesso,
                token de identidade, validade e escopo autorizado).
              </li>
              <li>
                <strong>Agendamentos</strong>: data e horário, serviços
                escolhidos, barbeiro que vai atender e a situação do agendamento
                (confirmado, concluído ou cancelado).
              </li>
              <li>
                <strong>Agendamento sem login</strong>: o nome e, se você
                informar, o telefone de quem está agendando.
              </li>
              <li>
                <strong>Sessões</strong>: um registro da sua sessão de login,
                ligado a um cookie no seu navegador, para você continuar
                conectado sem precisar entrar de novo a cada visita.
              </li>
            </ul>
            <p>
              Não usamos ferramentas de análise, anúncios ou cookies de
              rastreamento.
            </p>
          </Section>

          <Section title="Para que usamos cada dado">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Nome, e-mail e foto</strong>: identificar você no site,
                mostrar seu nome e foto no menu e ligar seus agendamentos à sua
                conta, para que você veja e gerencie seus horários.
              </li>
              <li>
                <strong>Tokens de login</strong>: só para o funcionamento da
                entrada com o Google. Eles não são usados para acessar nenhum
                outro dado da sua conta Google.
              </li>
              <li>
                <strong>Dados do agendamento</strong>: reservar o horário com o
                barbeiro, evitar conflitos na agenda e mostrar o atendimento
                para a equipe da barbearia.
              </li>
              <li>
                <strong>Nome e telefone de quem agenda sem login</strong>:
                identificar o agendamento e permitir que a barbearia entre em
                contato sobre o horário, se precisar.
              </li>
              <li>
                <strong>Sessões</strong>: manter você conectado com segurança.
              </li>
            </ul>
          </Section>

          <Section title="Login com Google">
            <p>
              Ao entrar com o Google, pedimos apenas o seu nome, e-mail e foto
              de perfil. Não temos acesso à sua senha, aos seus contatos, ao seu
              Gmail, à sua agenda ou a qualquer outro serviço da sua conta
              Google.
            </p>
          </Section>

          <Section title="Compartilhamento">
            <p>
              Seus dados não são vendidos nem compartilhados com terceiros. A
              única exceção são os provedores que mantêm o site no ar e
              armazenam o banco de dados, que processam os dados apenas para
              prestar esse serviço:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Vercel</strong>: hospedagem do site.
              </li>
              <li>
                <strong>Neon</strong>: banco de dados onde as informações ficam
                armazenadas.
              </li>
            </ul>
            <p>
              Dentro da barbearia, os dados dos agendamentos são vistos apenas
              pela equipe responsável pelos atendimentos.
            </p>
          </Section>

          <Section title="Por quanto tempo guardamos">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Conta e agendamentos</strong>: enquanto a conta existir.
                Agendamentos cancelados ou concluídos continuam no histórico até
                que você peça a exclusão.
              </li>
              <li>
                <strong>Agendamentos sem login</strong>: o nome e o telefone
                ficam guardados junto com o agendamento, até que seja pedida a
                exclusão.
              </li>
              <li>
                <strong>Sessões</strong>: valem por até 90 dias. Ao sair da
                conta, a sessão é encerrada.
              </li>
            </ul>
          </Section>

          <Section title="Seus direitos">
            <p>Pela LGPD, você pode, a qualquer momento, pedir para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                saber quais dados seus estão guardados e ter acesso a eles;
              </li>
              <li>corrigir dados incompletos, errados ou desatualizados;</li>
              <li>
                excluir seus dados, incluindo a conta e o histórico de
                agendamentos;
              </li>
              <li>
                obter informações sobre com quem seus dados são compartilhados.
              </li>
            </ul>
            <p>
              Para fazer qualquer um desses pedidos, envie um e-mail para o
              contato abaixo, a partir do e-mail da sua conta ou informando o
              nome e o telefone usados no agendamento, para que possamos
              localizar seus dados.
            </p>
          </Section>

          <Section title="Contato">
            <p>
              Responsável pelos dados: <strong>{CONTACT_NAME}</strong>
              <br />
              E-mail:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-[var(--brand-gold-text)] underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>
        </article>
      </main>
    </div>
  )
}

export default PrivacyPage
