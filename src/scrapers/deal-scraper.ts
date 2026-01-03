import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import { PrismaClient, Retailer } from '@prisma/client';
import { fetchWithRetry, RetryOptions } from './http-client';

const OUTPUT_FILE = 'scraped-deals.json';
const skroutzUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const CURRENCY_REGEX = /[^0-9,.-]/g;

export interface DealRecord {
  retailer: string;
  title: string;
  description?: string;
  productUrl: string;
  imageUrl?: string;
  salePrice?: string;
  saleCurrency?: string;
  discountedPrice?: string;
  discountedCurrency?: string;
  discountPercentage?: string;
  stockStatus?: string;
  validFrom?: string;
  validUntil?: string;
  scrapedAt: string;
}

export interface DealsScrapeResult {
  runAt: string;
  sources: string[];
  totalDeals: number;
  deals: DealRecord[];
}

export interface ScrapeDealsOptions {
  persist?: boolean;
  writeFile?: boolean;
  outputFile?: string;
  log?: boolean;
  prisma?: PrismaClient;
  retryOptions?: RetryOptions;
}

function parseNumberFromText(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(CURRENCY_REGEX, '').trim();
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized.replace(/\.(?=.*\.)/g, '').replace(',', '.');
  const numericValue = Number(normalized);

  return Number.isNaN(numericValue) ? null : numericValue;
}

interface Scraper {
  retailer: string;
  url: string;
  scraper: (runTimestamp: string, context: ScraperContext) => Promise<DealRecord[]>;
}

interface ScraperContext {
  retryOptions?: RetryOptions;
  log?: boolean;
}

function buildRetryOptions(context: ScraperContext): RetryOptions | undefined {
  const base = context.retryOptions ?? {};
  if (base.logger) {
    return base;
  }

  if (context.log === false) {
    return { ...base, logger: undefined };
  }

  return { ...base, logger: console };
}

const abPromotions: Scraper = {
  retailer: 'AB_VASSILOPOULOS',
  url: 'https://www.ab.gr/search/promotions?page=1',
  scraper: async (runTimestamp, context) => {
    const response = await fetchWithRetry<string>(
      'https://www.ab.gr/search/promotions?page=1',
      {
        headers: {
          'User-Agent': skroutzUserAgent,
        },
      },
      buildRetryOptions(context),
    );

    const $ = cheerio.load(response.data);
    const deals: DealRecord[] = [];

    $('.ProductProductCard').each((_, element) => {
      const container = $(element);
      const title = container.find('.ProductCard__ProductName').text().trim();
      if (!title) {
        return;
      }

      const productUrl = container.find('a').attr('href') ?? '';
      const discountBadge = container.find('.ProductCard__BadgePromo').text().trim();
      const priceText = container.find('.ProductCard__Price .Price__PriceValue').first().text().trim();
      const imageUrl = container.find('img').attr('src');

      deals.push({
        retailer: abPromotions.retailer,
        title,
        productUrl: productUrl ? `https://www.ab.gr${productUrl}` : '',
        imageUrl,
        discountPercentage: discountBadge,
        salePrice: priceText,
        saleCurrency: 'EUR',
        scrapedAt: runTimestamp,
      });
    });

    return deals;
  },
};

