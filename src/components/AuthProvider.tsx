"use client"

import { createContext, useContext, type ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import type { AuthUser } from "@/lib/auth"

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signin: (
    email: string,
    password: string,
    antiBot: { captchaToken?: string; honeypot: string },
  ) => Promise<{ success: boolean; error?: string }>
  signout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession()

  const signin = async (
    email: string,
    password: string,
    antiBot: { captchaToken?: string; honeypot: string },
  ) => {
    const { data, error } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      rememberMe: true,
    }, {
      headers: {
        "x-auth-honeypot": antiBot.honeypot,
        ...(antiBot.captchaToken
          ? { "x-captcha-response": antiBot.captchaToken }
          : {}),
      },
    })

    if (error || !data?.user) {
      return {
        success: false,
        error: error?.status === 429
          ? "Trop de tentatives. Veuillez réessayer plus tard."
          : error?.code === "CAPTCHA_MISSING_RESPONSE" || error?.code === "CAPTCHA_VERIFICATION_FAILED"
            ? "La vérification anti-robot a échoué. Veuillez réessayer."
            : "Email ou mot de passe incorrect",
      }
    }

    await refetch()
    return { success: true }
  }

  const signout = async () => {
    await authClient.signOut()
    await refetch()
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        loading: isPending,
        signin,
        signout,
        refresh: () => refetch(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
