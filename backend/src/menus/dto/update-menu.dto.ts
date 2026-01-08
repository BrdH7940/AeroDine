import { CreateMenuItemImageDto, CreateMenuItemDto } from './create-menu.dto';

export class UpdateMenuDto implements Partial<CreateMenuItemDto> {
  restaurantId?: number;
  categoryId?: number;
  name?: string;
  description?: string;
  basePrice?: number;
  status?: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN';
  images?: CreateMenuItemImageDto[];
}
