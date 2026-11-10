import { ReactNode } from "react"
import { requireBarbeiro } from "@/app/_lib/auth"

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  await requireBarbeiro()

  return (
    <div className="theme-nobre bg-background text-foreground flex-1">
      {children}
    </div>
  )
}

export default AdminLayout
