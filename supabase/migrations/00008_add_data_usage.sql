-- Add data usage tracking to vpn_users table
ALTER TABLE vpn_users
ADD COLUMN IF NOT EXISTS data_used_gb DECIMAL(10, 3) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN vpn_users.data_used_gb IS 'Current data usage in GB (updated by agent)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_vpn_users_data_limit ON vpn_users(data_limit_gb) WHERE data_limit_gb IS NOT NULL;
