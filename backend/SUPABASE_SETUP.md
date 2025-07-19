# Supabase Setup Guide

This guide will help you set up Supabase as the database for the Mold Testing Houston backend.

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Note down your project URL and anon key

## 2. Configure Environment Variables

1. Run the setup script:
   ```bash
   python setup_supabase.py
   ```

2. Edit the `.env` file in the backend directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   SECRET_KEY=your_secret_key_here
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

## 3. Create Database Tables in API Schema

In your Supabase dashboard, go to the SQL Editor and run these commands to create tables in the **api schema**:

### Users Table
```sql
CREATE TABLE api.users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Inspections Table
```sql
CREATE TABLE api.inspections (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES api.users(id),
    property_address TEXT,
    inspection_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Samples Table
```sql
CREATE TABLE api.samples (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT REFERENCES api.inspections(id),
    sample_type TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Important**: Make sure to create these tables in the **api schema** (which is the default schema in your Supabase project).

## 4. Install Dependencies

```bash
pip install -r requirements_simple.txt
```

## 5. Run the Backend

```bash
python simple_main.py
```

## 6. Test the Setup

1. Check health endpoint: `http://localhost:5000/health`
2. Try logging in with the default admin user:
   - Email: `rotemiluz53@gmail.com`
   - Password: `admin123`

## Troubleshooting

### Common Issues

1. **Import Error**: Make sure you've installed the requirements:
   ```bash
   pip install -r requirements_simple.txt
   ```

2. **Connection Error**: Check your Supabase URL and anon key in the `.env` file

3. **Table Not Found**: Make sure you've created the tables in the **api schema**

4. **Authentication Error**: The backend will create an admin user automatically on first run

5. **Schema Error**: Ensure tables are created in the **api schema**, not in a custom schema

### Database Schema

The backend expects these tables in the **api schema** with the following structure:

- **users**: User accounts with email, password hash, and admin status
- **inspections**: Mold inspection records linked to users
- **samples**: Sample records linked to inspections

All tables include `id`, `created_at` fields automatically managed by Supabase. 