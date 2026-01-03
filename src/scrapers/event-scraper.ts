import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { fetchWithRetry, RetryOptions } from './http-client';

export interface EventRecord {
  source: string;
  title: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  sourceUrl: string;
  startDate: string;
  endDate?: string;
  category?: string;
  tags?: string[];
  scrapedAt: string;
}

export interface EventsScrapeResult {
  runAt: string;
  totalEvents: number;
  sources: string[];
  events: EventRecord[];
}

export interface ScrapeEventsOptions {
  persist?: boolean;
  writeFile?: boolean;
  outputFile?: string;
  log?: boolean;
  prisma?: PrismaClient;
  retryOptions?: RetryOptions;
}

const OUTPUT_FILE = 'scraped-events.json';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

interface EventScraper {
  name: string;
  scraper: (runTimestamp: string, context: EventScraperContext) => Promise<EventRecord[]>;
}

interface EventScraperContext {
  retryOptions?: RetryOptions;
  log?: boolean;
}

function buildRetryOptions(context: EventScraperContext): RetryOptions | undefined {
  const base = context.retryOptions ?? {};
  if (base.logger) {
    return base;
  }

  if (context.log === false) {
    return { ...base, logger: undefined };
  }

  return { ...base, logger: console };
}

async function fetchHtml(url: string, context: EventScraperContext) {
  const response = await fetchWithRetry<string>(
    url,
    {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
    },
    buildRetryOptions(context),
  );
  return response.data as string;
}

const visitGreeceScraper: EventScraper = {
  name: 'VisitGreece',
  scraper: async (runTimestamp, context) => {
    try {
      const html = await fetchHtml('https://www.visitgreece.gr/events/', context);
      const $ = cheerio.load(html);
      const events: EventRecord[] = [];

      $('[data-elementor-type="loop-item"]').each((_, element) => {
        const container = $(element);
        const anchor = container.find('a').first();
        const title = anchor.text().trim();
        const sourceUrl = anchor.attr('href');
        if (!title || !sourceUrl) {
          return;
        }

        const imageUrl = container.find('img').attr('src') ?? undefined;
        const dateText = container.find('.eael-entry-meta .eael-entry-date').first().text().trim();
        const location = container.find('.eael-entry-meta .eael-entry-author').first().text().trim();
        const description = container.find('.eael-post-excerpt p').first().text().trim();

        const parsedDate = dateText ? new Date(dateText.replace(/\s+/g, ' ')) : new Date(runTimestamp);

        events.push({
          source: visitGreeceScraper.name,
          title,
          description: description || undefined,
          location: location || undefined,
          imageUrl,
          sourceUrl,
          startDate: parsedDate.toISOString(),
          scrapedAt: runTimestamp,
        });
      });

      return events;
    } catch (error) {
      console.warn('Visit Greece scraper failed, returning empty array.', error);
      return [];
    }
  },
};

const allOfGreeceScraper: EventScraper = {
  name: 'AllOfGreeceOneCulture',
  scraper: async (runTimestamp, context) => {
    try {
      const response = await fetchWithRetry<Record<string, any>[]>(
        'https://allofgreeceone.culture.gov.gr/wp-json/wp/v2/event?per_page=50&_embed=true',
        {
          headers: { 'User-Agent': DEFAULT_USER_AGENT },
        },
        buildRetryOptions(context),
      );

      const events: EventRecord[] = [];
      const items = response.data ?? [];

      for (const item of items) {
        const title = (item.title?.rendered as string | undefined)?.replace(/<[^>]+>/g, '').trim();
        const sourceUrl = item.link as string | undefined;
        if (!title || !sourceUrl) {
          continue;
        }

        const description = (item.excerpt?.rendered as string | undefined)
          ?.replace(/<[^>]+>/g, '')
          .trim()
          .slice(0, 800);
        const imageUrl = item._embedded?.['wp:featuredmedia']?.[0]?.source_url as string | undefined;

        const meta = item.meta ?? {};
        const startDate = meta._EventStartDate ?? meta.start_date ?? item.date ?? runTimestamp;
        const endDate = meta._EventEndDate ?? meta.end_date ?? undefined;

        const tags = Array.isArray(item.eventTags)
          ? item.eventTags
              .map((tag: any) => (tag?.name as string | undefined)?.trim())
              .filter((tag): tag is string => Boolean(tag))
          : undefined;

        events.push({
          source: allOfGreeceScraper.name,
          title,
          description,
          imageUrl,
          sourceUrl,
          location: item._embedded?.region?.[0]?.name ?? undefined,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          category: item._embedded?.['wp:term']?.[0]?.[0]?.name ?? undefined,
          tags,
          scrapedAt: runTimestamp,
        });
      }

      return events;
    } catch (error) {
      console.warn('All of Greece scraper failed, returning empty array.', error);
      return [];
    }
  },
};