const lidlWeekly: Scraper = {
  retailer: 'LIDL',
  url: 'https://www.lidl-hellas.gr/c/evdomadiaies-epiloges-25kw52/a10086079',
  scraper: async (runTimestamp, context) => {
    const response = await fetchWithRetry<string>(
      'https://www.lidl-hellas.gr/c/evdomadiaies-epiloges-25kw52/a10086079',
      {
        headers: {
          'User-Agent': skroutzUserAgent,
        },
      },
      buildRetryOptions(context),
    );

    const $ = cheerio.load(response.data);
    const deals: DealRecord[] = [];

    $('[data-testid="mms-article-variant-card"]').each((_, element) => {
      const container = $(element);
      const title = container.find('h3, h4, h5').first().text().trim();
      if (!title) {
        return;
      }

      const productUrl = container.find('a[data-testid="mms-article-card-link"]').attr('href') ?? '';

      const priceSection = container.find('[data-testid="mms-price"]');
      const salePrice = priceSection.find('[data-testid="mms-price-primary"]').text().trim();
      const discountedPrice = priceSection.find('[data-testid="mms-price-secondary"]').text().trim();

      const discountBadge = container.find('[data-testid="mms-badge-text"]').text().trim();
      const imageUrl = container.find('img').attr('src');

      deals.push({
        retailer: lidlWeekly.retailer,
        title,
        productUrl: productUrl.startsWith('http') ? productUrl : `https://www.lidl-hellas.gr${productUrl}`,
        imageUrl,
        salePrice,
        discountedPrice: discountedPrice || undefined,
        saleCurrency: 'EUR',
        discountedCurrency: 'EUR',
        discountPercentage: discountBadge,
        scrapedAt: runTimestamp,
      });
    });

    return deals;
  },
};

const scrapers: Scraper[] = [abPromotions, lidlWeekly];

async function persistWithPrisma(deals: DealRecord[], prisma?: PrismaClient): Promise<void> {
  const client = prisma ?? new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    for (const deal of deals) {
      const retailerValue = mapRetailer(deal.retailer);
      const salePrice = parseNumberFromText(deal.salePrice);
      const discountedPrice = parseNumberFromText(deal.discountedPrice);
      const discountPercentage = parseNumberFromText(deal.discountPercentage);

      await client.deal.upsert({
        where: { externalId: deal.productUrl },
        create: {
          retailer: retailerValue as any,
          title: deal.title,
          description: deal.description,
          productUrl: deal.productUrl,
          imageUrl: deal.imageUrl,
          salePrice,
          saleCurrency: deal.saleCurrency,
          discountedPrice,
          discountedCurrency: deal.discountedCurrency,
          discountPercentage,
          externalId: deal.productUrl,
          scrapedAt: new Date(deal.scrapedAt),
        },
        update: {
          title: deal.title,
          description: deal.description,
          imageUrl: deal.imageUrl,
          salePrice,
          saleCurrency: deal.saleCurrency,
          discountedPrice,
          discountedCurrency: deal.discountedCurrency,
          discountPercentage,
          scrapedAt: new Date(deal.scrapedAt),
        },
      });
    }
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect();
    }
  }
}

function mapRetailer(retailerKey: string): Retailer | string {
  const retailerEnum = Retailer as unknown as Record<string, Retailer>;
  return retailerEnum?.[retailerKey] ?? retailerKey;
}

export async function scrapeDeals(options: ScrapeDealsOptions = {}): Promise<DealsScrapeResult> {
  const { persist = true, writeFile = true, outputFile = OUTPUT_FILE, log = true, prisma, retryOptions } = options;
  const runAt = new Date().toISOString();
  const aggregated: DealRecord[] = [];
  const context: ScraperContext = { retryOptions, log };

  for (const scraper of scrapers) {
    try {
      const deals = await scraper.scraper(runAt, context);
      aggregated.push(...deals);
      if (log) {
        console.log(`Scraped ${deals.length} deals from ${scraper.retailer}`);
      }
    } catch (error) {
      console.error(`Failed to scrape ${scraper.retailer}`, error);
    }
  }

  const payload: DealsScrapeResult = {
    runAt,
    sources: scrapers.map((scraper) => scraper.url),
    totalDeals: aggregated.length,
    deals: aggregated,
  };

  if (writeFile) {
    await fs.writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf-8');
  }

  if (persist) {
    await persistWithPrisma(aggregated, prisma);
  }

  if (log) {
    console.log(`Deal scraping completed. ${aggregated.length} records processed.`);
  }

  return payload;
}
