-- CreateEnum (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'CUSTOMER');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TableStatus') THEN
        CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ItemStatus') THEN
        CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'HIDDEN');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderItemStatus') THEN
        CREATE TYPE "OrderItemStatus" AS ENUM ('QUEUED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QR_CODE', 'CARD');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "restaurants" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tables" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "menu_items" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "menu_item_images" (
    "id" SERIAL NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_item_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "item_modifier_groups" (
    "item_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,

    CONSTRAINT "item_modifier_groups_pkey" PRIMARY KEY ("item_id","group_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "modifier_groups" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "min_selection" INTEGER NOT NULL DEFAULT 0,
    "max_selection" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "modifier_options" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price_adjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "orders" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "table_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "waiter_id" INTEGER,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_per_unit" DECIMAL(10,2) NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'QUEUED',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "id" SERIAL NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "modifier_option_id" INTEGER,
    "modifierName" TEXT NOT NULL,
    "price_adjustment" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tables_token_key" ON "tables"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "menu_items_restaurant_id_category_id_idx" ON "menu_items"("restaurant_id", "category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_restaurant_id_status_idx" ON "orders"("restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_id_key" ON "payments"("order_id");

-- AddForeignKey (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tables_restaurant_id_fkey') THEN
        ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_restaurant_id_fkey') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_restaurant_id_fkey') THEN
        ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_category_id_fkey') THEN
        ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_item_images_menu_item_id_fkey') THEN
        ALTER TABLE "menu_item_images" ADD CONSTRAINT "menu_item_images_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_modifier_groups_item_id_fkey') THEN
        ALTER TABLE "item_modifier_groups" ADD CONSTRAINT "item_modifier_groups_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_modifier_groups_group_id_fkey') THEN
        ALTER TABLE "item_modifier_groups" ADD CONSTRAINT "item_modifier_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifier_groups_restaurant_id_fkey') THEN
        ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifier_options_group_id_fkey') THEN
        ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_restaurant_id_fkey') THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_table_id_fkey') THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_fkey') THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_waiter_id_fkey') THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey') THEN
        ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_menu_item_id_fkey') THEN
        ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_modifiers_order_item_id_fkey') THEN
        ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_modifiers_modifier_option_id_fkey') THEN
        ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_option_id_fkey" FOREIGN KEY ("modifier_option_id") REFERENCES "modifier_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_order_id_fkey') THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_fkey') THEN
        ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_menu_item_id_fkey') THEN
        ALTER TABLE "reviews" ADD CONSTRAINT "reviews_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
