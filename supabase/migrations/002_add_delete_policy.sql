-- Add DELETE policy for tools table
CREATE POLICY "Allow public delete on tools" ON tools
  FOR DELETE USING (true);

