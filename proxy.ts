import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Le middleware s'exécute ici pour les routes protégées
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
)

export const config = {
  matcher: ["/manager/:path*", "/api/files/:path*", "/api/folders/:path*"]
}