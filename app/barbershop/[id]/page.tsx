import { db } from "@/app/_lib/prisma"
import { ChevronLeftIcon, MapPinIcon, MenuIcon, StarIcon } from "lucide-react"
import Image from "next/image"
import { Button } from "@/app/_components/ui/button"
import { Card, CardContent } from "@/app/_components/ui/card"
import Link from "next/link"
import { notFound } from "next/navigation"
import PhoneItem from "@/app/_components/ui/phone-item"
import { Sheet, SheetTrigger } from "@/app/_components/ui/sheet"
import SidebarSheet from "@/app/_components/ui/sidebar-sheet"
import { formatDuration } from "@/app/_lib/schedule"

const formatPrice = (price: number) =>
  Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    price,
  )

interface BarbershopPageProps {
  params: Promise<{
    id: string
  }>
}

const BarbershopPage = async ({ params }: BarbershopPageProps) => {
  const { id } = await params

  // chamar o meu banco de dados
  const barbershop = await db.barbershop.findUnique({
    where: {
      id,
    },

    include: {
      services: true,
    },
  })

  if (!barbershop) {
    return notFound()
  }

  const services = barbershop.services.map((service) => ({
    ...service,
    price: Number(service.price),
  }))

  return (
    <div className="theme-nobre bg-background text-foreground min-h-full">
      {/* IMAGEM */}
      <div className="relative h-[250px] w-full">
        <Image
          alt={barbershop.name}
          src={barbershop?.imageUrl}
          fill
          className="object-cover"
        />

        <Button
          size="icon"
          variant="secondary"
          className="absolute top-4 left-4"
          asChild
        >
          <Link href="/">
            <ChevronLeftIcon />
          </Link>
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="absolute top-4 right-4"
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SidebarSheet />
        </Sheet>
      </div>

      {/* TÍTULO */}
      <div className="border-b border-solid p-5">
        <h1 className="mb-3 text-xl font-bold">{barbershop.name}</h1>
        <div className="mb-2 flex items-center gap-2">
          <MapPinIcon className="text-[var(--brand-gold)]" size={18} />
          <p className="text-sm">{barbershop?.address}</p>
        </div>

        <div className="flex items-center gap-2">
          <StarIcon
            className="fill-[var(--brand-gold)] text-[var(--brand-gold)]"
            size={18}
          />
          <p className="text-sm">5,0 (499 avaliações)</p>
        </div>
      </div>

      {/* DESCRIÇÃO */}
      <div className="space-y-2 border-b border-solid p-5">
        <h2 className="text-muted-foreground text-xs font-bold uppercase">
          Sobre nós
        </h2>
        <p className="text-justify text-sm">{barbershop?.description}</p>
      </div>

      {/* Services — vitrine só de leitura: o agendamento acontece na home. */}
      <div className="space-y-3 border-b border-solid p-5">
        <h2 className="text-muted-foreground text-xs font-bold uppercase">
          Serviços
        </h2>
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="relative max-h-[110px] min-h-[110px] max-w-[110px] min-w-[110px]">
                  <Image
                    src={service.imageUrl}
                    alt={service.name}
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{service.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-[var(--brand-gold-text)]">
                      {formatPrice(service.price)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {formatDuration(service.durationMinutes)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button className="w-full" asChild>
          <Link href="/">Agendar</Link>
        </Button>
      </div>

      {/* CONTATO */}
      <div className="space-y-3 p-5">
        {barbershop.phone.map((phone, idx) => (
          <PhoneItem key={phone + idx} phone={phone} />
        ))}
      </div>
    </div>
  )
}

export default BarbershopPage
