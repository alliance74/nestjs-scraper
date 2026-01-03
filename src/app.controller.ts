import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('Root')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check message' })
  @ApiResponse({ status: 200, description: 'Plain text greeting / health status.' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Render HTML dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Defaults to 20, max 100 entries per list.' })
  @ApiResponse({ status: 200, description: 'HTML page summarizing latest deals and events.' })
  async getDashboard(@Query('limit') limit?: string): Promise<string> {
    const parsedLimit = Number(limit);
    const finalLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100) : 20;
    return this.appService.getDashboardHtml(finalLimit);
  }
}
