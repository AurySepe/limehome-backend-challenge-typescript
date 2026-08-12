import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export default prisma
