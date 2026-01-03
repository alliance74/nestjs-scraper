import { Injectable } from '@nestjs/common';
import { Prisma, Retailer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

interface LatestDealQuery {
  limit?: string;
  retailer?: string;
  since?: string;
}

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createDealDto: CreateDealDto) {
    return 'This action adds a new deal';
  }

  async findLatest(params: LatestDealQuery = {}) {
    const limit = this.parseLimit(params.limit);
    const retailer = this.parseRetailer(params.retailer);
    const since = this.parseDate(params.since);

    const where: Prisma.DealWhereInput = {
      ...(retailer ? { retailer } : {}),
      ...(since ? { scrapedAt: { gte: since } } : {}),
    };

    return this.prisma.deal.findMany({
      where,
      orderBy: [{ scrapedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} deal`;
  }

  update(id: number, updateDealDto: UpdateDealDto) {
    return `This action updates a #${id} deal`;
  }

  remove(id: number) {
    return `This action removes a #${id} deal`;
  }

  private parseLimit(value?: string): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(Math.floor(parsed), 1), 100);
    }

    return 20;
  }

  private parseRetailer(value?: string): Retailer | undefined {
    if (!value) {
      return undefined;
    }

    const key = value.toUpperCase().replace(/[^A-Z_]/g, '') as keyof typeof Retailer;
    return Retailer[key];
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
