import { PrismaClient, Retailer } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.deal.createMany({
    data: [
      {
        retailer: Retailer.AB_VASSILOPOULOS,
        title: 'Sample Deal',
        productUrl: 'https://www.ab.gr/sample-deal',
        salePrice: 9.99,
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        retailer: Retailer.LIDL,
        title: 'Holiday Event',
        description: 'Sample event',
        location: 'Athens',
        startDate: new Date(),
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
