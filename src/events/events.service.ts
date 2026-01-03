import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

interface LatestEventQuery {
  limit?: string;
  category?: string;
  since?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createEventDto: CreateEventDto) {
    return 'This action adds a new event';
  }

  async findLatest(params: LatestEventQuery = {}) {
    const limit = this.parseLimit(params.limit);
    const category = params.category?.trim() || undefined;
    const since = this.parseDate(params.since) ?? new Date();

    return this.prisma.event.findMany({
      where: {
        ...(category ? { category } : {}),
        startDate: { gte: since },
      },
      orderBy: [{ startDate: 'asc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }

  private parseLimit(value?: string): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(Math.floor(parsed), 1), 100);
    }

    return 20;
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
