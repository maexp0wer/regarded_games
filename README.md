# regarded games
A perfect-information strategy game, where collective action battles economic power for real-money stakes.



npm run dev

/indexer
pnpm dev

ponder dev --reset



Table for profiles:

CREATE TABLE player_profiles (
    address VARCHAR(42) PRIMARY KEY, -- The wallet address (0x...)
    name VARCHAR(255),
    image_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

User for table:
-- 1. Create the new user with a password
CREATE USER profile_manager WITH PASSWORD 'your_strong_password_here';

-- 2. Grant permission to connect to your specific database
GRANT CONNECT ON DATABASE your_database_name TO profile_manager;

-- 3. Grant usage on the public schema (where tables live)
GRANT USAGE ON SCHEMA public TO profile_manager;

-- 4. Grant ONLY the specific actions needed for the profile table
-- Note: We do NOT grant DELETE or TRUNCATE or DROP
GRANT SELECT, INSERT, UPDATE ON TABLE player_profiles TO profile_manager;