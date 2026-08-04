import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const confirmation = process.env.MEDIA_PUBLICATION_CONFIRM
const expectedPrivateCount = Number(process.env.MEDIA_EXPECTED_PRIVATE_COUNT)

async function main() {
  const [total, publicFiles, privateFiles] = await Promise.all([
    prisma.file.count(),
    prisma.file.count({ where: { isPublic: true } }),
    prisma.file.count({ where: { isPublic: false } }),
  ])

  console.info(JSON.stringify({
    mode: apply ? 'apply' : 'inventory',
    total,
    publicFiles,
    privateFiles,
    pending: privateFiles,
  }))

  if (!apply) return
  if (confirmation !== 'PUBLISH_ALL_EXISTING_FILES') {
    throw new Error(
      'MEDIA_PUBLICATION_CONFIRM=PUBLISH_ALL_EXISTING_FILES est requis avec --apply',
    )
  }
  if (!Number.isSafeInteger(expectedPrivateCount) || expectedPrivateCount < 0) {
    throw new Error('MEDIA_EXPECTED_PRIVATE_COUNT doit contenir le nombre inventorié avant --apply')
  }
  if (expectedPrivateCount !== privateFiles) {
    throw new Error(
      `Publication refusée : ${privateFiles} fichiers privés trouvés, ${expectedPrivateCount} attendus`,
    )
  }

  const result = await prisma.file.updateMany({
    where: { isPublic: false },
    data: { isPublic: true },
  })
  console.info(JSON.stringify({ mode: 'apply', published: result.count }))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Publication failed')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