const pigolampidesScraper: EventScraper = {
  name: 'Pigolampides',
  scraper: async (runTimestamp, context) => {
    try {
      const html = await fetchHtml('https://pigolampides.gr/events/', context);
      const $ = cheerio.load(html);
      const events: EventRecord[] = [];

      $('.event-card').each((_, element) => {
        const container = $(element);
        const title = container.find('.event-title').text().trim();
        const sourceUrl = container.find('a').first().attr('href');
        if (!title || !sourceUrl) {
          return;
        }

        const imageUrl = container.find('img').attr('src') ?? undefined;
        const description = container.find('.event-excerpt').text().trim();
        const dateText = container.find('.event-date').text().trim();
        const location = container.find('.event-location').text().trim();

        const parsedDate = dateText ? new Date(dateText.replace(/\s+/g, ' ')) : new Date(runTimestamp);

        events.push({
          source: pigolampidesScraper.name,
          title,
          description: description || undefined,
          location: location || undefined,
          imageUrl,
          sourceUrl,
          startDate: parsedDate.toISOString(),
          scrapedAt: runTimestamp,
        });
      });

      return events;
    } catch (error) {
      console.warn('Pigolampides scraper failed, returning empty array.', error);
      return [];
    }
  },
};

const moreComScraper: EventScraper = {
  name: 'MoreCom',
  scraper: async (runTimestamp, context) => {
    try {
      const html = await fetchHtml('https://www.more.com/events/?category=family', context);
      const $ = cheerio.load(html);
      const events: EventRecord[] = [];

      $('.event-card').each((_, element) => {
        const card = $(element);
        const anchor = card.find('a').first();
        const title = anchor.text().trim();
        const sourceUrl = anchor.attr('href');
        if (!title || !sourceUrl) {
          return;
        }

        const imageUrl = card.find('img').attr('src') ?? undefined;
        const description = card.find('.event-description').text().trim();
        const dateText = card.find('.event-date').text().trim();
        const location = card.find('.event-location').text().trim();

        const parsedDate = dateText ? new Date(dateText.replace(/\s+/g, ' ')) : new Date(runTimestamp);

        events.push({
          source: moreComScraper.name,
          title,
          description: description || undefined,
          location: location || undefined,
          imageUrl,
          sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://www.more.com${sourceUrl}`,
          startDate: parsedDate.toISOString(),
          scrapedAt: runTimestamp,
        });
      });

      return events;
    } catch (error) {
      console.warn('More.com scraper failed, returning empty array.', error);
      return [];
    }
  },
};

const olakalaScraper: EventScraper = {
  name: 'Olakala',
  scraper: async (runTimestamp, context) => {
    try {
      const html = await fetchHtml('https://www.olakala.gr/events/', context);
      const $ = cheerio.load(html);
      const events: EventRecord[] = [];

      $('.tribe-events-calendar-list__event').each((_, element) => {
        const container = $(element);
        const title = container.find('.tribe-events-calendar-list__event-title-link').text().trim();
        const sourceUrl = container.find('.tribe-events-calendar-list__event-title-link').attr('href');
        if (!title || !sourceUrl) {
          return;
        }

        const imageUrl = container.find('img').attr('src') ?? undefined;
        const description = container.find('.tribe-events-calendar-list__event-description p').text().trim();
        const dateText = container.find('time').attr('datetime');
        const location = container.find('.tribe-events-calendar-list__event-venue').text().trim();

        events.push({
          source: olakalaScraper.name,
          title,
          description: description || undefined,
          location: location || undefined,
          imageUrl,
          sourceUrl,
          startDate: dateText ? new Date(dateText).toISOString() : runTimestamp,
          scrapedAt: runTimestamp,
        });
      });

      return events;
    } catch (error) {
      console.warn('Olakala scraper failed, returning empty array.', error);
      return [];
    }
  },
};

