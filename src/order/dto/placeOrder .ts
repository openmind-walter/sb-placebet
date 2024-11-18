


export class LimitOrderDto {
  size: number;
  price?: number;
  persistenceType?: string;
}

export class Instruction {

  selectionId: string;
  handicap: number;
  side: string;
  orderType: string;
  limitOrder: LimitOrderDto;
}

export class PlaceOrderDTO {

  marketId: string;
  event_id: string;
  sport_id: string;
  user_id: string;
  instruction: Instruction;


}
