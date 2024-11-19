import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { LoggerService } from 'src/common';
import { Placebet } from '../dto/placebet';
import axios from 'axios';
import { FancyMarket } from 'src/models/fancyMarket';
import { ConfigService } from '@nestjs/config';
import { SIDE } from 'src/models/placeBet';


@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {

    private client: Client;
    constructor(private logger: LoggerService, private configService: ConfigService) {
    }
    async onModuleInit() {
        try {
            this.client = new Client({
                connectionString: process.env.DATABASE_URL
            });
            await this.client.connect();

            this.client.on('notification', async (msg) => {
                console.log('DB place bet notification ', msg)
                const payloadObject = JSON.parse(msg?.payload) as Placebet;
                const isValidPlaceBet = this.placeOrderValidation(payloadObject)

            });
            await this.client.query('LISTEN sb_placebet');

        } catch (err) {
            this.logger.error(` subscribe sb placebet database notification : can't connect  to database`, OrderService.name);
        }

    }

    async onModuleDestroy() {
        await this.client.end();
        console.log('Disconnected from PostgreSQL');
    }

    private async placeOrderValidation(createOrderDto: Placebet): Promise<Boolean> {
        try {
            const market = (await axios.get(`${this.configService.get('SB_REST_URL')}/sb/fancy/event-market/${createOrderDto.EVENT_ID}`))?.data as FancyMarket;
            if (!market) return false;
            if (!market.is_active || market.in_play !== 1) return false;
            if (market.bet_allow === 0) return false;
            if (createOrderDto.SIDE === SIDE.BACK) {
                const levels = [
                    { price: (market.b1), size: (market.bs1) },
                    { price: (market.b2), size: (market.bs2) },
                    { price: (market.b3), size: (market.bs3) }
                ];

                const match = levels.find(level => level.price === createOrderDto.PRICE && level.size >= createOrderDto.BF_SIZE);
                if (!match) {
                    throw new Error(`Cannot place bet: Betting not matched for ${market.name}. No matching BACK odds/size.`);
                }

            }
            if (createOrderDto.SIDE === SIDE.LAY) {
                const levels = [
                    { price: (market.l1), size: (market.ls1) },
                    { price: (market.l2), size: (market.ls2) },
                    { price: (market.l3), size: (market.ls3) }
                ];

                const match = levels.find(level => level.price === createOrderDto.PRICE && level.size >= createOrderDto.BF_SIZE);
                if (!match) return false;
                return true;
            }
        }
        catch (error) {
            this.logger.error(`fancy place bet  validation : ${error}`, OrderService.name);
        }
    }
}







