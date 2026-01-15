export class CreateOrderItemDto {
  menuItemId: number;
  name: string;
  quantity: number;
  pricePerUnit: number;
  note?: string;
  modifiers?: {
    modifierOptionId?: number;
    modifierName: string;
    priceAdjustment: number;
  }[];
}

export class CreateOrderDto {
  tableId: number;
  restaurantId: number;
  guestCount?: number;
  note?: string;
  items: CreateOrderItemDto[];
}
