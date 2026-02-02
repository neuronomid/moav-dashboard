-- Fix commands_status_check constraint issue
-- The status column uses an enum type (command_status), so any CHECK constraint is redundant
-- This migration removes any stale CHECK constraint on the status column

-- 1. Drop any existing status check constraint
ALTER TABLE public.commands DROP CONSTRAINT IF EXISTS commands_status_check;

-- 2. Ensure the command_status enum has all required values
-- Note: You cannot remove values from an enum, only add them
DO $$
BEGIN
  -- Add 'queued' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'queued' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'queued';
  END IF;

  -- Add 'succeeded' if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'succeeded' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'succeeded';
  END IF;
  
  -- Add 'running' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'running' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'running';
  END IF;
  
  -- Add 'failed' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'failed' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'failed';
  END IF;
  
  -- Add 'cancelled' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'cancelled';
  END IF;

  -- Legacy values for backwards compatibility
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = 'command_status'::regtype) THEN
    ALTER TYPE command_status ADD VALUE 'completed';
  END IF;
END $$;

-- 3. Update the default value to 'queued' (should already be set, but ensure it)
ALTER TABLE public.commands ALTER COLUMN status SET DEFAULT 'queued';
