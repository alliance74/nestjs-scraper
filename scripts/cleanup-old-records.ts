import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAYS_IN_MS = 24 * 60 * 60 * 1000;

const dealRetentionDays = Number(process.env.DEAL_RETENTION_DAYS ?? 90);
const eventRetentionDays = Number(process.env.EVENT_RETENTION_DAYS ?? 90);

const now = Date.now();
const dealThreshold = new Date(now - Math.max(1, dealRetentionDays) * DAYS_IN_MS);
const eventThreshold = new Date(now - Math.max(1, eventRetentionDays) * DAYS_IN_MS);

async function main() {
  const dealResult = await prisma.deal.deleteMany({
    where: {
      OR: [
        { validUntil: { lt: dealThreshold } },
        {
          AND: [
            { validUntil: null },
            { scrapedAt: { lt: dealThreshold } },
          ],
        },
      ],
    },
  });

  const eventResult = await prisma.event.deleteMany({
    where: {
      OR: [
        { endDate: { lt: eventThreshold } },
        {
          AND: [
            { endDate: null },
            { startDate: { lt: eventThreshold } },
          ],
        },
      ],
    },
  });

  console.log(`Deleted ${dealResult.count} deals older than ${dealRetentionDays} days.`);
  console.log(`Deleted ${eventResult.count} events older than ${eventRetentionDays} days.`);
}

main()
  .catch((error) => {
    console.error('Cleanup failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
