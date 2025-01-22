import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { LoggerService } from 'src/common';
import axios from 'axios';
import { BettingType, Placebet } from 'src/models/placeBet';
import { BookmakerMarket } from 'src/models/bookmaker';
import { CacheService } from 'src/cache/cache.service';
import configuration from 'src/configuration';
import { CachedKeys } from 'src/common/cachedKeys';
import { FancyMarket, } from 'src/models';
import { generateGUID, isUpdatedWithinLast5Minutes } from 'src/utlities';

const { dragonflyClient, sbHashKey } = configuration;
@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {

    private client: Client;
    constructor(private logger: LoggerService, private readonly cacheService: CacheService) {
    }
    async onModuleInit() {
        try {
            this.client = new Client({
                connectionString: process.env.POSTGRES_URL
            });
            await this.client.connect();

            this.client.on('notification', async (msg) => {
                console.log('=====================================================================================')
                this.logger.info(`DB SB place bet notification, ${msg?.payload}`, OrderService.name);
                const payloadObject = JSON.parse(msg?.payload) as Placebet;

                if (payloadObject.BETTING_TYPE == BettingType.FANCY)
                    await this.updateFancyPlaceOrder(payloadObject)
                else if (payloadObject.BETTING_TYPE == BettingType.BOOKMAKER)
                    await this.updateBookMakerPlaceOrder(payloadObject)
                else {
                    this.logger.error(` on SB placebet database notification :  bet type not handled ${JSON.stringify(payloadObject)} `, OrderService.name);
                }
            });
            await this.client.query('LISTEN sb_placebet');

        } catch (err) {
            this.logger.error(` subscribe SB placebet database notification : can't connect to database`, OrderService.name);
        }

    }

    async onModuleDestroy() {
        await this.client.end();
        console.log('Disconnected from PostgreSQL');
    }


    private async updateBookMakerPlaceOrder(placebet: Placebet) {
        try {
            const field = CachedKeys.getBookMakerHashField(placebet.EVENT_ID, placebet.SERVICE_ID, placebet.PROVIDER_ID);
            const marketHash = await this.cacheService.hGet(dragonflyClient, sbHashKey, field)
            if (!marketHash) return await this.updatePlaceBetError(placebet.ID, "bookmaker market not found.");
            const market = JSON.parse(marketHash) as BookmakerMarket;
            if (!isUpdatedWithinLast5Minutes(market.updatedAt))
                return await this.updatePlaceBetError(placebet.ID, "bookmaker  market has not been updated within 5 minutes.");

            const selection = market.runners.find(runner => runner.selectionId == placebet.SELECTION_ID);
            if (!selection) return await this.updatePlaceBetError(placebet.ID, "bookmaker market selection not found.");
            if (market.betAllow == 0) return await this.updatePlaceBetError(placebet.ID, "bookmaker place bet bet not allowed ");
            // if (market.status != BookmakerStaus.OPEN) return await this.updatePlaceBetError(placebet.ID, `boomaker market not active ${market.status} `);

            // if (selection.status != BookmakerRunnerStaus.ACTIVE)
            //     return await this.updatePlaceBetError(placebet.ID, `bookmaker market selection not active, selection status: ${selection.status} `);
            // if (selection.backPrice != placebet.PRICE && placebet.SIDE == SIDE.BACK)
            //     return await this.updatePlaceBetError(placebet.ID, "bookmaker market, Cannot place bet: Betting not matched  not matched  baCK price.");
            // if (selection.layPrice != placebet.PRICE && placebet.SIDE == SIDE.LAY)
            //     return await this.updatePlaceBetError(placebet.ID, "bookbaker market, Cannot place bet: Betting not matched  not matched lay price");
            return await this.updatePlaceBetPennding(placebet.ID, placebet.PRICE, placebet.BF_SIZE)
        } catch (error) {
            this.logger.error(`book maker place bet  validation and  update : ${error}`, OrderService.name);
        }
    }
    private async updateFancyPlaceOrder(placebet: Placebet) {
        try {
            const field = CachedKeys.getFancyHashField(placebet.EVENT_ID, placebet.SERVICE_ID, placebet.PROVIDER_ID);
            const marketHash = await this.cacheService.hGet(dragonflyClient, sbHashKey, field);
            if (!marketHash)
                return await this.updatePlaceBetError(placebet.ID, "Fancy market not found.");

            const market = JSON.parse(marketHash) as FancyMarket;
            if (!isUpdatedWithinLast5Minutes(market.updatedAt))
                return await this.updatePlaceBetError(placebet.ID, "fancy market has not been updated within 5 minutes.");

            const selection = market.runners.find(runner => runner.selectionId == placebet.SELECTION_ID);
            if (!selection)
                return await this.updatePlaceBetError(placebet.ID, "Fancy market selection not found.");

            if (selection.betAllow == 0) {
                await this.updatePlaceBetError(placebet.ID, "Betting is not allowed.");
                return;
            }
            // if (selection.status == FancyRunnerStaus.ACTIVE)
            //     return await this.updatePlaceBetError(placebet.ID, `fancy market selection not active, it is on ${selection.status} `);
            // if (placebet.SIDE == SIDE.BACK) {
            //     const match = selection.priceYes == placebet.PRICE
            //     if (!match)
            //         return await this.updatePlaceBetError(
            //             placebet.ID,
            //             `Cannot place the bet: The betting price does not match for SIDE.LAY. Expected: ${selection.priceNo}, Received: ${placebet.PRICE}.`
            //         );
            // } else if (placebet.SIDE == SIDE.LAY) {
            //     const match = selection.priceNo == placebet.PRICE
            //     if (!match)
            //         return await this.updatePlaceBetError(placebet.ID,
            //             `Cannot place the bet: The betting price does not match. Expected: ${selection.priceNo}, Received: ${placebet.PRICE}.`)
            // }
            return await this.updatePlaceBetPennding(placebet.ID, placebet.PRICE, placebet.BF_SIZE)
        }
        catch (error) {
            this.logger.error(`fancy place bet  validation and  update : ${error}`, OrderService.name);
        }
    }


    private async updatePlaceBetPennding(ID, PRICE_MATCHED, SIZE_MATCHED) {
        try {
            const BF_BET_ID = generateGUID();
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/sb_placebet/status/update_pending`,
                { ID, BF_BET_ID, PRICE_MATCHED, SIZE_MATCHED }))?.data;
            this.logger.info(`update place bet to pennding, place bet id: ${ID} response , ${respose?.result}`, OrderService.name);
            return respose;
        } catch (error) {
            this.logger.error(`Error update place bet to pennding , place bet id :${ID}, ${error.message}`, OrderService.name);
        }
    }


    private async updatePlaceBetError(ID, MESSAGE) {
        try {
            this.logger.error(`${ID}, ${MESSAGE}`, OrderService.name);
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/sb_placebet/status/update_error`,
                { ID, MESSAGE }))?.data;
            this.logger.info(` on update place Bet Error response of place bet id: ${ID} response, ${respose?.result}`, OrderService.name);
            return respose;
        } catch (error) {
            this.logger.error(`Error on update placeBet error of place bet id :${ID}, ${error.message}`, OrderService.name);
        }
    }
}







