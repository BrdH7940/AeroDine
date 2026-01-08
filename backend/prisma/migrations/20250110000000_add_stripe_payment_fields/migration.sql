-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'E_WALLET';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "external_transaction_id" TEXT;

