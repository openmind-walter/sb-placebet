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
                await this.updatePlaceOrder(payloadObject)

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

    private async updatePlaceOrder(createOrderDto: Placebet) {
        try {
            const market = (await axios.get(`${this.configService.get('SB_REST_URL')}/sb/fancy/event-market/${createOrderDto.EVENT_ID}`))?.data as FancyMarket;
            if (!market)
                await this.updatePlaceBetError(createOrderDto.ID, "Fancy event not found.")


            if (!market.is_active || market.in_play !== 1)
                await this.updatePlaceBetError(createOrderDto.ID, "Cannot place bet: Market is inactive or not in play.")



            if (market.bet_allow === 0) await this.updatePlaceBetError(createOrderDto.ID, "Betting is not allowed on market")
            if (createOrderDto.SIDE === SIDE.BACK) {
                const levels = [
                    { price: (market.b1), size: (market.bs1) },
                    { price: (market.b2), size: (market.bs2) },
                    { price: (market.b3), size: (market.bs3) }
                ];

                const match = levels.find(level => level.price === createOrderDto.PRICE && level.size >= createOrderDto.BF_SIZE);
                if (!match)
                    await this.updatePlaceBetError(createOrderDto.ID, "Cannot place bet: Betting not matched  No matching BACK odds/size.")

            }
            if (createOrderDto.SIDE === SIDE.LAY) {
                const levels = [
                    { price: (market.l1), size: (market.ls1) },
                    { price: (market.l2), size: (market.ls2) },
                    { price: (market.l3), size: (market.ls3) }
                ];

                const match = levels.find(level => level.price === createOrderDto.PRICE && level.size >= createOrderDto.BF_SIZE);
                if (!match)
                    await this.updatePlaceBetError(createOrderDto.ID, "Cannot place bet: Betting not matched  No matching BACK odds/size.")


                await this.updatePlaceBetPennding(createOrderDto.ID)
            }
        }
        catch (error) {
            this.logger.error(`fancy place bet  validation : ${error}`, OrderService.name);
        }
    }


    private async updatePlaceBetPennding(ID, BF_BET_ID = 0) {
        try {
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/bf_placebet/status/update_pending`,
                { ID, BF_BET_ID }))?.data;
            console.log('price match update pennding   of  place bet id:', ID, 'price', respose?.result)
        } catch (error) {
            this.logger.error(`Error update size mached  price of  place bet :${ID}, ${error.message}`, OrderService.name);
        }
    }


    private async updatePlaceBetError(ID, MESSAGE) {
        try {
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/bf_placebet/status/update_error`,
                { ID, MESSAGE }))?.data;
            console.log('price match update error  of  place bet id:', ID, 'price', respose?.result)
        } catch (error) {
            this.logger.error(`Error update size mached  price of  place bet :${ID}, ${error.message}`, OrderService.name);
        }
    }
}







