import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }
    return this.ordersService.handleStripeWebhook(signature, req.rawBody as Buffer);
  }

  @Post(':id/checkout')
  async createCheckoutSession(
    @Param('id') id: string,
    @Body() body: { successUrl: string; cancelUrl: string },
  ) {
    return this.ordersService.createCheckoutSession(+id, body.successUrl, body.cancelUrl);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
