import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const confirmation = process.env.BETTER_AUTH_MIGRATION_CONFIRM
const expectedUserCount = Number(process.env.BETTER_AUTH_EXPECTED_USER_COUNT)

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      password: true,
      emailVerified: true,
      betterAuthAccounts: {
        where: { providerId: 'credential' },
        select: { id: true },
      },
    },
  })

  const invalidHashes = users.filter(
    (user) => !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password),
  ).length
  const missingNames = users.filter((user) => !user.name?.trim()).length
  const alreadyMigrated = users.filter((user) => user.betterAuthAccounts.length > 0).length

  console.info(JSON.stringify({
    mode: apply ? 'apply' : 'inventory',
    userCount: users.length,
    alreadyMigrated,
    pending: users.length - alreadyMigrated,
    invalidHashes,
    missingNames,
  }))

  if (!apply) {
    console.info('Lecture seule terminée. Utilisez --apply uniquement sur une copie isolée après validation de cet inventaire.')
    return
  }

  if (confirmation !== 'MIGRATE_ALL_EXISTING_USERS') {
    throw new Error('BETTER_AUTH_MIGRATION_CONFIRM=MIGRATE_ALL_EXISTING_USERS est requis avec --apply')
  }
  if (!Number.isSafeInteger(expectedUserCount) || expectedUserCount < 1) {
    throw new Error('BETTER_AUTH_EXPECTED_USER_COUNT doit contenir le nombre inventorié avant --apply')
  }
  if (expectedUserCount !== users.length) {
    throw new Error(
      `Migration refusée : ${users.length} utilisateurs trouvés, ${expectedUserCount} attendus`,
    )
  }
  if (invalidHashes > 0) {
    throw new Error('Migration refusée : au moins un hash ne respecte pas le format bcrypt attendu')
  }
  if (missingNames > 0) {
    throw new Error('Migration refusée : Better Auth exige un nom non vide pour chaque utilisateur')
  }

  let processed = 0
  for (const user of users) {
    await prisma.betterAuthAccount.upsert({
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

    await prisma.user.update({
      where: { id: user.id },
      data: { authEmailVerified: Boolean(user.emailVerified) },
    })
    processed += 1
  }

  console.info(JSON.stringify({
    mode: 'apply',
    processed,
    newCredentials: users.length - alreadyMigrated,
    existingCredentials: alreadyMigrated,
  }))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Migration failed')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
