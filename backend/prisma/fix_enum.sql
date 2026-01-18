-- Fix: Add PENDING_REVIEW to OrderStatus enum if not exists
-- Run this directly in your database if migration didn't work

DO $$ 
BEGIN
    -- Check if PENDING_REVIEW already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PENDING_REVIEW' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
    ) THEN
        ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_REVIEW';
        RAISE NOTICE 'PENDING_REVIEW added to OrderStatus enum';
    ELSE
        RAISE NOTICE 'PENDING_REVIEW already exists in OrderStatus enum';
    END IF;
END $$;
