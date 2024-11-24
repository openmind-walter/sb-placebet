import { PlaceOrderDTO } from "src/order/dto/placeOrder ";


export enum SIDE {
  BACK = 'BACK',
  LAY = 'LAY'
}


export class PlaceBet {
  SELECTION_ID: Number;
  MARKET_ID: string;
  SPORT_ID: string;
  EVENT_ID: string;
  PERSISTENCE_TYPE: string;
  SIDE: string;
  SIZE: string;
  PRICE: string;
  HANDICAP: number;
  USER_ID: string;
  ORDER_TYPE: string;

  constructor(placeOrder: PlaceOrderDTO) {
    this.MARKET_ID = placeOrder.marketId;
    this.EVENT_ID = placeOrder.event_id;
    this.SELECTION_ID = Number(placeOrder.instruction.selectionId)
    this.SPORT_ID = placeOrder.sport_id;
    this.PRICE = placeOrder.instruction.limitOrder.price.toString()
    this.SIZE = placeOrder.instruction.limitOrder.size.toString()
    this.PERSISTENCE_TYPE = placeOrder.instruction.limitOrder.persistenceType
    this.SIDE = placeOrder.instruction.side
    this.HANDICAP = placeOrder.instruction.handicap;
    this.USER_ID = placeOrder.user_id;
    this.ORDER_TYPE = placeOrder.instruction.orderType;
  }
}

export enum SBType {
  BOOKMAKER = "BOOKMAKER",
  FANCY = "FANCY"
}