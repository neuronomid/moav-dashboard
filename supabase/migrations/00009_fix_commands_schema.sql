-- Fix commands table schema: rename columns to match code
-- This migration renames payload -> payload_json and result -> result_json
-- Also updates the command_status enum values

-- 1. Rename columns if they exist with old names
DO $$
BEGIN
  -- Check if old column names exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commands' AND column_name = 'payload'
  ) THEN
    ALTER TABLE public.commands RENAME COLUMN payload TO payload_json;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commands' AND column_name = 'result'
  ) THEN
    ALTER TABLE public.commands RENAME COLUMN result TO result_json;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commands' AND column_name = 'error'
  ) THEN
    ALTER TABLE public.commands DROP COLUMN error;
  END IF;
END $$;

-- 2. Update command_status enum to include 'queued' and 'succeeded'
-- First, check if we need to update the enum
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
END $$;

-- 3. Update existing rows that use old enum values
UPDATE public.commands SET status = 'queued' WHERE status = 'pending';
UPDATE public.commands SET status = 'succeeded' WHERE status = 'completed';

-- 4. Add server:health-check to the type check constraint
ALTER TABLE public.commands DROP CONSTRAINT IF EXISTS commands_type_check;
ALTER TABLE public.commands ADD CONSTRAINT commands_type_check CHECK (
  type IN (
    'service:start',
    'service:stop',
    'service:restart',
    'server:status',
    'server:logs',
    'server:export',
    'server:test',
    'server:health-check',
    'user:add',
    'user:revoke',
    'user:update-access',
    'user:update'
  )
);
