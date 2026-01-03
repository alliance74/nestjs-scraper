import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('admin/scrape')
@UseGuards(ApiKeyGuard)
@ApiTags('Administration')
@ApiSecurity('api-key')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger both deal and event scrapers immediately' })
  @ApiResponse({ status: 202, description: 'Scrapers accepted for execution.' })
  async triggerAll(): Promise<{ status: string; trigger: string; scrapers: string[] }> {
    await this.schedulerService.triggerAllScrapers('http-api');
    return { status: 'accepted', trigger: 'http-api', scrapers: ['deals', 'events'] };
  }

  @Post('deals')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger deal scraper immediately' })
  @ApiResponse({ status: 202, description: 'Deal scraper accepted for execution.' })
  async triggerDeals(): Promise<{ status: string; trigger: string; scrapers: string[] }> {
    await this.schedulerService.triggerDealsScraper('http-api');
    return { status: 'accepted', trigger: 'http-api', scrapers: ['deals'] };
  }

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger event scraper immediately' })
  @ApiResponse({ status: 202, description: 'Event scraper accepted for execution.' })
  async triggerEvents(): Promise<{ status: string; trigger: string; scrapers: string[] }> {
    await this.schedulerService.triggerEventsScraper('http-api');
    return { status: 'accepted', trigger: 'http-api', scrapers: ['events'] };
  }
}
