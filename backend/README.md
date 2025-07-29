# Mold Testing Houston Backend

A Flask-based backend for the Mold Testing Houston DIY Mold Test Kit application.

## Features

- **Flask** - Modern, fast web framework for building APIs
- **Supabase** - Database and authentication
- **Google Cloud Vision** - OCR for lab analysis
- **OpenAI GPT** - AI-powered analysis and recommendations
- **JWT Authentication** - Secure user authentication
- **CORS Support** - Cross-origin resource sharing
- **File Upload** - Image upload and processing
- **Email Service** - SMTP email notifications

## Tech Stack

- **Python 3.9+**
- **Flask** - Web framework
- **Supabase** - Database and auth
- **Google Cloud Vision** - OCR
- **OpenAI** - AI analysis
- **JWT** - Authentication
- **Gunicorn** - WSGI server

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env_example.txt .env
   # Edit .env with your configuration
   ```

5. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb mold_testing_db
   
   # Run migrations (tables will be created automatically)
   python main.py
   ```

## Configuration

Edit the `.env` file with your settings:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/mold_testing_db

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Running the Application

### Development
```bash
python main.py
```

### Production
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user info

### Inspections
- `GET /api/v1/inspections/` - List all inspections
- `POST /api/v1/inspections/` - Create new inspection
- `GET /api/v1/inspections/{id}` - Get inspection by ID
- `PUT /api/v1/inspections/{id}` - Update inspection
- `DELETE /api/v1/inspections/{id}` - Delete inspection
- `POST /api/v1/inspections/{id}/generate-summary` - Generate AI summary
- `POST /api/v1/inspections/{id}/send-email/{type}` - Send email notifications

### LLM Services
- `POST /api/v1/llm/invoke` - Invoke LLM with custom prompt
- `POST /api/v1/llm/generate-summary/{id}` - Generate inspection summary
- `POST /api/v1/llm/generate-recommendations/{id}` - Generate recommendations
- `POST /api/v1/llm/generate-email-content` - Generate email content

### Email Services
- `POST /api/v1/email/send` - Send custom email
- `POST /api/v1/email/send-lab-received/{id}` - Send lab received notification
- `POST /api/v1/email/send-report-ready/{id}` - Send report ready notification
- `POST /api/v1/email/send-review-request/{id}` - Send review request

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inspections Table
```sql
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    inspection_number INTEGER UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    full_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR,
    client_type VARCHAR NOT NULL,
    street_address VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    zip_code VARCHAR NOT NULL,
    square_footage FLOAT NOT NULL,
    status VARCHAR DEFAULT 'pending',
    has_visible_mold BOOLEAN DEFAULT FALSE,
    has_water_damage BOOLEAN DEFAULT FALSE,
    visible_mold_details TEXT, -- JSON string
    water_damage_details TEXT, -- JSON string
    temperature FLOAT,
    humidity FLOAT,
    client_status_detail VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Samples Table
```sql
CREATE TABLE samples (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES inspections(id),
    location VARCHAR NOT NULL,
    sample_type VARCHAR DEFAULT 'swab',
    status VARCHAR DEFAULT 'pending',
    results TEXT, -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## LLM Features

The backend integrates with OpenAI GPT-4 to provide:

1. **Inspection Summaries** - AI-generated summaries of inspection findings
2. **Recommendations** - Professional recommendations based on findings
3. **Email Content** - Automated email content generation
4. **Custom Prompts** - Flexible LLM invocation for various use cases

## Email Templates

The system includes pre-built email templates:

1. **Lab Received** - Notification when samples are received
2. **Report Ready** - Notification when report is available
3. **Review Request** - Request for customer review
4. **Inspection Summary** - Summary of inspection findings

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt password hashing
- **CORS Protection** - Configurable CORS settings
- **Input Validation** - Pydantic model validation
- **Error Handling** - Comprehensive error handling and logging

## Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   └── v1/
│   │       ├── api.py
│   │       └── endpoints/
│   │           ├── auth.py
│   │           ├── inspections.py
│   │           ├── llm.py
│   │           └── email.py
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   ├── schemas/
│   │   └── __init__.py
│   └── services/
│       ├── llm_service.py
│       └── email_service.py
├── main.py
├── requirements.txt
└── README.md
```

### Adding New Endpoints

1. Create endpoint file in `app/api/v1/endpoints/`
2. Define router and endpoints
3. Include router in `app/api/v1/api.py`
4. Add schemas in `app/schemas/__init__.py`

### Testing

```bash
# Run tests (when implemented)
pytest

# Test specific endpoint
curl -X GET "http://localhost:8000/api/v1/inspections/"
```

## Deployment

### Docker (Recommended)
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
OPENAI_API_KEY=your-openai-key
DEBUG=False
```

## Support

For questions or issues:
- Check the API documentation at `/docs`
- Review the logs for error details
- Contact the development team

## License

This project is proprietary to Mold Testing Houston, LLC. 