import type { Metadata } from "next"
import Link from "next/link"
import { HomeIcon } from "lucide-react"
import Header from "@/app/_components/ui/header"
import { Button } from "@/app/_components/ui/button"

export const metadata: Metadata = {
  title: "Página não encontrada | Nobre Barbearia",
}

/** 404 do site inteiro, com o header e as cores das páginas do cliente. */
const NotFound = () => {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="theme-nobre bg-background text-foreground flex flex-1 flex-col items-center justify-center gap-4 px-5 py-16 text-center">
        <p className="text-sm font-bold tracking-widest text-[var(--brand-gold-text)]">
          ERRO 404
        </p>
        <h1 className="font-display text-3xl font-bold">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          O endereço pode ter mudado ou não existe mais. Volte ao início para
          ver os serviços e agendar seu horário.
        </p>
        <Button asChild className="mt-2 font-bold">
          <Link href="/">
            <HomeIcon />
            Voltar ao início
          </Link>
        </Button>
      </main>
    </div>
  )
}

export default NotFound
