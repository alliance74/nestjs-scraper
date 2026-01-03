import { Injectable } from '@nestjs/common';
import { DealsService } from './deals/deals.service';
import { EventsService } from './events/events.service';

@Injectable()
export class AppService {
  constructor(
    private readonly dealsService: DealsService,
    private readonly eventsService: EventsService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getDashboardHtml(limit = 20): Promise<string> {
    const [deals, events] = await Promise.all([
      this.dealsService.findLatest({ limit: limit.toString() }),
      this.eventsService.findLatest({ limit: limit.toString() }),
    ]);

    const dealsRows = deals
      .map(
        (deal) => `
        <tr>
          <td>${escapeHtml(deal.title)}</td>
          <td>${deal.retailer}</td>
          <td>${formatValue(deal.salePrice)}</td>
          <td>${formatValue(deal.discountPercentage)}</td>
          <td>${deal.scrapedAt.toISOString()}</td>
          <td>${deal.productUrl ? `<a href="${deal.productUrl}">Link</a>` : ''}</td>
        </tr>`,
      )
      .join('') || '<tr><td colspan="6">No deals found</td></tr>';

    const eventsRows = events
      .map(
        (event) => `
        <tr>
          <td>${escapeHtml(event.title)}</td>
          <td>${escapeHtml(event.location ?? '')}</td>
          <td>${event.startDate.toISOString()}</td>
          <td>${event.endDate ? event.endDate.toISOString() : ''}</td>
          <td>${escapeHtml(event.category ?? '')}</td>
          <td>${event.sourceUrl ? `<a href="${event.sourceUrl}">Link</a>` : ''}</td>
        </tr>`,
      )
      .join('') || '<tr><td colspan="6">No events found</td></tr>';

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Deals & Events Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; background: #f7f7f7; color: #333; }
      h1, h2 { color: #222; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; background: #fff; }
      th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
      th { background: #f0f0f0; }
      a { color: #0070f3; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>Deals & Events Dashboard</h1>
    <section>
      <h2>Latest Deals</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Retailer</th>
            <th>Sale Price</th>
            <th>Discount %</th>
            <th>Scraped At</th>
            <th>Product</th>
          </tr>
        </thead>
        <tbody>${dealsRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Upcoming Events</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Location</th>
            <th>Start</th>
            <th>End</th>
            <th>Category</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${eventsRows}</tbody>
      </table>
    </section>
  </body>
</html>`;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && 'toString' in value) {
    return (value as { toString(): string }).toString();
  }

  return String(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
