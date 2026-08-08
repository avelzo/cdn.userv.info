import bcrypt from "bcryptjs"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/src/infrastructure/database/prisma"
import { generateResetPasswordEmail, sendEmail } from "@/src/lib/email"
import { verifyTurnstileToken } from "@/src/lib/turnstile"

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL
const secret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET
const turnstileSecret = process.env.TURNSTILE_SECRET
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const turnstileRequired = process.env.AUTH_CAPTCHA_REQUIRED === "true"

if (
  Boolean(turnstileSecret) !== Boolean(turnstileSiteKey)
  || (turnstileRequired && (!turnstileSecret || !turnstileSiteKey))
) {
  throw new Error(
    "Turnstile est requis : configurez TURNSTILE_SECRET et NEXT_PUBLIC_TURNSTILE_SITE_KEY ensemble",
  )
}

function configuredTurnstileHostnames(): string[] | undefined {
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES
    ?.split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean)
  if (configured?.length) return configured

  if (!baseURL) return undefined
  try {
    return [new URL(baseURL).hostname.toLowerCase()]
  } catch {
    return undefined
  }
}

const honeypotPlugin = {
  id: "auth-honeypot",
  onRequest: async (request: Request) => {
    const pathname = new URL(request.url).pathname
    if (
      (pathname.endsWith("/sign-in/email") || pathname.endsWith("/sign-up/email"))
      && request.headers.get("x-auth-honeypot")?.trim()
    ) {
      return {
        response: Response.json(
          { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
          { status: 401 },
        ),
      }
    }
  },
}

function trustedClientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || undefined
}

const turnstilePlugin = {
  id: "turnstile-siteverify",
  onRequest: async (request: Request) => {
    const pathname = new URL(request.url).pathname
    if (!pathname.endsWith("/sign-in/email") || !turnstileSecret) return

    const token = request.headers.get("x-captcha-response")?.trim()
    if (!token) {
      return {
        response: Response.json(
          { code: "CAPTCHA_MISSING_RESPONSE", message: "Captcha response is required" },
          { status: 403 },
        ),
      }
    }

    const verified = await verifyTurnstileToken({
      secret: turnstileSecret,
      token,
      remoteIp: trustedClientIp(request),
      allowedHostnames: configuredTurnstileHostnames(),
    })
    if (!verified) {
      return {
        response: Response.json(
          { code: "CAPTCHA_VERIFICATION_FAILED", message: "Captcha verification failed" },
          { status: 403 },
        ),
      }
    }
  },
}

export const auth = betterAuth({
  appName: "CDN-USERV",
  baseURL,
  secret,
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  user: {
    modelName: "User",
    fields: {
      emailVerified: "authEmailVerified",
    },
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "BetterAuthSession",
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  account: {
    modelName: "BetterAuthAccount",
  },
  verification: {
    modelName: "BetterAuthVerification",
    storeIdentifier: "hashed",
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: async (password) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = generateResetPasswordEmail(user.name || user.email, url)
      void sendEmail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe - CDN-USERV",
        html,
        text,
      }).then((sent) => {
        if (!sent) console.error("Password reset email could not be sent")
      })
    },
  },
  disabledPaths: ["/sign-up/email"],
  plugins: [
    honeypotPlugin,
    ...(turnstileSecret
      ? [turnstilePlugin]
      : []),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 60, max: 10 },
    },
  },
  advanced: {
    database: {
      // Prisma/MongoDB doit générer ses ObjectId ; les identifiants Better Auth
      // par défaut ne sont pas des ObjectId valides.
      generateId: false,
    },
  },
  databaseHooks: {
    account: {
      update: {
        after: async (account) => {
          // Maintient le hash historique pour qu'un retour arrière reste possible.
          if (account.providerId === "credential" && account.password) {
            await prisma.user.update({
              where: { id: account.userId },
              data: { password: account.password },
            })
          }
        },
      },
    },
  },
})

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"]
