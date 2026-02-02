-- Debug script to check command status
-- Run this in your Supabase SQL editor or psql

-- Check recent user:add commands
SELECT
    id,
    type,
    status,
    payload,
    error,
    result,
    created_at,
    started_at,
    completed_at
FROM commands
WHERE type = 'user:add'
ORDER BY created_at DESC
LIMIT 5;

-- Check if any commands are stuck in 'running' state
SELECT
    id,
    type,
    status,
    created_at,
    started_at,
    AGE(NOW(), started_at) as running_duration
FROM commands
WHERE status = 'running'
ORDER BY created_at DESC;

-- Check recent vpn_users
SELECT
    id,
    username,
    status,
    config_raw IS NOT NULL as has_config,
    created_at,
    updated_at
FROM vpn_users
ORDER BY created_at DESC
LIMIT 5;
