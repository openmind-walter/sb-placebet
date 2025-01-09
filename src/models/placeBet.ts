
export enum SIDE {
  BACK = 'BACK',
  LAY = 'LAY'
}


export class PlaceBet {
  ID: number;
  BF_ACCOUNT_ID: number;
  BF_ACCOUNT: string;
  BF_SIZE: number;
  PRICE: number;
  SELECTION_ID: number;
  MARKET_ID: string;
  SPORT_ID: string;
  EVENT_ID: string;
  SIDE: string;
  PERSISTENCE_TYPE: string;
  handicap: string;
  ORDER_TYPE: string;
  BETTING_TYPE: string;

}

export enum BettingType {
  BOOKMAKER = "ODDS",
  FANCY = "LINE"
}