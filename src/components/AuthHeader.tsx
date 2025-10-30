"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import Logo from "./Logo"

interface AuthHeaderProps {
  showManagerLink?: boolean
}

export default function AuthHeader({ showManagerLink = true }: AuthHeaderProps) {
  const { data: session, status } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <Logo size="md" variant="full" />
            </Link>
          </div>
          
          <nav className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
            ) : session ? (
              <>
                {showManagerLink && (
                  <Link
                    href="/manager"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Manager
                  </Link>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Bonjour, {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                >
                  {`S'inscrire`}
                </Link>
                <Link
                  href="/auth/signin"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                >
                  Connexion
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}