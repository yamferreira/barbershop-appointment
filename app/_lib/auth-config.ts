import { db } from "@/app/_lib/prisma"
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Adapter } from "next-auth/adapters"
import type { PrismaClient } from "@prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Without this, next-auth v5 rejects requests whose Host header it
  // doesn't already recognize (UntrustedHost) in any production
  // environment that isn't Vercel (which sets this implicitly via the
  // VERCEL env var) — e.g. `next start` locally or self-hosted deploys.
  trustHost: true,
  // @auth/prisma-adapter types its param against @prisma/client's PrismaClient,
  // but this project generates the client to a custom output path
  // (app/generated/prisma), so it's a structurally different type at compile
  // time even though it's the same class at runtime.
  adapter: PrismaAdapter(db as unknown as PrismaClient) as Adapter,
  session: {
    strategy: "database",
    maxAge: 60 * 60 * 24 * 90, // 90 dias
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user = {
        ...session.user,
        id: user.id,
        role: user.role,
      }
      return session
    },
  },
})
