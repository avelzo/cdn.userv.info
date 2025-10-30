import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/src/infrastructure/database/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      )
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      }
    })

    // Créer le dossier racine pour l'utilisateur
    await prisma.folder.create({
      data: {
        name: "Disque",
        slug: "root",
        path: "/",
        isRoot: true,
        userId: user.id,
      }
    })

    return NextResponse.json(
      { message: "Utilisateur créé avec succès", userId: user.id },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Erreur lors de la création de l'utilisateur:", error)
    
    // Gérer les erreurs spécifiques de Prisma
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('email')) {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email existe déjà" },
          { status: 400 }
        )
      }
      if (target?.includes('username')) {
        return NextResponse.json(
          { error: "Ce nom d'utilisateur est déjà pris" },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: "Violation de contrainte d'unicité" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}