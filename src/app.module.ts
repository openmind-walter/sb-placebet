import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { OrderModule } from './order/order.module';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), OrderModule],
  controllers: [
    AppController]
})
export class AppModule { }
