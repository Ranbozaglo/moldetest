# 🚀 Deployment Guide - Mold Testing Houston

## Production URL
**Frontend**: https://mold-testing.netlify.app
**Backend**: https://moldetest.onrender.com

## 📋 Prerequisites

### 1. Backend Deployment
You need to deploy your Flask backend to a hosting service. Recommended options:
- **Railway** (recommended for Python apps)
- **Render** (free tier available)
- **Heroku** (paid)
- **DigitalOcean App Platform**

### 2. Environment Variables
Set these environment variables in your backend hosting platform:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://qtrypzzcjebvfcihiynt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwempjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8

# Backend Configuration
SECRET_KEY=your_secure_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 🔧 Backend Deployment Steps

### Option 1: Railway (Recommended)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Deploy Backend**:
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Set Environment Variables**:
   ```bash
   railway variables set VITE_SUPABASE_URL=https://qtrypzzcjebvfcihiynt.supabase.co
   railway variables set VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   railway variables set SECRET_KEY=your_secret_key
   ```

5. **Get your backend URL**:
   ```bash
   railway domain
   ```

### Option 2: Render

1. **Connect your GitHub repository**
2. **Create a new Web Service**
3. **Configure**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python simple_main.py`
   - **Environment**: Python 3.9+

4. **Set Environment Variables** in Render dashboard

## 🌐 Frontend Deployment

### Netlify (Already Configured)

The frontend is already configured for Netlify deployment with:
- ✅ **Build Command**: `npm run build`
- ✅ **Publish Directory**: `dist`
- ✅ **SPA Redirects**: Configured in `netlify.toml`
- ✅ **Security Headers**: Configured
- ✅ **Environment Variables**: Configured

### Update Backend URL

Once your backend is deployed, update the production backend URL:

1. **In `src/config/environment.js`**:
   ```javascript
   PRODUCTION: {
     BACKEND_URL: 'https://your-backend-domain.com/api', // Update this
     // ... other config
   }
   ```

2. **In `netlify.toml`**:
   ```toml
   [context.production.environment]
   VITE_API_BASE_URL = "https://your-backend-domain.com/api" # Update this
   ```

3. **In Netlify Dashboard**:
   - Go to Site Settings > Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-domain.com/api`

## 🔍 Testing Deployment

### 1. Health Check
```bash
curl https://moldetest.onrender.com/health
```

### 2. API Endpoints
```bash
# Test inspection endpoints
curl https://moldetest.onrender.com/api/inspection

# Test authentication
curl -X POST https://moldetest.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rotemiluz53@gmail.com","password":"admin123"}'
```

### 3. Frontend Integration
1. Visit https://mold-testing.netlify.app
2. Check browser console for environment info
3. Test login functionality
4. Test inspection creation

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure backend has CORS configured
   - Check that frontend URL is in allowed origins

2. **Environment Variables**:
   - Verify all environment variables are set
   - Check that Vite env vars are prefixed with `VITE_`

3. **Database Connection**:
   - Verify Supabase credentials
   - Check that tables exist in public schema

4. **Build Errors**:
   - Check Node.js version (should be 18+)
   - Verify all dependencies are installed

### Debug Commands

```bash
# Check environment
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check API configuration
curl http://localhost:5000/health
```

## 📊 Monitoring

### Backend Monitoring
- **Health Check**: `/health` endpoint
- **Logs**: Check hosting platform logs
- **Database**: Monitor Supabase dashboard

### Frontend Monitoring
- **Console Logs**: Check browser developer tools
- **Network Tab**: Monitor API calls
- **Environment Info**: Check console for environment detection

## 🔐 Security

### Production Checklist
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database credentials protected
- [ ] API rate limiting configured
- [ ] Security headers set

### Environment Variables Security
- Never commit `.env` files
- Use hosting platform's secure environment variable storage
- Rotate secrets regularly
- Use different secrets for dev/staging/prod

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify backend is running and accessible
3. Test API endpoints directly
4. Check environment variable configuration
5. Review deployment logs

---

**Production URL**: https://mold-testing.netlify.app
**Backend URL**: Update with your deployed backend URL
**Support**: Check logs and environment configuration 