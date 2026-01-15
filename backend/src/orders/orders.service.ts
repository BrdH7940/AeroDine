import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import Stripe from 'stripe';

@Injectable()
export class OrdersService {
  private stripe: Stripe;

  constructor(
    @Inject('PrismaClient') private readonly prisma: any,
    private readonly configService: ConfigService,
  ) {
    // Try multiple ways to get the Stripe secret key
    const stripeSecretKey = 
      this.configService.get<string>('stripe.secretKey') ||
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY;
    
    // Validate that the key exists and is not empty
    if (stripeSecretKey && stripeSecretKey.trim().length > 0) {
      try {
        this.stripe = new Stripe(stripeSecretKey.trim(), {
          apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
        });
        console.log('Stripe client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Stripe client:', error);
      }
    } else {
      console.warn('STRIPE_SECRET_KEY is not set or is empty. Stripe features will be disabled.');
    }
  }

  async create(createOrderDto: CreateOrderDto) {
    const { tableId, restaurantId, guestCount = 1, note, items } = createOrderDto;

    // Validate table exists
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${tableId} not found`);
    }

    // Validate restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${restaurantId} not found`);
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      return sum + Number(item.pricePerUnit) * item.quantity;
    }, 0);

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        restaurantId,
        tableId,
        guestCount,
        note,
        totalAmount,
        status: 'PENDING',
        items: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            note: item.note,
            status: 'QUEUED',
            modifiers: item.modifiers && item.modifiers.length > 0
              ? {
                  create: item.modifiers.map((mod) => ({
                    modifierOptionId: mod.modifierOptionId,
                    modifierName: mod.modifierName,
                    priceAdjustment: mod.priceAdjustment,
                  })),
                }
              : undefined,
          })),
        },
        payment: {
          create: {
            amount: totalAmount,
            method: 'CARD',
            status: 'PENDING',
          },
        },
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payment: true,
        table: true,
        restaurant: true,
      },
    });

    return order;
  }

  async createCheckoutSession(orderId: number, successUrl: string, cancelUrl: string) {
    // Re-check Stripe configuration at runtime
    if (!this.stripe) {
      const stripeSecretKey = 
        this.configService.get<string>('stripe.secretKey') ||
        this.configService.get<string>('STRIPE_SECRET_KEY') ||
        process.env.STRIPE_SECRET_KEY;
      
      if (stripeSecretKey && stripeSecretKey.trim().length > 0) {
        try {
          this.stripe = new Stripe(stripeSecretKey.trim(), {
            apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
          });
        } catch (error) {
          console.error('Failed to initialize Stripe client:', error);
          throw new BadRequestException(
            `Stripe is not configured. Failed to initialize with provided key. ` +
            `Please verify STRIPE_SECRET_KEY in .env file and restart the server.`
          );
        }
      } else {
        throw new BadRequestException(
          'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables (.env file) and restart the server.'
        );
      }
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.payment?.status === 'SUCCESS') {
      throw new BadRequestException('Order has already been paid');
    }

    // Create Stripe checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: order.items.map((item: any) => ({
        price_data: {
          currency: 'vnd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(Number(item.pricePerUnit) * 100), // Convert to cents (VND)
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: orderId.toString(),
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async handleStripeWebhook(signature: string, body: Buffer) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = parseInt(session.metadata?.orderId || '0', 10);

      if (orderId) {
        await this.prisma.payment.update({
          where: { orderId },
          data: {
            status: 'SUCCESS',
          },
        });

        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'IN_PROGRESS',
          },
        });
      }
    }

    return { received: true };
  }

  findAll() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payment: true,
        table: true,
        restaurant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payment: true,
        table: true,
        restaurant: true,
        customer: true,
        waiter: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payment: true,
        table: true,
        restaurant: true,
      },
    });
  }

  async remove(id: number) {
    const order = await this.findOne(id);
    return this.prisma.order.delete({
      where: { id },
    });
  }
}
