"use client"

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"
import { saveService } from "@/app/admin/servicos/actions"
import { resizeImageForUpload } from "@/app/_lib/resize-image"
import { MAX_SERVICE_IMAGE_BYTES } from "@/app/_lib/service-image-file"
import { Button } from "./button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { Input } from "./input"
import { Label } from "./label"
import ServiceImage from "./service-image"

export interface AdminServiceFormValues {
  id: string
  name: string
  description: string
  /** Já formatado para o campo, com vírgula: "45,00". */
  price: string
  durationMinutes: number
  imageUrl: string | null
}

interface AdminServiceFormProps {
  /** Sem serviço, o formulário cria um novo. */
  service?: AdminServiceFormValues
  uploadsEnabled: boolean
  trigger: ReactNode
}

const textareaClassName =
  "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"

const AdminServiceForm = ({
  service,
  uploadsEnabled,
  trigger,
}: AdminServiceFormProps) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isPreparingImage, setIsPreparingImage] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [duration, setDuration] = useState("")
  // Foto nova já redimensionada, e a URL local para a pré-visualização.
  const [newImage, setNewImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditing = Boolean(service)

  // Cada abertura começa do estado salvo, não do que ficou de uma edição
  // abandonada.
  const resetForm = () => {
    setName(service?.name ?? "")
    setDescription(service?.description ?? "")
    setPrice(service?.price ?? "")
    setDuration(service ? String(service.durationMinutes) : "")
    setNewImage(null)
    setPreviewUrl(null)
    setRemoveImage(false)
  }

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) resetForm()
    setOpen(nextOpen)
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    // Limpa o input para que escolher o mesmo arquivo de novo dispare onChange.
    event.target.value = ""
    if (!file) return

    setIsPreparingImage(true)
    try {
      const resized = await resizeImageForUpload(file)
      if (resized.size > MAX_SERVICE_IMAGE_BYTES) {
        toast.error("A foto passou de 2 MB mesmo reduzida. Escolha outra.")
        return
      }
      setNewImage(resized)
      setPreviewUrl(URL.createObjectURL(resized))
      setRemoveImage(false)
    } catch {
      toast.error("Não foi possível ler essa imagem. Use JPEG, PNG ou WebP.")
    } finally {
      setIsPreparingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setNewImage(null)
    setPreviewUrl(null)
    setRemoveImage(true)
  }

  const currentImage =
    previewUrl ?? (removeImage ? null : (service?.imageUrl ?? null))

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData()
    if (service) formData.set("id", service.id)
    formData.set("name", name)
    formData.set("description", description)
    formData.set("price", price)
    formData.set("durationMinutes", duration)
    formData.set("removeImage", String(removeImage))
    if (newImage) formData.set("image", newImage)

    startTransition(async () => {
      const result = await saveService(formData)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(isEditing ? "Serviço atualizado!" : "Serviço criado!")
      setOpen(false)
    })
  }

  const busy = isPending || isPreparingImage

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[90%] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "As mudanças valem para os próximos agendamentos. Os já marcados mantêm a duração de quando foram feitos."
              : "O serviço entra no fim da lista, já visível para os clientes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <ServiceImage
                src={currentImage}
                alt={name || "Foto do serviço"}
                sizes="80px"
                className="rounded-lg"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={!uploadsEnabled || busy}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!uploadsEnabled || busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {isPreparingImage
                  ? "Preparando foto..."
                  : currentImage
                    ? "Trocar foto"
                    : "Escolher foto"}
              </Button>
              {currentImage && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={handleRemoveImage}
                >
                  Remover foto
                </Button>
              )}
              {!uploadsEnabled && (
                <p className="text-muted-foreground text-xs">
                  Envio de fotos indisponível no momento.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="service-name">Nome</Label>
            <Input
              id="service-name"
              value={name}
              maxLength={60}
              required
              placeholder="Ex.: Corte de Cabelo"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="service-description">Descrição (opcional)</Label>
            <textarea
              id="service-description"
              value={description}
              maxLength={200}
              className={textareaClassName}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="service-price">Preço (R$)</Label>
              <Input
                id="service-price"
                inputMode="decimal"
                value={price}
                required
                placeholder="45,00"
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="service-duration">Duração (min)</Label>
              <Input
                id="service-duration"
                type="number"
                inputMode="numeric"
                min={5}
                max={240}
                step={5}
                value={duration}
                required
                placeholder="30"
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                Voltar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={busy}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AdminServiceForm
