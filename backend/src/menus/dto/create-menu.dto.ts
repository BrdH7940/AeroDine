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

export class CreateMenuDto extends CreateMenuItemDto {}
