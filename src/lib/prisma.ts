
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let prismaInstance: PrismaClient | undefined = globalForPrisma.prisma;

function ensurePrisma() {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('Prisma client is only available in the Node.js server runtime');
  }

  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance;
    }
  }

  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = ensurePrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
