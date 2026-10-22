import Image from "next/image"
import { Button } from "./button"
import { MenuIcon } from "lucide-react"
import { Sheet, SheetTrigger } from "./sheet"
import SideBarSheet from "./sidebar-sheet"
import Link from "next/link"

const Header = () => {
  return (
    <header className="bg-[var(--brand-forest)]">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center gap-1">
          <Image
            src="/brand/nobre-crown.png"
            height={16}
            width={27}
            alt=""
            className="h-[16px] w-[27px]"
            priority
          />
          <Image
            src="/brand/nobre-wordmark.png"
            height={18}
            width={89}
            alt="Nobre"
            className="h-[18px] w-[89px]"
            priority
          />
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="text-[var(--brand-gold)] hover:bg-white/10 hover:text-[var(--brand-gold)]"
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SideBarSheet />
        </Sheet>
      </div>
    </header>
  )
}

export default Header
