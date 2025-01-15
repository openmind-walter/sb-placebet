import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import { OrderService } from './services/order.service';
import { CacheModule } from 'src/cache/cache.module';
// import { SettlementService } from './services/settlement.service';

@Module({
  providers: [
    LoggerService,
    OrderService,
    // SettlementService
  ],
  imports: [
    HttpModule,
    CacheModule,
  ]
})
export class OrderModule { }
