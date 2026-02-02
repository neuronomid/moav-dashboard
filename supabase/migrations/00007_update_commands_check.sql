DO $$ BEGIN
  ALTER TABLE public.commands DROP CONSTRAINT IF EXISTS commands_type_check;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

ALTER TABLE public.commands ADD CONSTRAINT commands_type_check CHECK (
  type IN (
    'service:start',
    'service:stop',
    'service:restart',
    'server:status',
    'server:logs',
    'server:export',
    'server:test',
    'user:add',
    'user:revoke',
    'user:update-access',
    'user:update'
  )
);
