-- AlterEnum
-- Add PENDING_REVIEW to OrderStatus enum
-- Note: PostgreSQL doesn't support adding enum values in transactions with BEFORE/AFTER
-- We'll add it and it will appear at the end, but that's fine for our use case

DO $$ BEGIN
    -- Check if PENDING_REVIEW already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PENDING_REVIEW' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
    ) THEN
        ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_REVIEW';
    END IF;
END $$;
