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






Discourse:

Force settings via SQL:
cd ~/discourse
sudo ./launcher enter app
sudo -u postgres psql discourse

INSERT INTO site_settings (name, value, data_type, created_at, updated_at) 
VALUES ('discourse_connect_overrides_admin', 't', 1, now(), now())
ON CONFLICT (name) DO UPDATE SET value = 't';

INSERT INTO site_settings (name, value, data_type, created_at, updated_at) 
VALUES ('discourse_connect_overrides_moderator', 't', 1, now(), now())
ON CONFLICT (name) DO UPDATE SET value = 't';

INSERT INTO site_settings (name, value, data_type, created_at, updated_at) 
VALUES ('discourse_connect_overrides_username', 't', 1, now(), now())
ON CONFLICT (name) DO UPDATE SET value = 't';

INSERT INTO site_settings (name, value, data_type, created_at, updated_at) 
VALUES ('discourse_connect_overrides_email', 't', 1, now(), now())
ON CONFLICT (name) DO UPDATE SET value = 't';

INSERT INTO site_settings (name, value, data_type, created_at, updated_at) 
VALUES ('discourse_connect_overrides_name', 't', 1, now(), now())
ON CONFLICT (name) DO UPDATE SET value = 't';


\q
exit



clear database:

sudo -u discourse RAILS_ENV=production bundle exec rails runner "
  # 1. Find your master admin user ID so we don't delete it
  master_admin_email = 'admin@localhost.com'
  master_user = UserEmail.find_by(email: master_admin_email)&.user
  
  if master_user.nil?
    puts 'ERROR: Could not find the user with email admin@localhost.com'
    return
  end

  # 2. Loop through all users except the master admin and the system user
  User.where.not(id: [master_user.id, Discourse::SYSTEM_USER_ID]).each do |u|
    puts \"Wiping user: #{u.username} (ID: #{u.id})\"
    
    # Strip privileges so the destroyer isn't blocked
    u.admin = false
    u.moderator = false
    u.save
    
    begin
      # This deletes the user, their posts, and their SSO records (the wallet link)
      UserDestroyer.new(Discourse.system_user).destroy(u, delete_posts: true)
    rescue => e
      puts \"Failed to delete #{u.username}: #{e.message}\"
    end
  end
  puts '--- DATABASE PURGED: ONLY admin@localhost.com REMAINS ---'
"


delte singhleuser:

sudo -u discourse RAILS_ENV=production bundle exec rails runner "
  u = User.find_by_username('0x70997970c51812dc3a')
  if u
    u.admin = false
    u.moderator = false
    u.save
    UserDestroyer.new(Discourse.system_user).destroy(u, delete_posts: true)
    puts 'SUCCESS: user3 has been eliminated.'
  else
    puts 'User not found.'
  end
"


open rails console:
sudo -u discourse RAILS_ENV=production bundle exec rails c





Still Outstanding (deferred — require more design work)
S4 — Wallet signature verification on mutation endpoints (significant frontend+backend change)
S6 — Redis cache for faction sync (requires Redis setup)
S8 — Threshold sanity check vs on-chain total supply
C4 — Move pure functions from src/lib/ → src/utils/
C2 — TenantContext review (second global context)
