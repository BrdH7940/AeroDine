import {
    PrismaClient,
    UserRole,
    TableStatus,
    ItemStatus,
    Table,
    Category,
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
 * Clean all existing data in the correct order
 */
async function cleanDatabase() {
    console.log('🧹 Cleaning existing data...')

    // Delete in order of dependencies (most dependent first)
    // Note: Many models have onDelete: Cascade, but we'll be explicit for safety

    try {
        // 1. Delete items that don't cascade automatically
        await prisma.orderItemModifier.deleteMany()
        console.log('  ✓ Deleted OrderItemModifiers')

        await prisma.review.deleteMany()
        console.log('  ✓ Deleted Reviews')

        await prisma.itemModifierGroup.deleteMany()
        console.log('  ✓ Deleted ItemModifierGroups')

        // 2. These will cascade, but we delete explicitly for clarity
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
                name: 'AeroDine Prime',
                address: '123 Main Street, Ho Chi Minh City',
                isActive: true,
            },
        })
        console.log(`  ✓ Created restaurant: ${restaurant.name} (ID: ${restaurant.id})\n`)

        // 2. Create Users
        console.log('👥 Creating users...')
        const passwordHash = await bcrypt.hash('password123', 10)

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
        console.log(`  ✓ Created kitchen: ${kitchen.email}\n`)

        // 3. Create Tables
        console.log('🪑 Creating tables...')
        const tables: Table[] = []
        for (let i = 1; i <= 10; i++) {
            const table = await prisma.table.create({
                data: {
                    restaurantId: restaurant.id,
                    name: `Table ${i}`,
                    capacity: i <= 5 ? 4 : 6, // First 5 tables: 4 seats, rest: 6 seats
                    status: TableStatus.AVAILABLE,
                    token: '', // Temporary placeholder
                    isActive: true,
                },
            })

            // Generate and update token
            const token = await generateTableToken(table.id, restaurant.id)
            const updatedTable = await prisma.table.update({
                where: { id: table.id },
                data: { token },
            })

            tables.push(updatedTable)
            console.log(`  ✓ Created ${updatedTable.name} (ID: ${updatedTable.id})`)
        }
        console.log(`  ✓ Created ${tables.length} tables with QR tokens\n`)

        // 4. Create Categories
        console.log('📋 Creating categories...')
        const categories: Category[] = []
        const categoryData = [
            { name: 'Starters', rank: 1 },
            { name: 'Mains', rank: 2 },
            { name: 'Drinks', rank: 3 },
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

        for (const option of steakOptions) {
            await prisma.modifierOption.create({
                data: {
                    groupId: steakDonenessGroup.id,
                    name: option.name,
                    priceAdjustment: option.priceAdjustment,
                },
            })
            console.log(`  ✓ Created option: ${option.name} (Steak Doneness)`)
        }

        const drinkOptions = [
            { name: 'Regular', priceAdjustment: 0 },
            { name: 'Large', priceAdjustment: 10000 }, // +10,000 VND for large
        ]

        for (const option of drinkOptions) {
            await prisma.modifierOption.create({
                data: {
                    groupId: drinkSizeGroup.id,
                    name: option.name,
                    priceAdjustment: option.priceAdjustment,
                },
            })
            console.log(`  ✓ Created option: ${option.name} (Drink Size)`)
        }
        console.log('')

        // 7. Create Menu Items
        console.log('🍽️  Creating menu items...')
        // Define menu items after modifier groups are created
        const menuItems = [
            // Starters
            {
                name: 'Spring Rolls',
                description: 'Fresh Vietnamese spring rolls with shrimp and vegetables',
                price: 45000,
                categoryName: 'Starters',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [] as number[],
            },
            {
                name: 'Crispy Wontons',
                description: 'Deep-fried wontons with pork filling, served with sweet chili sauce',
                price: 55000,
                categoryName: 'Starters',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [] as number[],
            },
            {
                name: 'Beef Salad',
                description: 'Marinated beef with fresh greens, herbs, and Vietnamese dressing',
                price: 75000,
                categoryName: 'Starters',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [] as number[],
            },
            // Mains
            {
                name: 'Pho Bo',
                description: 'Traditional Vietnamese beef noodle soup with herbs',
                price: 85000,
                categoryName: 'Mains',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [steakDonenessGroup.id],
            },
            {
                name: 'Grilled Ribeye Steak',
                description: 'Premium ribeye steak, grilled to perfection, served with vegetables',
                price: 250000,
                categoryName: 'Mains',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [steakDonenessGroup.id],
            },
            {
                name: 'Chicken Curry',
                description: 'Creamy coconut curry with tender chicken and vegetables',
                price: 120000,
                categoryName: 'Mains',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [] as number[],
            },
            {
                name: 'Seafood Fried Rice',
                description: 'Wok-fried rice with mixed seafood, egg, and vegetables',
                price: 95000,
                categoryName: 'Mains',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [] as number[],
            },
            {
                name: 'Beef Noodles',
                description: 'Vietnamese beef noodle soup with tender beef slices',
                price: 80000,
                categoryName: 'Mains',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [] as number[],
            },
            // Drinks
            {
                name: 'Fresh Orange Juice',
                description: 'Freshly squeezed orange juice',
                price: 45000,
                categoryName: 'Drinks',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [drinkSizeGroup.id],
            },
            {
                name: 'Vietnamese Iced Coffee',
                description: 'Traditional Vietnamese coffee with condensed milk',
                price: 35000,
                categoryName: 'Drinks',
                status: ItemStatus.AVAILABLE as ItemStatus,
                modifierGroupIds: [drinkSizeGroup.id],
            },
        ]

        for (const itemData of menuItems) {
            const category = categories.find(
                (cat) => cat.name === itemData.categoryName
            )!

            const menuItem = await prisma.menuItem.create({
                data: {
                    restaurantId: restaurant.id,
                    categoryId: category.id,
                    name: itemData.name,
                    description: itemData.description,
                    basePrice: itemData.price,
                    status: itemData.status,
                    modifierGroups:
                        itemData.modifierGroupIds &&
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
            console.log(`  ✓ Created menu item: ${menuItem.name} (${itemData.price.toLocaleString()} VND)`)
        }

        console.log(`\n✅ Seeding completed successfully!`)
        console.log(`\n📊 Summary:`)
        console.log(`   - 1 Restaurant`)
        console.log(`   - 3 Users (Admin, Waiter, Kitchen)`)
        console.log(`   - ${tables.length} Tables`)
        console.log(`   - ${categories.length} Categories`)
        console.log(`   - 2 Modifier Groups`)
        console.log(`   - ${menuItems.length} Menu Items`)
        console.log(`\n🔐 Default credentials:`)
        console.log(`   Admin: admin@aerodine.com / password123`)
        console.log(`   Waiter: waiter@aerodine.com / password123`)
        console.log(`   Kitchen: kitchen@aerodine.com / password123`)
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
main()
    .catch((error) => {
        console.error('💥 Unhandled error:', error)
        process.exit(1)
    })
