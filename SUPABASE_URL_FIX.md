# Supabase URL Fix - Lab Analysis Upload Issue

## 🔧 Issue Fixed
Updated all hardcoded references from the old Supabase URL (`qtrypzzcjebvfcihiynt.supabase.co`) to your correct URL (`opjgytjlebfnhjzarvyy.supabase.co`).

## ✅ Files Updated
1. **src/config/environment.js** - Frontend environment configuration
2. **netlify.toml** - Deployment environment variables  
3. **src/pages/SamplingGuide.jsx** - Static image URLs

## 🔑 Required: Add Your Supabase Anon Key

I've updated the URLs but you need to add your correct Supabase anon key in two places:

### 1. Update netlify.toml
Replace `your_correct_anon_key_here` in `netlify.toml` with your actual anon key:

```toml
# Line 44 and 51 in netlify.toml
VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Your actual key
```

### 2. Update src/config/environment.js  
Replace `your_correct_anon_key_here` in `src/config/environment.js` with your actual anon key:

```javascript
// Lines 38 and 48 in src/config/environment.js
SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Your actual key
```

## 🔍 How to Get Your Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `opjgytjlebfnhjzarvyy`
3. Go to **Settings** → **API**
4. Copy the **anon/public** key (not the service_role key)

## 🗂️ Create lab-analysis Bucket

You may also need to create the `lab-analysis` bucket in your Supabase storage:

### Via Dashboard:
1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. Name: `lab-analysis`
4. Public: ✅ **Enabled**
5. File size limit: `10 MB`
6. Allowed MIME types: `image/*`

### Via SQL (Alternative):
```sql
-- Create the lab-analysis bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-analysis',
  'lab-analysis', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Set up RLS policies for the bucket
CREATE POLICY "Allow authenticated uploads to lab-analysis"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lab-analysis');

CREATE POLICY "Allow public read from lab-analysis"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lab-analysis');
```

## 🚀 Deploy Instructions

After adding your anon key:

```bash
git add .
git commit -m "Fix: Update Supabase URL and add correct anon key"
git push origin main
```

## 🧪 Test Lab Upload

Once deployed, test the lab analysis upload:

1. Go to any inspection
2. Click **"Upload Lab Analysis"**
3. Select an image file
4. Verify it uploads to: `https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/lab-analysis/...`

## ⚠️ Important Notes

- **Don't commit sensitive keys to git** - Use environment variables in production
- **Check bucket permissions** - Ensure authenticated users can upload
- **Verify CORS settings** - Allow your frontend domain in Supabase

The lab analysis OCR integration will now work with your correct Supabase instance! 🎯 