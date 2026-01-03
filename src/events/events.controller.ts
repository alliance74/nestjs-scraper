import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
@ApiTags('Events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an event (stub)', description: 'Stub endpoint returning placeholder text.' })
  @ApiResponse({ status: 201, description: 'Event creation stub response.' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Fetch upcoming events' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Defaults to 20, max 100.' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Optional category filter.' })
  @ApiQuery({
    name: 'since',
    required: false,
    type: String,
    description: 'ISO 8601 timestamp; defaults to now when omitted.',
  })
  @ApiResponse({ status: 200, description: 'Array of upcoming events ordered by startDate asc.' })
  findLatest(
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('since') since?: string,
  ) {
    return this.eventsService.findLatest({ limit, category, since });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch event by id (stub)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Stub response for event lookup.' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event by id (stub)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Stub response for event update.' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(+id, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event by id (stub)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Stub response for event deletion.' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(+id);
  }
}
