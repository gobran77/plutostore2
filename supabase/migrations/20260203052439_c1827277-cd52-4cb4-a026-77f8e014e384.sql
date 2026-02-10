-- Add image_url column to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view service images (public bucket)
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

-- Allow authenticated users (admins) to upload service images
CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-images');

-- Allow admins to update service images
CREATE POLICY "Admins can update service images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-images');

-- Allow admins to delete service images
CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-images');