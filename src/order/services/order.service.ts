import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { LoggerService } from 'src/common';
import { Placebet } from '../dto/placebet';
import axios from 'axios';
import { FancyMarket } from 'src/models/fancyMarket';
import { ConfigService } from '@nestjs/config';
import { BettingType, SIDE } from 'src/models/placeBet';
import { BookmakerMarket, BookmakerRunnerStaus } from 'src/models/bookmaker';


@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {

    private client: Client;
    constructor(private logger: LoggerService, private configService: ConfigService) {
    }
    async onModuleInit() {
        try {
            this.client = new Client({
                connectionString: process.env.POSTGRES_URL
            });
            await this.client.connect();

            this.client.on('notification', async (msg) => {
                console.log('DB place bet notification ', msg)
                const payloadObject = JSON.parse(msg?.payload) as Placebet;

                if (payloadObject.BETTING_TYPE == BettingType.FANCY)
                    await this.updateFancyPlaceOrder(payloadObject)
                else if (payloadObject.BETTING_TYPE == BettingType.BOOKMAKER)
                    await this.updateBookMakerPlaceOrder(payloadObject)
                else {
                    this.logger.error(` ON sb placebet database notification :  beeting type not handled ${JSON.stringify(payloadObject)} `, OrderService.name);

                }

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


    private async updateBookMakerPlaceOrder(createOrderDto: Placebet) {
        try {
            const market = (await axios.get(`${this.configService.get('SB_REST_SERVER_URL')}/sb/bm/event-bookmaker/${createOrderDto.EVENT_ID}/${createOrderDto.BOOKMAKER_ID}`))?.data?.data as BookmakerMarket;
            if (!market) return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market not found.");
            const selection = market.runners.find(runner => runner.selection_id == createOrderDto.SELECTION_ID);
            if (!selection) return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market's selection not found.");
            if (market.is_active != 1) return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market not active ");
            if (market.bet_allow != 1) return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market bet  not allowed ");
            if (selection.status != BookmakerRunnerStaus.ACTIVE)
                return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market selection not active");
            if (selection.back_price != createOrderDto.PRICE && createOrderDto.SIDE == SIDE.BACK)
                return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market, Cannot place bet: Betting not matched  No matching BACK price.");
            if (selection.lay_price != createOrderDto.PRICE && createOrderDto.SIDE == SIDE.LAY)
                return await this.updatePlaceBetError(createOrderDto.ID, "Book Maker market, Cannot place bet: Betting not matched  No matching LAY odds/size");
            return await this.updatePlaceBetPennding(createOrderDto.ID)
        } catch (error) {
            this.logger.error(`book maker place bet  validation and  update : ${error}`, OrderService.name);
        }
    }
    private async updateFancyPlaceOrder(createOrderDto: Placebet) {
        try {
            console.log(createOrderDto)
            const market = (await axios.get(`${this.configService.get('SB_REST_SERVER_URL')}/sb/fancy/event-market/${createOrderDto.EVENT_ID}/${createOrderDto.MARKET_ID}`))?.data?.data as FancyMarket;

            if (!market) return await this.updatePlaceBetError(createOrderDto.ID, "Fancy market not found.");

            if (!market.is_active) return await this.updatePlaceBetError(createOrderDto.ID, "Cannot place bet: Market is inactive or not in play.")

            if (market.bet_allow === 0) return await this.updatePlaceBetError(createOrderDto.ID, "Betting is not allowed on market")
            if (createOrderDto.SIDE === SIDE.BACK) {
                const match = market.b1 == createOrderDto.PRICE
                if (!match)
                    return await this.updatePlaceBetError(createOrderDto.ID, "Cannot place bet: Betting not matched  No matching BACK price.")
            }
            if (createOrderDto.SIDE === SIDE.LAY) {
                const match = market.l1 == createOrderDto.PRICE
                if (!match)
                    return await this.updatePlaceBetError(createOrderDto.ID, "Cannot place bet: Betting not matched  No matching LAY price.")
            }
            console.log(" passeddedd", createOrderDto.ID)
            return await this.updatePlaceBetPennding(createOrderDto.ID)
        }
        catch (error) {
            this.logger.error(`fancy place bet  validation and  update : ${error}`, OrderService.name);
        }
    }


    private async updatePlaceBetPennding(ID, BF_BET_ID = 1) {
        try {
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/sb_placebet/status/update_pending`,
                { ID, BF_BET_ID }))?.data;
            this.logger.info(`price match update pennding   of  place bet id:, ${ID} , ${respose?.result}`, OrderService.name);
            return respose;
        } catch (error) {
            this.logger.error(`Error update place bet pennding of  place bet id :${ID}, ${error.message}`, OrderService.name);
        }
    }


    private async updatePlaceBetError(ID, MESSAGE) {
        try {
            console.log(MESSAGE)
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/sb_placebet/status/update_error`,
                { ID, MESSAGE }))?.data;
            this.logger.info(` on update place Bet Error place bet id: ${ID}, ${respose?.result}`, OrderService.name);
            return respose;
        } catch (error) {
            this.logger.error(`Error update placeBet error of place bet id :${ID}, ${error.message}`, OrderService.name);
        }
    }
}







