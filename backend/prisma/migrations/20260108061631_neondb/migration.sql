/*
  Warnings:

  - You are about to drop the column `restaurant_id` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_restaurant_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "restaurant_id";
