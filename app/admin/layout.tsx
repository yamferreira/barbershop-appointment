import { ReactNode } from "react"
import { requireBarbeiro } from "@/app/_lib/auth"
import AdminNav from "@/app/_components/ui/admin-nav"

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  await requireBarbeiro()

  return (
    <div className="theme-nobre bg-background text-foreground flex flex-1 flex-col">
      <AdminNav />
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default AdminLayout
