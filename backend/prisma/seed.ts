import {
    PrismaClient,
    UserRole,
    TableStatus,
    ItemStatus,
    OrderStatus,
    OrderItemStatus,
    PaymentMethod,
    PaymentStatus,
} from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// JWT configuration for table token generation
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-for-seeding'

/**
 * Generate a JWT token for table QR code
 */
function generateTableToken(tableId: number, restaurantId: number): string {
    const payload = { tableId, restaurantId }
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '365d',
    })
}

/**
 * Generate a random date within the last N days
 */
function randomDateInLastDays(days: number): Date {
    const now = new Date()
    const daysAgo = now.getTime() - days * 24 * 60 * 60 * 1000
    const randomTime = daysAgo + Math.random() * (now.getTime() - daysAgo)
    return new Date(randomTime)
}

/**
 * Generate a date with peak hour bias (11-13 or 18-20)
 */
function randomDateWithPeakHours(days: number): Date {
    const date = randomDateInLastDays(days)
    const hour = date.getHours()

    // 70% chance to be in peak hours
    if (Math.random() < 0.7) {
        const peakHours = [
            // Lunch peak: 11-13
            ...Array.from({ length: 3 }, (_, i) => 11 + i),
            // Dinner peak: 18-20
            ...Array.from({ length: 3 }, (_, i) => 18 + i),
        ]
        const randomPeakHour =
            peakHours[Math.floor(Math.random() * peakHours.length)]
        date.setHours(
            randomPeakHour,
            Math.floor(Math.random() * 60),
            Math.floor(Math.random() * 60)
        )
    }

    return date
}

/**
 * Generate a date with weekend bias (Friday/Saturday)
 */
function randomDateWithWeekendBias(days: number): Date {
    const date = randomDateWithPeakHours(days)
    const dayOfWeek = date.getDay() // 0 = Sunday, 5 = Friday, 6 = Saturday

    // 60% chance to be Friday or Saturday
    if (Math.random() < 0.6) {
        const weekendDays = [5, 6] // Friday, Saturday
        const targetDay =
            weekendDays[Math.floor(Math.random() * weekendDays.length)]
        const currentDay = date.getDay()
        const diff = targetDay - currentDay
        date.setDate(date.getDate() + diff)
    }

    return date
}

/**
 * Clean all existing data in the correct order
 */
async function cleanDatabase() {
    console.log('🧹 Cleaning existing data...')

    try {
        // Delete in order of dependencies (most dependent first)
        await prisma.orderItemModifier.deleteMany()
        console.log('  ✓ Deleted OrderItemModifiers')

        await prisma.review.deleteMany()
        console.log('  ✓ Deleted Reviews')

        await prisma.itemModifierGroup.deleteMany()
        console.log('  ✓ Deleted ItemModifierGroups')

        await prisma.payment.deleteMany()
        console.log('  ✓ Deleted Payments')

        await prisma.orderItem.deleteMany()
        console.log('  ✓ Deleted OrderItems')

        await prisma.order.deleteMany()
        console.log('  ✓ Deleted Orders')

        await prisma.menuItemImage.deleteMany()
        console.log('  ✓ Deleted MenuItemImages')

        await prisma.menuItem.deleteMany()
        console.log('  ✓ Deleted MenuItems')

        await prisma.modifierOption.deleteMany()
        console.log('  ✓ Deleted ModifierOptions')

        await prisma.modifierGroup.deleteMany()
        console.log('  ✓ Deleted ModifierGroups')

        await prisma.category.deleteMany()
        console.log('  ✓ Deleted Categories')

        await prisma.table.deleteMany()
        console.log('  ✓ Deleted Tables')

        await prisma.restaurant.deleteMany()
        console.log('  ✓ Deleted Restaurants')

        await prisma.user.deleteMany()
        console.log('  ✓ Deleted Users')

        console.log('✅ Database cleaned successfully!\n')
    } catch (error) {
        console.error('❌ Error cleaning database:', error)
        throw error
    }
}

/**
 * Seed database with initial data
 */
