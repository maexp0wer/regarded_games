CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE, -- Prevent duplicate emails at DB level
    wallet_address VARCHAR(42) UNIQUE,   -- Prevent duplicate wallets at DB level (Ethereum addresses are 42 chars)
    investment_amount NUMERIC(18, 2),     -- Example: Up to 1 quadrillion with 2 decimal places. Adjust as needed. NULLable.
    property_amount NUMERIC(18, 2),
    newsletter BOOLEAN DEFAULT FALSE,
    bounty_airdrop BOOLEAN DEFAULT FALSE,
    who_are_you VARCHAR(255) NOT NULL,    -- Will store dropdown value or "Other: specified text"
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add indexes for faster lookups if the table grows large
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_wallet_address ON contacts(wallet_address);

-- Constraint to ensure wallet address is provided if bounty is true (can also be handled purely in backend logic)
-- Note: Database-level conditional constraints can be complex. Handling this in the API layer is often simpler.
-- Example (might need adjustment based on specific PG version/syntax):
-- ALTER TABLE contacts ADD CONSTRAINT check_bounty_requires_wallet
-- CHECK ( bounty_airdrop = FALSE OR (bounty_airdrop = TRUE AND wallet_address IS NOT NULL) );
-- It's generally easier and more flexible to validate this in the API route handler before insertion.