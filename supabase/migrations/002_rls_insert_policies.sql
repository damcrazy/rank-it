-- Allow anyone to create boards (no auth required to start a list)
CREATE POLICY "boards_public_insert" ON boards
  FOR INSERT WITH CHECK (true);

-- Allow anyone to insert items (auth enforced at the API route level)
CREATE POLICY "items_public_insert" ON items
  FOR INSERT WITH CHECK (true);

-- Allow submissions insert from API route (service key bypasses RLS anyway,
-- but this covers any direct client paths)
CREATE POLICY "submissions_public_insert" ON submissions
  FOR INSERT WITH CHECK (true);
