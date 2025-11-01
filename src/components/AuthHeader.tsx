"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import Logo from "./Logo"

interface AuthHeaderProps {
  showManagerLink?: boolean
}

export default function AuthHeader({ showManagerLink = true }: AuthHeaderProps) {
  const { data: session, status } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const userLabel = session?.user?.name || session?.user?.email || "Utilisateur"
  const initials = (() => {
    if (!userLabel) return "?"
    const parts = userLabel.replace(/@.*/, "").trim().split(/\s+/)
    const first = parts[0]?.[0] || ""
    const second = parts[1]?.[0] || (parts[0]?.[1] || "")
    return (first + second).toUpperCase()
  })()

  return (
    <header className="bg-white/90 dark:bg-gray-800/80 backdrop-blur supports-backdrop-blur:bg-white/80 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <Logo size="md" variant="full" />
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {status === "loading" ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-9 w-24 rounded-lg" />
            ) : session ? (
              <>
                {showManagerLink && (
                  <Link
                    href="/manager"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium shadow-sm"
                  >
                    <span className="hidden sm:inline">Ouvrir le</span> Manager
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="group inline-flex items-center gap-3 px-2 py-1 transition-colors duration-200"
                  title="Mon profil"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs font-semibold">
                    {initials}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-medium tracking-tight">
                    {userLabel}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-white border border-red-200 dark:border-red-700 hover:bg-red-600 transition-colors duration-200"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium shadow-sm"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
                >
                  {`S'inscrire`}
                </Link>
              </>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg
              className="h-5 w-5 text-gray-700 dark:text-gray-200"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div className={`md:hidden ${mobileOpen ? 'block' : 'hidden'} border-t border-gray-200 dark:border-gray-700`}> 
        <div className="px-4 py-3 space-y-3">
          {status === "loading" ? (
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-28 rounded"></div>
          ) : session ? (
            <>
              {showManagerLink && (
                <Link
                  href="/manager"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                >
                  Ouvrir le Manager
                </Link>
              )}

              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs font-semibold">
                  {initials}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium tracking-tight">{userLabel}</span>
              </Link>

              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-white border border-red-200 dark:border-red-700 hover:bg-red-600 transition-colors duration-200"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
              >
                Connexion
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
              >
                {`S'inscrire`}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}