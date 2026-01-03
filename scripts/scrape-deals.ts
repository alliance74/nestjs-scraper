import { PrismaClient } from '@prisma/client';
import { scrapeDeals } from '../src/scrapers/deal-scraper';

async function run() {
  const prisma = new PrismaClient();

  try {
    await scrapeDeals({ prisma, log: true });
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('Unexpected error during scraping', error);
  process.exit(1);
});
