import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import cron, { ScheduledTask } from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';
import { scrapeDeals } from '../scrapers/deal-scraper';
import { scrapeEvents } from '../scrapers/event-scraper';

const FOUR_HOUR_CRON = '0 */4 * * *';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private task?: ScheduledTask;
  private isRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.triggerAllScrapers('startup');

    this.task = cron.schedule(
      FOUR_HOUR_CRON,
      () => {
        void this.triggerAllScrapers('cron(4h)');
      },
      {
        timezone: 'Europe/Athens',
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.task?.stop();
  }

  async triggerAllScrapers(trigger = 'manual'): Promise<void> {
    await this.runBatch(trigger, { runDeals: true, runEvents: true });
  }

  async triggerDealsScraper(trigger = 'manual'): Promise<void> {
    await this.runBatch(trigger, { runDeals: true, runEvents: false });
  }

  async triggerEventsScraper(trigger = 'manual'): Promise<void> {
    await this.runBatch(trigger, { runDeals: false, runEvents: true });
  }

  private async runBatch(
    trigger: string,
    { runDeals = true, runEvents = true }: { runDeals?: boolean; runEvents?: boolean } = {},
  ): Promise<void> {
    if (!runDeals && !runEvents) {
      this.logger.warn(`Skipping ${trigger} run because no scrapers were requested.`);
      return;
    }

    if (this.isRunning) {
      this.logger.warn(`Skipping ${trigger} run because another scrape is in progress.`);
      return;
    }

    this.isRunning = true;
    this.logger.log(`Running scheduled scrapers (trigger: ${trigger})`);

    try {
      if (runDeals) {
        await this.runSafely('deal-scraper', async () => {
          await scrapeDeals({
            prisma: this.prisma,
            writeFile: false,
            log: false,
            retryOptions: {
              retries: 3,
              backoffMs: 1000,
              maxBackoffMs: 10000,
              logger: this.logger,
            },
          });
        });
      }

      if (runEvents) {
        await this.runSafely('event-scraper', async () => {
          await scrapeEvents({
            prisma: this.prisma,
            writeFile: false,
            log: false,
            retryOptions: {
              retries: 3,
              backoffMs: 1000,
              maxBackoffMs: 10000,
              logger: this.logger,
            },
          });
        });
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async runSafely(taskName: string, task: () => Promise<void>): Promise<void> {
    try {
      this.logger.log(`Starting ${taskName}`);
      await task();
      this.logger.log(`Finished ${taskName}`);
    } catch (error) {
      this.logger.error(`Failed ${taskName}`, error instanceof Error ? error.stack : String(error));
    }
  }
}
