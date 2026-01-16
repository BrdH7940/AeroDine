export type ItemStatus = 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';

export class Category {
  id: number;
  restaurantId: number;
  name: string;
  image?: string;
  rank: number;
}

export class MenuItemImage {
  id: number;
  menuItemId: number;
  url: string;
  rank: number;
}

export class ModifierOption {
  id: number;
  groupId: number;
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
}

export class ModifierGroup {
  id: number;
  restaurantId: number;
  name: string;
  minSelection: number;
  maxSelection: number;
  options?: ModifierOption[];
}

export class MenuItem {
  id: number;
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MenuItemWithDetails {
  id: number;
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number;
  status: ItemStatus;
  category: Category;
  images: MenuItemImage[];
  modifierGroups: ModifierGroup[];
  createdAt: Date;
  updatedAt: Date;
}
