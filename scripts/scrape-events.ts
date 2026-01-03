import { PrismaClient } from '@prisma/client';
import { scrapeEvents } from '../src/scrapers/event-scraper';

async function run() {
  const prisma = new PrismaClient();

  try {
    await scrapeEvents({ prisma, log: true });
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('Unexpected error during event scraping run', error);
  process.exit(1);
});
