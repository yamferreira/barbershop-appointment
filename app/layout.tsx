import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"
import "./globals.css"
import { Toaster } from "./_components/ui/sonner"
import Footer from "./_components/ui/footer"
import AuthProvider from "./_providers/auth"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Display serif for the brand wordmark and hero/section headings only —
// the rest of the UI stays on Inter.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["700", "900"],
})

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// })

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// })

export const metadata: Metadata = {
  title: "Nobre Barbearia",
  description: "Agende seu corte de cabelo e barba online.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>
        <AuthProvider>
          <div className="flex h-full flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