async function seedDatabase() {
    console.log('🌱 Seeding database...\n')

    try {
        // 1. Create Restaurant
        console.log('📦 Creating restaurant...')
        const restaurant = await prisma.restaurant.create({
            data: {
                name: 'AeroDine Signature',
                address: '123 Main Street, Ho Chi Minh City',
                isActive: true,
            },
        })
        console.log(
            `  ✓ Created restaurant: ${restaurant.name} (ID: ${restaurant.id})\n`
        )

        // 2. Create Users
        console.log('👥 Creating users...')
        const passwordHash = await bcrypt.hash('123456', 10)

        const admin = await prisma.user.create({
            data: {
                email: 'admin@aerodine.com',
                passwordHash,
                fullName: 'Admin User',
                role: UserRole.ADMIN,
            },
        })
        console.log(`  ✓ Created admin: ${admin.email}`)

        const waiter = await prisma.user.create({
            data: {
                email: 'waiter@aerodine.com',
                passwordHash,
                fullName: 'Waiter User',
                role: UserRole.WAITER,
            },
        })
        console.log(`  ✓ Created waiter: ${waiter.email}`)

        const kitchen = await prisma.user.create({
            data: {
                email: 'kitchen@aerodine.com',
                passwordHash,
                fullName: 'Kitchen Staff',
                role: UserRole.KITCHEN,
            },
        })
        console.log(`  ✓ Created kitchen: ${kitchen.email}`)

        const customer = await prisma.user.create({
            data: {
                email: 'customer@gmail.com',
                passwordHash,
                fullName: 'Customer User',
                role: UserRole.CUSTOMER,
            },
        })
        console.log(`  ✓ Created customer: ${customer.email}\n`)

        // 3. Create Tables
        console.log('🪑 Creating tables...')
        const tables: Array<{
            id: number
            name: string
            capacity: number
            status: TableStatus
            token: string
            restaurantId: number
            isActive: boolean
        }> = []
        for (let i = 1; i <= 10; i++) {
            const table = await prisma.table.create({
                data: {
                    restaurantId: restaurant.id,
                    name: `Table ${i}`,
                    capacity: i <= 5 ? 4 : 6,
                    status: TableStatus.AVAILABLE,
                    token: `mock-token-table-${i}`, // Simple mock token
                    isActive: true,
                },
            })
            tables.push(table)
            console.log(`  ✓ Created ${table.name} (Token: ${table.token})`)
        }
        console.log(`  ✓ Created ${tables.length} tables\n`)

        // 4. Create Categories
        console.log('📋 Creating categories...')
        const categories: Array<{
            id: number
            name: string
            restaurantId: number
            image: string | null
            rank: number
        }> = []
        const categoryData = [
            { name: 'Starters', rank: 1 },
            { name: 'Mains', rank: 2 },
            { name: 'Drinks', rank: 3 },
            { name: 'Desserts', rank: 4 },
        ]

        for (const catData of categoryData) {
            const category = await prisma.category.create({
                data: {
                    restaurantId: restaurant.id,
                    name: catData.name,
                    rank: catData.rank,
                },
            })
            categories.push(category)
            console.log(`  ✓ Created category: ${category.name}`)
        }
        console.log('')

        // 5. Create Modifier Groups
        console.log('🔧 Creating modifier groups...')
        const steakDonenessGroup = await prisma.modifierGroup.create({
            data: {
                restaurantId: restaurant.id,
                name: 'Steak Doneness',
                minSelection: 1,
                maxSelection: 1,
            },
        })
        console.log(`  ✓ Created modifier group: ${steakDonenessGroup.name}`)

        const drinkSizeGroup = await prisma.modifierGroup.create({
            data: {
                restaurantId: restaurant.id,
                name: 'Drink Size',
                minSelection: 1,
                maxSelection: 1,
            },
        })
        console.log(`  ✓ Created modifier group: ${drinkSizeGroup.name}\n`)

        // 6. Create Modifier Options
        console.log('⚙️  Creating modifier options...')
        const steakOptions = [
            { name: 'Rare', priceAdjustment: 0 },
            { name: 'Medium', priceAdjustment: 0 },
            { name: 'Well-done', priceAdjustment: 0 },
        ]

        const steakOptionIds: number[] = []
        for (const option of steakOptions) {
            const created = await prisma.modifierOption.create({
                data: {
                    groupId: steakDonenessGroup.id,
                    name: option.name,
                    priceAdjustment: option.priceAdjustment,
                },
            })
            steakOptionIds.push(created.id)
            console.log(`  ✓ Created option: ${option.name} (Steak Doneness)`)
        }

        const drinkOptions = [
            { name: 'Regular', priceAdjustment: 0 },
            { name: 'Large', priceAdjustment: 10000 }, // +10,000 VND
        ]

        const drinkOptionIds: number[] = []
        for (const option of drinkOptions) {
            const created = await prisma.modifierOption.create({
                data: {
                    groupId: drinkSizeGroup.id,
                    name: option.name,
                    priceAdjustment: option.priceAdjustment,
                },
            })
            drinkOptionIds.push(created.id)
            console.log(`  ✓ Created option: ${option.name} (Drink Size)`)
        }
        console.log('')

        // 7. Create Menu Items (~20 items)
        console.log('🍽️  Creating menu items...')
        const startersCategory = categories.find((c) => c.name === 'Starters')!
        const mainsCategory = categories.find((c) => c.name === 'Mains')!
        const drinksCategory = categories.find((c) => c.name === 'Drinks')!
        const dessertsCategory = categories.find((c) => c.name === 'Desserts')!

        const menuItemsData = [
            // Starters (5 items)
            {
                name: 'Spring Rolls',
                description:
                    'Fresh Vietnamese spring rolls with shrimp and vegetables',
                price: 45000,
                categoryId: startersCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Crispy Wontons',
                description: 'Deep-fried wontons with pork filling',
                price: 55000,
                categoryId: startersCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Beef Salad',
                description: 'Marinated beef with fresh greens and herbs',
                price: 75000,
                categoryId: startersCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Chicken Wings',
                description: 'Spicy buffalo wings with blue cheese dip',
                price: 65000,
                categoryId: startersCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Caesar Salad',
                description: 'Fresh romaine lettuce with Caesar dressing',
                price: 70000,
                categoryId: startersCategory.id,
                modifierGroupIds: [],
            },
            // Mains (10 items) - Include Grilled Salmon (popular) and Wagyu Steak (expensive)
            {
                name: 'Grilled Salmon',
                description: 'Fresh Atlantic salmon grilled to perfection',
                price: 120000, // Low price, high volume
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Wagyu Steak',
                description: 'Premium A5 Wagyu beef, perfectly marbled',
                price: 850000, // Expensive, high margin
                categoryId: mainsCategory.id,
                modifierGroupIds: [steakDonenessGroup.id],
            },
            {
                name: 'Pho Bo',
                description: 'Traditional Vietnamese beef noodle soup',
                price: 85000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Grilled Ribeye Steak',
                description: 'Premium ribeye steak, grilled to perfection',
                price: 250000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [steakDonenessGroup.id],
            },
            {
                name: 'Chicken Curry',
                description: 'Creamy coconut curry with tender chicken',
                price: 120000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Seafood Fried Rice',
                description: 'Wok-fried rice with mixed seafood',
                price: 95000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Beef Noodles',
                description: 'Vietnamese beef noodle soup',
                price: 80000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Pork Chops',
                description: 'Grilled pork chops with herbs',
                price: 110000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Pad Thai',
                description: 'Classic Thai stir-fried noodles',
                price: 90000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Beef Burger',
                description: 'Classic beef burger with fries',
                price: 130000,
                categoryId: mainsCategory.id,
                modifierGroupIds: [],
            },
            // Drinks (4 items) - Include Coke (popular)
            {
                name: 'Coke',
                description: 'Classic Coca-Cola',
                price: 25000, // Low price, high volume
                categoryId: drinksCategory.id,
                modifierGroupIds: [drinkSizeGroup.id],
            },
            {
                name: 'Fresh Orange Juice',
                description: 'Freshly squeezed orange juice',
                price: 45000,
                categoryId: drinksCategory.id,
                modifierGroupIds: [drinkSizeGroup.id],
            },
            {
                name: 'Vietnamese Iced Coffee',
                description:
                    'Traditional Vietnamese coffee with condensed milk',
                price: 35000,
                categoryId: drinksCategory.id,
                modifierGroupIds: [drinkSizeGroup.id],
            },
            {
                name: 'Lemonade',
                description: 'Fresh lemonade with mint',
                price: 30000,
                categoryId: drinksCategory.id,
                modifierGroupIds: [drinkSizeGroup.id],
            },
            // Desserts (3 items)
            {
                name: 'Chocolate Cake',
                description: 'Rich chocolate layer cake',
                price: 65000,
                categoryId: dessertsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Ice Cream',
                description: 'Vanilla ice cream with toppings',
                price: 40000,
                categoryId: dessertsCategory.id,
                modifierGroupIds: [],
            },
            {
                name: 'Tiramisu',
                description: 'Classic Italian tiramisu',
                price: 75000,
                categoryId: dessertsCategory.id,
                modifierGroupIds: [],
            },
        ]

        const menuItems: Array<{
            id: number
            name: string
            basePrice: any
            categoryId: number
            restaurantId: number
            description: string | null
            status: ItemStatus
            createdAt: Date
            updatedAt: Date
        }> = []
        for (const itemData of menuItemsData) {
            const menuItem = await prisma.menuItem.create({
                data: {
                    restaurantId: restaurant.id,
                    categoryId: itemData.categoryId,
                    name: itemData.name,
                    description: itemData.description,
                    basePrice: itemData.price,
                    status: ItemStatus.AVAILABLE,
                    modifierGroups:
                        itemData.modifierGroupIds.length > 0
                            ? {
                                  createMany: {
                                      data: itemData.modifierGroupIds.map(
                                          (groupId) => ({
                                              groupId,
                                          })
                                      ),
                                  },
                              }
                            : undefined,
                },
            })
            menuItems.push(menuItem)
            console.log(
                `  ✓ Created: ${menuItem.name} (${itemData.price.toLocaleString()} VND)`
            )
        }
        console.log(`  ✓ Created ${menuItems.length} menu items\n`)

        // 8. Create Historical Orders (100+ orders over last 30 days)
        console.log(
            '📊 Creating historical orders (100+ orders over last 30 days)...'
        )
        const historicalOrderCount = 120
        const grilledSalmon = menuItems.find(
            (m) => m.name === 'Grilled Salmon'
        )!
        const coke = menuItems.find((m) => m.name === 'Coke')!
        const wagyuSteak = menuItems.find((m) => m.name === 'Wagyu Steak')!

        let createdHistoricalOrders = 0
        const batchSize = 20

        for (let i = 0; i < historicalOrderCount; i += batchSize) {
            const batch: any[] = []
            const batchEnd = Math.min(i + batchSize, historicalOrderCount)

            for (let j = i; j < batchEnd; j++) {
                const orderDate = randomDateWithWeekendBias(30)
                const randomTable =
                    tables[Math.floor(Math.random() * tables.length)]
                const randomCustomer = Math.random() < 0.3 ? customer : null // 30% chance to have customer
                const randomWaiter = Math.random() < 0.8 ? waiter : null // 80% chance to have waiter

                // Create order items - make Grilled Salmon and Coke popular
                const orderItems: Array<{
                    menuItemId: number
                    name: string
                    quantity: number
                    pricePerUnit: number
                    status: OrderItemStatus
                    modifiers: {
                        create: Array<{
                            modifierName: string
                            modifierOptionId: number
                            priceAdjustment: number
                        }>
                    }
                }> = []
                const itemCount = Math.floor(Math.random() * 3) + 1 // 1-3 items per order

                for (let k = 0; k < itemCount; k++) {
                    let selectedItem
                    const rand = Math.random()

                    // 40% chance for Grilled Salmon, 30% chance for Coke, 30% other items
                    if (rand < 0.4) {
                        selectedItem = grilledSalmon
                    } else if (rand < 0.7) {
                        selectedItem = coke
                    } else {
                        selectedItem =
                            menuItems[
                                Math.floor(Math.random() * menuItems.length)
                            ]
                    }

                    const quantity =
                        selectedItem === grilledSalmon || selectedItem === coke
                            ? Math.floor(Math.random() * 3) + 2 // 2-4 for popular items
                            : Math.floor(Math.random() * 2) + 1 // 1-2 for others

                    let pricePerUnit = Number(selectedItem.basePrice)
                    const modifiers: Array<{
                        modifierName: string
                        modifierOptionId: number
                        priceAdjustment: number
                    }> = []

                    // Add modifiers if applicable
                    if (
                        selectedItem.name === 'Wagyu Steak' ||
                        selectedItem.name === 'Grilled Ribeye Steak'
                    ) {
                        const donenessOption =
                            steakOptions[
                                Math.floor(Math.random() * steakOptions.length)
                            ]
                        modifiers.push({
                            modifierName: 'Steak Doneness',
                            modifierOptionId:
                                steakOptionIds[
                                    steakOptions.indexOf(donenessOption)
                                ],
                            priceAdjustment: 0,
                        })
                    }

                    if (
                        selectedItem.name === 'Coke' ||
                        selectedItem.name === 'Fresh Orange Juice' ||
                        selectedItem.name === 'Vietnamese Iced Coffee' ||
                        selectedItem.name === 'Lemonade'
                    ) {
                        const sizeOption =
                            drinkOptions[Math.random() < 0.6 ? 1 : 0] // 60% Large
                        const optionIndex = drinkOptions.indexOf(sizeOption)
                        modifiers.push({
                            modifierName: 'Drink Size',
                            modifierOptionId: drinkOptionIds[optionIndex],
                            priceAdjustment: sizeOption.priceAdjustment,
                        })
                        pricePerUnit += sizeOption.priceAdjustment
                    }

                    orderItems.push({
                        menuItemId: selectedItem.id,
                        name: selectedItem.name,
                        quantity,
                        pricePerUnit,
                        status: OrderItemStatus.SERVED,
                        modifiers: {
                            create: modifiers,
                        },
                    })
                }

                // Calculate total amount
                const totalAmount = orderItems.reduce(
                    (sum, item) =>
                        sum + Number(item.pricePerUnit) * item.quantity,
                    0
                )

                batch.push({
                    restaurantId: restaurant.id,
                    tableId: randomTable.id,
                    userId: randomCustomer?.id,
                    waiterId: randomWaiter?.id,
                    status: OrderStatus.COMPLETED,
                    totalAmount,
                    guestCount: Math.floor(Math.random() * 4) + 1,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    items: {
                        create: orderItems,
                    },
                    payment: {
                        create: {
                            amount: totalAmount,
                            method: [
                                PaymentMethod.CASH,
                                PaymentMethod.CARD,
                                PaymentMethod.QR_CODE,
                            ][Math.floor(Math.random() * 3)],
                            status: PaymentStatus.SUCCESS,
                        },
                    },
                })
            }

            // Use Promise.all for batch creation
            await Promise.all(
                batch.map((orderData) =>
                    prisma.order.create({ data: orderData })
                )
            )

            createdHistoricalOrders += batch.length
            console.log(
                `  ✓ Created ${createdHistoricalOrders}/${historicalOrderCount} historical orders...`
            )
        }
        console.log(
            `  ✓ Completed ${createdHistoricalOrders} historical orders\n`
        )

        // Create some orders for TODAY (for dashboard testing)
        console.log('📅 Creating orders for TODAY (for dashboard)...')
        const todayOrderCount = 15
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (let i = 0; i < todayOrderCount; i++) {
            const orderDate = new Date(today)
            // Random hour between 8 AM and 10 PM
            orderDate.setHours(
                8 + Math.floor(Math.random() * 14),
                Math.floor(Math.random() * 60),
                Math.floor(Math.random() * 60)
            )

            const randomTable =
                tables[Math.floor(Math.random() * tables.length)]
            const randomCustomer = Math.random() < 0.3 ? customer : null
            const randomWaiter = Math.random() < 0.8 ? waiter : null

            // Create order items - make Grilled Salmon and Coke popular
            const orderItems: Array<{
                menuItemId: number
                name: string
                quantity: number
                pricePerUnit: number
                status: OrderItemStatus
                modifiers: {
                    create: Array<{
                        modifierName: string
                        modifierOptionId: number
                        priceAdjustment: number
                    }>
                }
            }> = []
            const itemCount = Math.floor(Math.random() * 3) + 1

            for (let k = 0; k < itemCount; k++) {
                let selectedItem
                const rand = Math.random()

                if (rand < 0.4) {
                    selectedItem = grilledSalmon
                } else if (rand < 0.7) {
                    selectedItem = coke
                } else {
                    selectedItem =
                        menuItems[Math.floor(Math.random() * menuItems.length)]
                }

                const quantity =
                    selectedItem === grilledSalmon || selectedItem === coke
                        ? Math.floor(Math.random() * 3) + 2
                        : Math.floor(Math.random() * 2) + 1

                let pricePerUnit = Number(selectedItem.basePrice)
                const modifiers: Array<{
                    modifierName: string
                    modifierOptionId: number
                    priceAdjustment: number
                }> = []

                // Add modifiers if applicable
                if (
                    selectedItem.name === 'Wagyu Steak' ||
                    selectedItem.name === 'Grilled Ribeye Steak'
                ) {
                    const donenessOption =
                        steakOptions[
                            Math.floor(Math.random() * steakOptions.length)
                        ]
                    modifiers.push({
                        modifierName: 'Steak Doneness',
                        modifierOptionId:
                            steakOptionIds[
                                steakOptions.indexOf(donenessOption)
                            ],
                        priceAdjustment: 0,
                    })
                }

                if (
                    selectedItem.name === 'Coke' ||
                    selectedItem.name === 'Fresh Orange Juice' ||
                    selectedItem.name === 'Vietnamese Iced Coffee' ||
                    selectedItem.name === 'Lemonade'
                ) {
                    const sizeOption = drinkOptions[Math.random() < 0.6 ? 1 : 0]
                    const optionIndex = drinkOptions.indexOf(sizeOption)
                    modifiers.push({
                        modifierName: 'Drink Size',
                        modifierOptionId: drinkOptionIds[optionIndex],
                        priceAdjustment: sizeOption.priceAdjustment,
                    })
                    pricePerUnit += sizeOption.priceAdjustment
                }

                orderItems.push({
                    menuItemId: selectedItem.id,
                    name: selectedItem.name,
                    quantity,
                    pricePerUnit,
                    status: OrderItemStatus.SERVED,
                    modifiers: {
                        create: modifiers,
                    },
                })
            }

            const totalAmount = orderItems.reduce(
                (sum, item) => sum + Number(item.pricePerUnit) * item.quantity,
                0
            )

            await prisma.order.create({
                data: {
                    restaurantId: restaurant.id,
                    tableId: randomTable.id,
                    userId: randomCustomer?.id,
                    waiterId: randomWaiter?.id,
                    status: OrderStatus.COMPLETED,
                    totalAmount: totalAmount,
                    guestCount: Math.floor(Math.random() * 4) + 1,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    items: {
                        create: orderItems,
                    },
                    payment: {
                        create: {
                            amount: totalAmount,
                            method: [
                                PaymentMethod.CASH,
                                PaymentMethod.CARD,
                                PaymentMethod.QR_CODE,
                            ][Math.floor(Math.random() * 3)],
                            status: PaymentStatus.SUCCESS,
                        },
                    },
                },
            })
        }
        console.log(`  ✓ Created ${todayOrderCount} orders for TODAY\n`)

        // 9. Create Active Orders (10 recent orders)
        console.log('⚡ Creating active orders (10 recent orders)...')
        const activeOrdersData = [
            // 3 PENDING orders
            { status: OrderStatus.PENDING, count: 3 },
            // 3 IN_PROGRESS orders
            { status: OrderStatus.IN_PROGRESS, count: 3 },
            // 4 IN_PROGRESS orders with READY items (waiting for waiter)
            { status: OrderStatus.IN_PROGRESS, count: 4, itemsReady: true },
        ]

        let activeOrderIndex = 0
        for (const orderGroup of activeOrdersData) {
            for (let i = 0; i < orderGroup.count; i++) {
                const orderDate = new Date(
                    Date.now() - Math.random() * 30 * 60 * 1000
                ) // Last 30 minutes
                const randomTable =
                    tables[Math.floor(Math.random() * tables.length)]
                const itemsReady = (orderGroup as any).itemsReady === true
                const randomWaiter = itemsReady ? waiter : null

                // Create order items
                const orderItems: Array<{
                    menuItemId: number
                    name: string
                    quantity: number
                    pricePerUnit: number
                    status: OrderItemStatus
                    modifiers: {
                        create: Array<{
                            modifierName: string
                            modifierOptionId: number
                            priceAdjustment: number
                        }>
                    }
                }> = []
                const itemCount = Math.floor(Math.random() * 3) + 1

                for (let k = 0; k < itemCount; k++) {
                    const selectedItem =
                        menuItems[Math.floor(Math.random() * menuItems.length)]
                    const quantity = Math.floor(Math.random() * 2) + 1

                    let pricePerUnit = Number(selectedItem.basePrice)
                    const modifiers: Array<{
                        modifierName: string
                        modifierOptionId: number
                        priceAdjustment: number
                    }> = []

                    // Add modifiers if applicable
                    if (
                        selectedItem.name === 'Wagyu Steak' ||
                        selectedItem.name === 'Grilled Ribeye Steak'
                    ) {
                        const donenessOption =
                            steakOptions[
                                Math.floor(Math.random() * steakOptions.length)
                            ]
                        const modifier: {
                            modifierName: string
                            modifierOptionId: number
                            priceAdjustment: number
                        } = {
                            modifierName: 'Steak Doneness',
                            modifierOptionId:
                                steakOptionIds[
                                    steakOptions.indexOf(donenessOption)
                                ],
                            priceAdjustment: 0,
                        }
                        modifiers.push(modifier)
                    }

                    if (
                        selectedItem.name === 'Coke' ||
                        selectedItem.name === 'Fresh Orange Juice' ||
                        selectedItem.name === 'Vietnamese Iced Coffee' ||
                        selectedItem.name === 'Lemonade'
                    ) {
                        const sizeOption =
                            drinkOptions[Math.random() < 0.5 ? 1 : 0]
                        const optionIndex = drinkOptions.indexOf(sizeOption)
                        const modifier: {
                            modifierName: string
                            modifierOptionId: number
                            priceAdjustment: number
                        } = {
                            modifierName: 'Drink Size',
                            modifierOptionId: drinkOptionIds[optionIndex],
                            priceAdjustment: sizeOption.priceAdjustment,
                        }
                        modifiers.push(modifier)
                        pricePerUnit += sizeOption.priceAdjustment
                    }

                    // Determine item status based on order status
                    let itemStatus: OrderItemStatus = OrderItemStatus.QUEUED
                    if (itemsReady) {
                        // Items are ready, waiting for waiter
                        itemStatus = OrderItemStatus.READY
                    } else if (orderGroup.status === OrderStatus.IN_PROGRESS) {
                        itemStatus =
                            Math.random() < 0.5
                                ? OrderItemStatus.PREPARING
                                : OrderItemStatus.QUEUED
                    }

                    orderItems.push({
                        menuItemId: selectedItem.id,
                        name: selectedItem.name,
                        quantity,
                        pricePerUnit,
                        status: itemStatus,
                        modifiers: {
                            create: modifiers,
                        },
                    })
                }

                const totalAmount = orderItems.reduce(
                    (sum, item) =>
                        sum + Number(item.pricePerUnit) * item.quantity,
                    0
                )

                await prisma.order.create({
                    data: {
                        restaurantId: restaurant.id,
                        tableId: randomTable.id,
                        waiterId: randomWaiter?.id,
                        status: orderGroup.status,
                        totalAmount,
                        guestCount: Math.floor(Math.random() * 4) + 1,
                        createdAt: orderDate,
                        updatedAt: orderDate,
                        items: {
                            create: orderItems,
                        },
                    },
                })

                activeOrderIndex++
                console.log(
                    `  ✓ Created ${orderGroup.status} order #${activeOrderIndex}`
                )
            }
        }
        console.log(`  ✓ Created ${activeOrderIndex} active orders\n`)

        console.log(`\n✅ Seeding completed successfully!`)
        console.log(`\n📊 Summary:`)
        console.log(`   - 1 Restaurant: ${restaurant.name}`)
        console.log(`   - 4 Users (Admin, Waiter, Kitchen, Customer)`)
        console.log(`   - ${tables.length} Tables`)
        console.log(`   - ${categories.length} Categories`)
        console.log(`   - 2 Modifier Groups`)
        console.log(`   - ${menuItems.length} Menu Items`)
        console.log(
            `   - ${createdHistoricalOrders} Historical Orders (last 30 days) + ${todayOrderCount} orders for TODAY`
        )
        console.log(`   - ${activeOrderIndex} Active Orders (last 30 minutes)`)
        console.log(`\n🔐 Default credentials (password: 123456):`)
        console.log(`   Admin: admin@aerodine.com`)
        console.log(`   Waiter: waiter@aerodine.com`)
        console.log(`   Kitchen: kitchen@aerodine.com`)
        console.log(`   Customer: customer@gmail.com`)
    } catch (error) {
        console.error('\n❌ Error seeding database:', error)
        throw error
    }
}

/**
 * Main seed function
 */
async function main() {
    console.log('🚀 Starting database seed...\n')

    try {
        await cleanDatabase()
        await seedDatabase()
    } catch (error) {
        console.error('\n💥 Seed failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Run the seed
main().catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
})
