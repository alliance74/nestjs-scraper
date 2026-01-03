import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DealsModule } from './deals/deals.module';
import { EventsModule } from './events/events.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { APP_GUARD } from '@nestjs/core';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [DealsModule, EventsModule, SchedulerModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
