import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';


import { OrderService } from './services/order.service';

@Module({
  providers: [
    LoggerService,
    OrderService
  ],
  imports: [
    HttpModule
  ]
})
export class OrderModule { }
