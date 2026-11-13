import { PlusIcon } from "lucide-react"
import { db } from "@/app/_lib/prisma"
import { isCloudinaryConfigured } from "@/app/_lib/cloudinary"
import { formatDuration } from "@/app/_lib/schedule"
import { Badge } from "@/app/_components/ui/badge"
import { Button } from "@/app/_components/ui/button"
import ServiceImage from "@/app/_components/ui/service-image"
import AdminServiceForm from "@/app/_components/ui/admin-service-form"
import AdminServiceActions from "@/app/_components/ui/admin-service-actions"

const formatPrice = (price: number) =>
  Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    price,
  )

const AdminServicosPage = async () => {
  // Todos, inclusive inativos, na ordem que o cliente vê. A contagem nas duas
  // relações decide se o botão de apagar aparece.
  const services = await db.barbershopService.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { bookings: true, bookingServices: true } },
    },
  })
  const uploadsEnabled = isCloudinaryConfigured()

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Serviços</h1>
        <AdminServiceForm
          uploadsEnabled={uploadsEnabled}
          trigger={
            <Button size="sm">
              <PlusIcon />
              Novo serviço
            </Button>
          }
        />
      </div>

      {!uploadsEnabled && (
        <p
          role="status"
          className="bg-card text-muted-foreground rounded-lg border p-3 text-sm"
        >
          O envio de fotos está indisponível: o armazenamento de imagens não
          está configurado no servidor. Dá para cadastrar e editar serviços
          normalmente, sem foto.
        </p>
      )}

      {services.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum serviço cadastrado.
        </p>
      )}

      <div className="space-y-3">
        {services.map((service, index) => {
          const price = Number(service.price)
          const hasBookings =
            service._count.bookings > 0 || service._count.bookingServices > 0

          return (
            <div
              key={service.id}
              className="bg-card space-y-3 rounded-lg border p-3"
            >
              <div className="flex gap-3">
                <div
                  className={
                    service.active
                      ? "relative h-16 w-16 shrink-0"
                      : "relative h-16 w-16 shrink-0 opacity-50"
                  }
                >
                  <ServiceImage
                    src={service.imageUrl}
                    alt={service.name}
                    sizes="64px"
                    className="rounded-lg"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{service.name}</p>
                    {!service.active && (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    <span className="font-bold text-[var(--brand-gold-text)]">
                      {formatPrice(price)}
                    </span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </p>
                  {service.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminServiceActions
                  serviceId={service.id}
                  serviceName={service.name}
                  active={service.active}
                  isFirst={index === 0}
                  isLast={index === services.length - 1}
                  canDelete={!hasBookings}
                />
                <AdminServiceForm
                  uploadsEnabled={uploadsEnabled}
                  service={{
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    price: price.toFixed(2).replace(".", ","),
                    durationMinutes: service.durationMinutes,
                    imageUrl: service.imageUrl,
                  }}
                  trigger={
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminServicosPage
