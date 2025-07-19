# Backend Installation Guide

## Quick Setup

### Option 1: Automated Setup
```bash
cd backend
python setup.py
```

### Option 2: Manual Setup

#### 1. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### 2. Create Environment File
```bash
# Copy the template
cp env_template.txt .env

# Edit with your settings
nano .env  # or use your preferred editor
```

#### 3. Configure Database
```bash
# Create PostgreSQL database
createdb mold_testing_db

# Or use SQLite for development (update DATABASE_URL in .env)
# DATABASE_URL=sqlite:///./mold_testing.db
```

#### 4. Run the Application
```bash
python main.py
```

## Environment Configuration

Edit the `.env` file with your settings:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/mold_testing_db

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application Settings
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Troubleshooting

### ModuleNotFoundError: No module named 'sqlalchemy'
```bash
# Install dependencies
pip install -r requirements.txt

# Or install individually
pip install sqlalchemy fastapi uvicorn
```

### Database Connection Issues
```bash
# For PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb mold_testing_db

# For SQLite (easier for development)
# Update DATABASE_URL in .env to: sqlite:///./mold_testing.db
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
python main.py --port 8001
```

## Development

### Run with Auto-reload
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Run Tests
```bash
# When tests are implemented
pytest
```

### Database Migrations
```bash
# Tables are created automatically on first run
# For manual migrations, use Alembic (future enhancement)
```

## Production Deployment

### Using Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-production-secret-key
DEBUG=False
OPENAI_API_KEY=your-openai-key
```

## API Documentation

Once running, visit:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Support

For issues:
1. Check the logs for error details
2. Verify all dependencies are installed
3. Ensure database is accessible
4. Check environment variables are set correctly 