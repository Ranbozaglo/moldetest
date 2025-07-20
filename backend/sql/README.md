# 🔢 Inspection Number Trigger

This directory contains PostgreSQL triggers and functions to automatically assign sequential inspection numbers to new records in the `public.inspection` table.

## 📁 Files

- `inspection_number_trigger.sql` - Basic trigger implementation
- `inspection_number_trigger_robust.sql` - Advanced version with concurrency handling
- `install_inspection_number_trigger.sql` - Simple installation script for Supabase

## 🚀 Quick Installation

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the Installation Script**
   ```sql
   -- Copy and paste the contents of install_inspection_number_trigger.sql
   -- This will create the functions and trigger
   ```

3. **Verify Installation**
   ```sql
   -- Test the trigger
   INSERT INTO public.inspection (full_name, email, status) 
   VALUES ('Test User', 'test@example.com', 'pending');
   
   -- Check the result
   SELECT * FROM public.inspection ORDER BY inspection_number DESC LIMIT 5;
   ```

### Option 2: Command Line

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the installation script
\i backend/sql/install_inspection_number_trigger.sql
```

## 🔧 How It Works

### Function: `get_next_inspection_number()`
- Finds the maximum `inspection_number` in the table
- Returns `max_number + 1`
- If no records exist, returns `1`

### Function: `assign_inspection_number()`
- Trigger function that runs BEFORE INSERT
- Checks if `inspection_number` is NULL or 0
- Automatically assigns the next sequential number

### Trigger: `trigger_assign_inspection_number`
- Fires BEFORE INSERT on the `inspection` table
- Calls `assign_inspection_number()` function

## 📊 Usage Examples

### Inserting New Inspections

```sql
-- The trigger will automatically assign inspection_number
INSERT INTO public.inspection (full_name, email, status) 
VALUES ('John Doe', 'john@example.com', 'pending');

-- Check the assigned number
SELECT inspection_number, full_name, email 
FROM public.inspection 
ORDER BY inspection_number DESC 
LIMIT 1;
```

### Manual Assignment (Override)

```sql
-- You can still manually assign inspection_number
INSERT INTO public.inspection (inspection_number, full_name, email, status) 
VALUES (999, 'Manual User', 'manual@example.com', 'pending');
```

### Checking Current Numbers

```sql
-- View all inspection numbers
SELECT inspection_number, full_name, created_at 
FROM public.inspection 
ORDER BY inspection_number;

-- Find the highest number
SELECT MAX(inspection_number) as max_inspection_number 
FROM public.inspection;
```

## 🛠️ Advanced Features (Robust Version)

The robust version (`inspection_number_trigger_robust.sql`) includes:

- **Concurrency Handling**: Uses advisory locks to prevent race conditions
- **Retry Logic**: Attempts up to 3 times if number generation fails
- **Error Handling**: Comprehensive error logging and fallback mechanisms
- **Unique Constraint**: Prevents duplicate inspection numbers
- **Performance Index**: Optimizes queries on inspection_number

## 🔍 Troubleshooting

### Common Issues

1. **Trigger Not Firing**
   ```sql
   -- Check if trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_assign_inspection_number';
   ```

2. **Duplicate Numbers**
   ```sql
   -- Check for duplicates
   SELECT inspection_number, COUNT(*) 
   FROM public.inspection 
   GROUP BY inspection_number 
   HAVING COUNT(*) > 1;
   ```

3. **Performance Issues**
   ```sql
   -- Check if index exists
   SELECT * FROM pg_indexes 
   WHERE tablename = 'inspection' 
   AND indexname = 'idx_inspection_number';
   ```

### Reset Sequence (if needed)

```sql
-- If you need to reset the numbering
UPDATE public.inspection 
SET inspection_number = NULL 
WHERE inspection_number > 1000;

-- Then insert new records to get new numbers
```

## 📈 Monitoring

### Check Trigger Status
```sql
-- View all triggers on inspection table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'inspection';
```

### Monitor Performance
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'inspection';
```

## 🔐 Security Notes

- The trigger functions run with the same permissions as the inserting user
- No additional permissions are required for basic functionality
- For production, consider adding appropriate grants if needed

## 📝 Migration Notes

### Existing Data
- The trigger only affects NEW inserts
- Existing records with NULL `inspection_number` will remain NULL
- To update existing records, run:

```sql
-- Update existing NULL inspection_numbers
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
    FROM public.inspection 
    WHERE inspection_number IS NULL
)
UPDATE public.inspection 
SET inspection_number = numbered.new_number
FROM numbered 
WHERE public.inspection.id = numbered.id;
```

---

**Status**: ✅ Ready for production use
**Compatibility**: PostgreSQL 12+ (Supabase compatible)
**Performance**: Optimized with indexes and efficient queries 