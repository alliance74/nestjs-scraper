import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('deals')
@UseGuards(ApiKeyGuard)
@ApiTags('Deals')
@ApiSecurity('api-key')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a deal (stub)', description: 'Stub endpoint returning placeholder text.' })
  @ApiResponse({ status: 201, description: 'Deal creation stub response.' })
  create(@Body() createDealDto: CreateDealDto) {
    return this.dealsService.create(createDealDto);
  }

  @Get()
  @ApiOperation({ summary: 'Fetch latest deals' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Defaults to 20, max 100.' })
  @ApiQuery({
    name: 'retailer',
    required: false,
    type: String,
    description:
      'Optional retailer filter. Accepts any value from the Retailer enum (e.g., LIDL, AB_VASSILOPOULOS).',
  })
  @ApiQuery({
    name: 'since',
    required: false,
    type: String,
    description: 'ISO 8601 timestamp; filters deals scraped after the given time.',
  })
  @ApiResponse({ status: 200, description: 'Array of deals ordered by scrapedAt desc.' })
  findLatest(
    @Query('limit') limit?: string,
    @Query('retailer') retailer?: string,
    @Query('since') since?: string,
  ) {
    return this.dealsService.findLatest({ limit, retailer, since });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch deal by id (stub)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Stub response for deal lookup.' })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deal by id (stub)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Stub response for deal update.' })
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(+id, updateDealDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deal by id (stub)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Stub response for deal deletion.' })
  remove(@Param('id') id: string) {
    return this.dealsService.remove(+id);
  }
}
