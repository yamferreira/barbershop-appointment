import Link from "next/link"

const Footer = () => {
  return (
    <footer className="bg-[var(--brand-forest)]">
      <div className="space-y-2 py-6 text-center text-sm text-[var(--brand-cream)]/60">
        <p>
          © 2025 Copyright{" "}
          <span className="font-bold text-[var(--brand-cream)]">
            Yam Ferreira
          </span>
        </p>
        <p>
          <Link
            href="/privacidade"
            className="underline underline-offset-2 hover:text-[var(--brand-cream)]"
          >
            Política de privacidade
          </Link>
        </p>
      </div>
    </footer>
  )
}

export default Footer
