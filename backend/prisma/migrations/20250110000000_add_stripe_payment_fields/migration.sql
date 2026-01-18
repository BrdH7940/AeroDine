-- AlterEnum
-- Add E_WALLET to PaymentMethod enum if it doesn't exist
DO $$ BEGIN
    -- Check if PaymentMethod enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        -- Check if E_WALLET value already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'E_WALLET' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentMethod')
        ) THEN
            ALTER TYPE "PaymentMethod" ADD VALUE 'E_WALLET';
        END IF;
    END IF;
END $$;

-- AlterTable
-- Add external_transaction_id column if payments table exists
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "external_transaction_id" TEXT;
    END IF;
END $$;

