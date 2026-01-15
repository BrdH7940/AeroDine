export class CreateMenuItemImageDto {
  url: string;
  rank?: number;
}

export class CreateMenuItemDto {
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number;
  status?: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';
  images?: CreateMenuItemImageDto[];
}

export class CreateCategoryDto {
  restaurantId: number;
  name: string;
  image?: string;
  rank?: number;
}

export class CreateModifierOptionDto {
  name: string;
  priceAdjustment?: number;
  isAvailable?: boolean;
}

export class CreateModifierGroupDto {
  restaurantId: number;
  name: string;
  minSelection?: number;
  maxSelection?: number;
  options?: CreateModifierOptionDto[];
}

export class UpdateModifierGroupDto {
  name?: string;
  minSelection?: number;
  maxSelection?: number;
  options?: CreateModifierOptionDto[];
}

export class CreateMenuItemDto {
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number;
  status?: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';
  images?: CreateMenuItemImageDto[];
  modifierGroupIds?: number[]; // IDs of modifier groups to assign to this item
}

export class CreateMenuDto extends CreateMenuItemDto {}
