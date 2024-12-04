
import { Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BookmakerMarket, BookmakerRunnerStaus, BookmakerStaus } from 'src/models/bookmaker';
import { FancyMarket, MaraketStaus } from 'src/models/fancyMarket';
import { PlaceBet, SIDE } from 'src/models/placeBet';
import { generateGUID } from 'src/utlities';

@Injectable()
export class SettlementService implements OnModuleInit {

    constructor(
        private configService: ConfigService,
        private logger: LoggerService
    ) { }


    async onModuleInit() {

    }


    async settleSBPlacebet() {
        try {
            const response = await axios.get(`${this.configService.get("API_SERVER_URL")}/v1/api/bf_placebet/pending/sb`);
            const sbBets: Partial<PlaceBet>[] = response?.data?.result ?? [];
            const fancyBets = sbBets.filter(sbBet => sbBet.BETTING_TYPE == "LINE");
            const bookMakerBets = sbBets.filter(sbBet => sbBet.BETTING_TYPE == "ODDS");
            await Promise.all(fancyBets.map(fancyBet => this.fancyBetSettlement(fancyBet.EVENT_ID, fancyBet.MARKET_ID)))
            await Promise.all(bookMakerBets.map(fancyBet => this. bookMakerBetSettlement(fancyBet.EVENT_ID, fancyBet.MARKET_ID)))

        } catch (error) {
            console.log(error);
            this.logger.error(`Error on settle SB  Placebet: ${error.message}`, SettlementService.name);
        }

    }

    async fancyBetSettlement(eventId: string, marketId: string) {
        try {
            const market: FancyMarket = {} as FancyMarket
            if (market.status1 === MaraketStaus.REMOVED || market.status1 === MaraketStaus.CLOSED) {
                const response = await axios.get(`${this.configService.get("API_SERVER_URL")}/v1/api/bf_placebet/event_market_pending/${eventId}/${market.id}`);
                const bets: PlaceBet[] = response?.data?.result ?? [];

                for (const bet of bets) {
                    if (market.status1 === MaraketStaus.CLOSED) {
                        if (
                            (bet.SIDE === SIDE.BACK && market.result >= bet.PRICE) ||
                            (bet.SIDE === SIDE.LAY && market.result < bet.PRICE)
                        ) {
                            // win logic
                            await this.betSettlement(bet.ID, 1, bet.BF_SIZE)
                        } else {
                            // lost logic
                            await this.betSettlement(bet.ID, 0, bet.BF_SIZE)
                        }
                    } else {
                        // voided logic
                    }
                }
            }
            // clean market details  not   have  place betsss
        } catch (error) {
            console.log(error);
            this.logger.error(`Error on  check fancy bet settlement: ${error.message}`, SettlementService.name);
        }
    }





    async bookMakerBetSettlement(eventId: string, marketId: string) {
        try {
            const bookMaker = {} as BookmakerMarket;
            if (bookMaker.status == BookmakerStaus.OPEN) return
            const response = await axios.get(`${process.env.API_SERVER_URL}/v1/api/bf_placebet/event_market_pending/${eventId}/${bookMaker.bookmaker_id}`);
            const bets: PlaceBet[] = response?.data?.result ?? [];
            if (Array.isArray(bookMaker?.runners) && bets.length > 0) {

                for (const runner of bookMaker.runners) {
                    if (runner.status == BookmakerRunnerStaus.WINNER) {
                        const winerBets = bets.filter(p => p.SELECTION_ID == runner.selection_id && p.SIDE == SIDE.BACK);
                        await Promise.all(winerBets.map(bet => this.betSettlement(bet.ID, 1, runner.back_volume)));
                    }
                    if (runner.status == BookmakerRunnerStaus.LOSER) {
                        const LossBets = bets.filter(p => p.SELECTION_ID == runner.selection_id && p.SIDE == SIDE.LAY);
                        await Promise.all(LossBets.map(bet => this.betSettlement(bet.ID, 1, runner.back_volume)));
                    }

                    if (runner.status == BookmakerRunnerStaus.LOSER) {
                        const winBets = bets.filter(p => p.SELECTION_ID == runner.selection_id && p.SIDE == SIDE.BACK);
                        await Promise.all(winBets.map(bet => this.betSettlement(bet.ID, 0, runner.back_volume)));
                    }
                    if (runner.status == BookmakerRunnerStaus.WINNER) {
                        const lossBets = bets.filter(p => p.SELECTION_ID == runner.selection_id && p.SIDE == SIDE.LAY);
                        await Promise.all(lossBets.map(bet => this.betSettlement(bet.ID, 0, runner.back_volume)));
                    }

                    if (runner.status == BookmakerRunnerStaus.REMOVED) {
                        const voidBets = bets.filter(p => p.SELECTION_ID == runner.selection_id);
                        // handle  void
                    }



                }
            }
        } catch (error) {
            console.log(error);
            this.logger.error(`Error on  check book maker bet settlement: ${error.message}`, SettlementService.name);
        }
    }


    async betSettlement(BF_PLACEBET_ID: number, RESULT: 0 | 1, BF_SIZE: number) {
        try {
            const BF_BET_ID = generateGUID();
            const respose = (await axios.post(`${process.env.API_SERVER_URL}/v1/api/bf_settlement/fancy`, { BF_BET_ID, BF_PLACEBET_ID, RESULT, BF_SIZE }))?.data;
            if (!respose?.result)
                this.logger.error(`Error on  bet settlement: ${respose}`, SettlementService.name);
        } catch (error) {
            this.logger.error(`Error on book maker bet settlement: ${error.message}`, SettlementService.name);
        }
    }



}




// var betType = cricketFanciesTransaction.getCricketFanciesBetType();
// var price = cricketFanciesTransaction.getPrice();
// if (cricketFanciesResult.isVoidMarket()) {
//   cricketFanciesTransaction.setCricketFancyBetStatus(CricketFancyBetStatus.VOID);
// } else if ((betType.isYes() && cricketFanciesResult.getPriceResult() >= price)
//     || (betType.isNo() && cricketFanciesResult.getPriceResult() < price)) {
//   cricketFanciesTransaction.setCricketFancyBetStatus(CricketFancyBetStatus.WON);
// } else {
//   cricketFanciesTransaction.setCricketFancyBetStatus(CricketFancyBetStatus.LOST);
// }
// cricketFanciesTransaction.setSettledDate(new Date());
// var account =
//     accountRepository.getAccountById(cricketFanciesTransaction.getAccountId(), true);
// var placedTransaction = cricketFanciesTransaction.getAccountTransaction();
// if (placedTransaction == null) {
//   throw new WinLossCalculationException(
//       "Can't find the placed transaction for " + cricketFanciesTransaction);
// }