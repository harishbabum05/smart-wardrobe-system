/*
# Dress Matcher Schema

1. Overview
This app lets users upload photos of their tops and bottoms, then suggests
an outfit based on the day's weather and occasion. It tracks which outfits
were worn each day so repeats are minimized, and lets users send a poll
to friends to vote on a suggested outfit.

2. New Tables
- `profiles` — extends auth.users with display info (name, age, favorite_color, gender, profession)
  - id (uuid, PK, references auth.users)
  - name (text)
  - age (int)
  - favorite_color (text)
  - gender (text) — 'male' | 'female' | 'other'
  - profession (text) — 'business' | 'student' | 'working professional'
  - created_at (timestamptz)
- `clothing_items` — uploaded garment photos
  - id (uuid, PK)
  - user_id (uuid, references auth.users, defaults to auth.uid())
  - category (text) — 'top' | 'bottom'
  - image_url (text) — public URL of stored image
  - created_at (timestamptz)
- `outfit_history` — analytics: one row per outfit worn per day
  - id (uuid, PK)
  - user_id (uuid, references auth.users, defaults to auth.uid())
  - top_id (uuid, references clothing_items)
  - bottom_id (uuid, references clothing_items)
  - weather (text)
  - occasion (text)
  - worn_date (date) — the day the outfit was worn
  - created_at (timestamptz)
- `polls` — a poll a user sends to friends about an outfit
  - id (uuid, PK)
  - user_id (uuid, references auth.users, defaults to auth.uid())
  - top_id (uuid, references clothing_items)
  - bottom_id (uuid, references clothing_items)
  - question (text)
  - created_at (timestamptz)
- `poll_votes` — a vote cast on a poll
  - id (uuid, PK)
  - poll_id (uuid, references polls, cascade delete)
  - voter_name (text)
  - vote (text) — 'love' | 'like' | 'no'
  - created_at (timestamptz)

3. Security
- RLS enabled on every table.
- profiles: owner-scoped CRUD (a user manages only their own profile row).
- clothing_items: owner-scoped CRUD.
- outfit_history: owner-scoped CRUD.
- polls: owner-scoped CRUD for the poll owner; votes are insertable/readable by anyone
  with the anon key so friends can vote without signing in.
- poll_votes: anyone (anon + authenticated) can insert and read votes.

4. Notes
- All owner columns default to auth.uid() so inserts that omit user_id succeed.
- poll_votes is intentionally public (no sign-in needed to vote) since friends
  receive a link and may not have accounts.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  age int,
  favorite_color text DEFAULT '',
  gender text DEFAULT '',
  profession text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- clothing_items
CREATE TABLE IF NOT EXISTS clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('top', 'bottom')),
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clothing" ON clothing_items;
CREATE POLICY "select_own_clothing" ON clothing_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clothing" ON clothing_items;
CREATE POLICY "insert_own_clothing" ON clothing_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clothing" ON clothing_items;
CREATE POLICY "update_own_clothing" ON clothing_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clothing" ON clothing_items;
CREATE POLICY "delete_own_clothing" ON clothing_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- outfit_history
CREATE TABLE IF NOT EXISTS outfit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  top_id uuid REFERENCES clothing_items(id) ON DELETE SET NULL,
  bottom_id uuid REFERENCES clothing_items(id) ON DELETE SET NULL,
  weather text DEFAULT '',
  occasion text DEFAULT '',
  worn_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outfit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_outfits" ON outfit_history;
CREATE POLICY "select_own_outfits" ON outfit_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_outfits" ON outfit_history;
CREATE POLICY "insert_own_outfits" ON outfit_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_outfits" ON outfit_history;
CREATE POLICY "update_own_outfits" ON outfit_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_outfits" ON outfit_history;
CREATE POLICY "delete_own_outfits" ON outfit_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- polls
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  top_id uuid REFERENCES clothing_items(id) ON DELETE SET NULL,
  bottom_id uuid REFERENCES clothing_items(id) ON DELETE SET NULL,
  question text NOT NULL DEFAULT 'Do you like this outfit?',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_polls" ON polls;
CREATE POLICY "select_own_polls" ON polls FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_polls" ON polls;
CREATE POLICY "insert_own_polls" ON polls FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_polls" ON polls;
CREATE POLICY "update_own_polls" ON polls FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_polls" ON polls;
CREATE POLICY "delete_own_polls" ON polls FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- poll_votes (public: friends can vote without an account)
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  voter_name text NOT NULL DEFAULT 'Anonymous',
  vote text NOT NULL CHECK (vote IN ('love', 'like', 'no')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_poll_votes" ON poll_votes;
CREATE POLICY "read_poll_votes" ON poll_votes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_poll_votes" ON poll_votes;
CREATE POLICY "insert_poll_votes" ON poll_votes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clothing_items_user ON clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_history_user_date ON outfit_history(user_id, worn_date);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
