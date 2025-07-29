# Installation Guide

## Prerequisites

- Python 3.9 or higher
- pip (Python package installer)
- Git

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mold-testing-houston-diy-mold-tes-adc96f7c
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the backend directory:

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key

# Email (SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your_email@gmail.com

# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
# OR
GOOGLE_CREDENTIALS_JSON=your_google_credentials_json

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### 5. Run the Application

```bash
python simple_main.py
```

The server will start on `http://localhost:5000`

## Development

For development with auto-reload:

```bash
export FLASK_ENV=development
python simple_main.py
```

## Production

For production deployment:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 simple_main:app
``` 