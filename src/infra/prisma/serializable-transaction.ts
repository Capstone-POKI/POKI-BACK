import { Prisma, PrismaClient } from '@prisma/client';

const MAX_TRANSACTION_ATTEMPTS = 3;

export async function runSerializableTransaction<T>(
  prisma: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034');

      if (!isRetryable || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 20));
    }
  }

  throw new Error('Serializable transaction retry exhausted');
}
