/*
# Storage policies for clothes bucket

1. Overview
Allow authenticated users to upload, read, and delete their own clothing
photos in the public 'clothes' bucket. Files are stored under a path
prefixed with the user's id so ownership can be checked.

2. Security
- SELECT (read): public — bucket is public so images render in <img> tags.
- INSERT/UPDATE/DELETE: only the owner (path starts with auth.uid()).
*/

-- Allow public read
DROP POLICY IF EXISTS "public_read_clothes" ON storage.objects;
CREATE POLICY "public_read_clothes" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'clothes');

-- Allow authenticated users to insert into their own folder
DROP POLICY IF EXISTS "insert_own_clothes" ON storage.objects;
CREATE POLICY "insert_own_clothes" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'clothes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow owners to update their own files
DROP POLICY IF EXISTS "update_own_clothes" ON storage.objects;
CREATE POLICY "update_own_clothes" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'clothes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'clothes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow owners to delete their own files
DROP POLICY IF EXISTS "delete_own_clothes" ON storage.objects;
CREATE POLICY "delete_own_clothes" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'clothes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
