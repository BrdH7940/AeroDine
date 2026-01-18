/*
  Warnings:

  - You are about to drop the column `restaurant_id` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- Drop constraint only if it exists
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'users_restaurant_id_fkey'
        AND table_name = 'users'
    ) THEN
        ALTER TABLE "users" DROP CONSTRAINT "users_restaurant_id_fkey";
    END IF;
END $$;

-- AlterTable
-- Drop column only if it exists
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE "users" DROP COLUMN "restaurant_id";
    END IF;
END $$;
