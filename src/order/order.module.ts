import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import { OrderService } from './services/order.service';
// import { SettlementService } from './services/settlement.service';

@Module({
  providers: [
    LoggerService,
    OrderService,
    // SettlementService
  ],
  imports: [
    HttpModule
  ]
})
export class OrderModule { }
