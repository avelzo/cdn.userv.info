import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username?: string
      createdAt?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name?: string
    username?: string
    image?: string
    createdAt?: Date
  }
}