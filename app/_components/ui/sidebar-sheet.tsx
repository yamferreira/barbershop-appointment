"use client"

import { Button } from "./button"
import GoogleIcon from "./google-icon"
import {
  CalendarIcon,
  CalendarRangeIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
} from "lucide-react"
import { SheetContent, SheetHeader, SheetTitle, SheetClose } from "./sheet"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { signIn, signOut } from "next-auth/react"
import { Avatar, AvatarImage } from "./avatar"
import { useSession } from "next-auth/react"
import { cn } from "@/app/_lib/utils"

/*
 * Menu e diálogo de login abrem num portal no <body>, fora de qualquer
 * `.theme-nobre` das páginas, então levam a classe no próprio conteúdo. Como o
 * <html> tem `.dark`, as variantes `dark:` dos botões continuam valendo aqui
 * dentro; por isso os hovers e o botão do Google repetem a cor em `dark:`.
 */
const themeClassName = "theme-nobre bg-background text-foreground"

const navItemClassName =
  "justify-start gap-2 hover:bg-brand/15 hover:text-foreground dark:hover:bg-brand/15 [&_svg]:text-[var(--brand-gold-text)]"

const SideBarSheet = () => {
  const { data } = useSession()
  const handleLoginWithGoogle = () => signIn("google")
  const handleLogOutClick = () => signOut()

  return (
    <SheetContent className={cn(themeClassName, "overflow-y-auto")}>
      <SheetHeader>
        <SheetTitle className="font-display text-left text-lg">Menu</SheetTitle>
      </SheetHeader>

      <div className="flex items-center justify-between gap-3 border-b border-solid py-5 pl-3">
        {data?.user ? (
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage
                src={data?.user?.image ?? ""}
                className="h-10 w-10 rounded-full object-cover"
              />
            </Avatar>

            <div>
              <p className="font-bold">{data?.user?.name}</p>
              <p className="text-muted-foreground text-xs">
                {data?.user?.email}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-bold">Olá, faça seu Login!</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" aria-label="Fazer login">
                  <LogInIcon />
                </Button>
              </DialogTrigger>
              <DialogContent className={cn(themeClassName, "w-[90%]")}>
                <DialogHeader>
                  <DialogTitle className="font-display">
                    Faça seu login na plataforma
                  </DialogTitle>
                  <DialogDescription>
                    Conecte usando sua conta do Google.
                  </DialogDescription>
                </DialogHeader>
                {/* Fundo claro e neutro: o "G" fica nas cores originais. */}
                <Button
                  variant="outline"
                  className="bg-card hover:bg-brand/10 dark:bg-card dark:border-border dark:hover:bg-brand/10 mt-2 justify-center gap-1 font-bold"
                  onClick={handleLoginWithGoogle}
                >
                  <GoogleIcon className="size-[18px]" />
                  Google
                </Button>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 border-b border-solid p-5 py-5">
        <SheetClose asChild>
          <Button className={navItemClassName} variant="ghost" asChild>
            <Link href="/">
              <HomeIcon size={18} />
              Início
            </Link>
          </Button>
        </SheetClose>

        <SheetClose asChild>
          <Button className={navItemClassName} variant="ghost" asChild>
            <Link href="/bookings">
              <CalendarIcon size={18} />
              Agendamentos
            </Link>
          </Button>
        </SheetClose>
      </div>

      {/* Atalho para o painel. Só aparece para BARBEIRO, mas é conveniência:
          quem protege /admin é o layout (`requireBarbeiro`), não este menu. */}
      {data?.user?.role === "BARBEIRO" && (
        <div className="flex flex-col gap-2 border-b border-solid p-5 py-5">
          <SheetClose asChild>
            <Button className={navItemClassName} variant="ghost" asChild>
              <Link href="/admin">
                <LayoutDashboardIcon size={18} />
                Painel do barbeiro
              </Link>
            </Button>
          </SheetClose>

          <SheetClose asChild>
            <Button className={navItemClassName} variant="ghost" asChild>
              <Link href="/admin/calendario">
                <CalendarRangeIcon size={18} />
                Calendário
              </Link>
            </Button>
          </SheetClose>
        </div>
      )}

      <div className="flex flex-col gap-2 p-5 py-5">
        <Button
          variant="ghost"
          className={navItemClassName}
          onClick={handleLogOutClick}
        >
          <LogOutIcon size={18} />
          Sair da Conta
        </Button>
      </div>
    </SheetContent>
  )
}

export default SideBarSheet