const kalamataScraper: EventScraper = {
  name: 'Kalamata',
  scraper: async (runTimestamp, context) => {
    try {
      const html = await fetchHtml('https://events.kalamata.gr/', context);
      const $ = cheerio.load(html);
      const events: EventRecord[] = [];

      $('.event-item').each((_, element) => {
        const container = $(element);
        const title = container.find('.event-title').text().trim();
        const sourceUrl = container.find('a').first().attr('href');
        if (!title || !sourceUrl) {
          return;
        }

        const imageUrl = container.find('img').attr('src') ?? undefined;
        const description = container.find('.event-excerpt').text().trim();
        const dateText = container.find('.event-date').text().trim();
        const location = container.find('.event-location').text().trim();

        const parsedDate = dateText ? new Date(dateText.replace(/\s+/g, ' ')) : new Date(runTimestamp);

        events.push({
          source: kalamataScraper.name,
          title,
          description: description || undefined,
          location: location || undefined,
          imageUrl,
          sourceUrl,
          startDate: parsedDate.toISOString(),
          scrapedAt: runTimestamp,
        });
      });

      return events;
    } catch (error) {
      console.warn('Kalamata events scraper failed, returning empty array.', error);
      return [];
    }
  },
};

const scrapers: EventScraper[] = [
  visitGreeceScraper,
  allOfGreeceScraper,
  pigolampidesScraper,
  moreComScraper,
  olakalaScraper,
  kalamataScraper,
];

async function persistWithPrisma(events: EventRecord[], prisma?: PrismaClient): Promise<void> {
  const client = prisma ?? new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    for (const event of events) {
      const startDate = new Date(event.startDate).toISOString();
      const endDate = event.endDate ? new Date(event.endDate).toISOString() : null;

      await client.event.upsert({
        where: { sourceUrl: event.sourceUrl } as any,
        create: {
          title: event.title,
          description: event.description,
          location: event.location,
          imageUrl: event.imageUrl,
          sourceUrl: event.sourceUrl,
          startDate,
          endDate,
          category: event.category,
          tags: event.tags ?? [],
          metadata: {
            source: event.source,
            scrapedAt: event.scrapedAt,
          },
        },
        update: {
          title: event.title,
          description: event.description,
          location: event.location,
          imageUrl: event.imageUrl,
          startDate,
          endDate,
          category: event.category,
          tags: event.tags ?? [],
          metadata: {
            source: event.source,
            scrapedAt: event.scrapedAt,
          },
        },
      } as any);
    }
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && (error as any).code === 'P2021') {
      console.warn('Event table not found; skipping event persistence. Run `npx prisma migrate deploy`.', error);
      return;
    }
    throw error;
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect();
    }
  }
}

export async function scrapeEvents(options: ScrapeEventsOptions = {}): Promise<EventsScrapeResult> {
  const { persist = true, writeFile = true, outputFile = OUTPUT_FILE, log = true, prisma, retryOptions } = options;
  const runAt = new Date().toISOString();
  const aggregated: EventRecord[] = [];
  const context: EventScraperContext = { retryOptions, log };

  for (const scraper of scrapers) {
    try {
      const events = await scraper.scraper(runAt, context);
      aggregated.push(...events);
      if (log) {
        console.log(`${scraper.name}: collected ${events.length} events.`);
      }
    } catch (error) {
      console.warn(`Failed to run scraper ${scraper.name}`, error);
    }
  }

  const payload: EventsScrapeResult = {
    runAt,
    totalEvents: aggregated.length,
    sources: scrapers.map((scraper) => scraper.name),
    events: aggregated,
  };

  if (writeFile) {
    await fs.writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf-8');
  }

  if (persist) {
    await persistWithPrisma(aggregated, prisma);
  }

  if (log) {
    console.log(`Event scraping completed. ${aggregated.length} records processed.`);
  }

  return payload;
}
