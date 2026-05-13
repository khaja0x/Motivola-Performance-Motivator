# 🚀 Motivola — Performance Motivator

A multi-tenant SaaS platform that helps business owners and managers track employee sales performance, calculate commissions, and motivate staff through automated WhatsApp performance updates.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Queue | Redis, Celery |
| Messaging | Twilio (WhatsApp) |
| Deployment | DigitalOcean |

## Project Structure

```
Performance-Motivator/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, security, deps
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   └── requirements.txt
└── README.md
```

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload 
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
