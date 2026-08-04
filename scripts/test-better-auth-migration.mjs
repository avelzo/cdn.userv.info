import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

const sourceDatabaseUrl = process.env.DATABASE_URL
if (!sourceDatabaseUrl) throw new Error('DATABASE_URL est requis')

const isolatedUrl = new URL(sourceDatabaseUrl)
const sourceDatabaseName = isolatedUrl.pathname.replace(/^\//, '')
if (!sourceDatabaseName) throw new Error('DATABASE_URL doit contenir un nom de base')

isolatedUrl.pathname = `/${sourceDatabaseName}_better_auth_test_${crypto.randomBytes(6).toString('hex')}`

const source = new PrismaClient()
const isolated = new PrismaClient({
  datasources: { db: { url: isolatedUrl.toString() } },
})

async function migrateUser(target, user) {
  await target.betterAuthAccount.upsert({
    where: {
      providerId_accountId: {
        providerId: 'credential',
        accountId: user.id,
      },
    },
    update: {},
    create: {
      providerId: 'credential',
      accountId: user.id,
      userId: user.id,
      password: user.password,
    },
  })

  await target.user.update({
    where: { id: user.id },
    data: { authEmailVerified: Boolean(user.emailVerified) },
  })
}

async function main() {
  const accountsBefore = await source.betterAuthAccount.count()
  const users = await source.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      name: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (users.length < 2) throw new Error('Le test isolé exige au moins deux utilisateurs')

  for (const user of users) {
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password)) {
      throw new Error('Un hash source ne respecte pas le format bcrypt attendu')
    }
    if (!user.name?.trim()) throw new Error('Un utilisateur source ne possède pas de nom')

    await isolated.user.create({ data: user })
    await migrateUser(isolated, user)
  }

  const migratedAccounts = await isolated.betterAuthAccount.findMany({
    where: { providerId: 'credential' },
    select: { accountId: true, password: true },
  })
  if (migratedAccounts.length !== users.length) {
    throw new Error('Le nombre de comptes credential migrés est incorrect')
  }

  for (const user of users) {
    const account = migratedAccounts.find((candidate) => candidate.accountId === user.id)
    if (account?.password !== user.password) {
      throw new Error('Un hash bcrypt n’a pas été copié à l’identique')
    }
  }

  const testPassword = `Migration-${crypto.randomBytes(18).toString('base64url')}`
  const syntheticUser = await isolated.user.create({
    data: {
      email: `auth-test-${crypto.randomUUID()}@example.invalid`,
      name: 'Better Auth Migration Test',
      password: await bcrypt.hash(testPassword, 12),
      authEmailVerified: true,
    },
  })
  await migrateUser(isolated, {
    ...syntheticUser,
    emailVerified: null,
  })

  const testAuth = betterAuth({
    baseURL: 'http://localhost:3000',
    secret: crypto.randomBytes(32).toString('base64url'),
    database: prismaAdapter(isolated, { provider: 'mongodb' }),
    user: {
      modelName: 'User',
      fields: { emailVerified: 'authEmailVerified' },
      additionalFields: {
        username: { type: 'string', required: false, input: false },
      },
    },
    session: { modelName: 'BetterAuthSession' },
    account: { modelName: 'BetterAuthAccount' },
    verification: { modelName: 'BetterAuthVerification' },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: {
        hash: async (password) => bcrypt.hash(password, 12),
        verify: async ({ hash, password }) => bcrypt.compare(password, hash),
      },
    },
    advanced: { database: { generateId: false } },
  })

  const login = await testAuth.api.signInEmail({
    body: { email: syntheticUser.email, password: testPassword },
  })
  if (login.user.id !== syntheticUser.id) throw new Error('Le login Better Auth isolé a échoué')

  const accountsAfter = await source.betterAuthAccount.count()
  if (accountsAfter !== accountsBefore) {
    throw new Error('La base source a été modifiée pendant le test isolé')
  }

  console.info(JSON.stringify({
    isolated: true,
    copiedUsers: users.length,
    migratedCredentials: migratedAccounts.length,
    loginVerified: true,
    sourceUnchanged: true,
  }))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Isolated migration test failed')
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await isolated.$runCommandRaw({ dropDatabase: 1 })
    } finally {
      await Promise.all([isolated.$disconnect(), source.$disconnect()])
    }
  })
