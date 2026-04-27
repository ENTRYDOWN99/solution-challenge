# Community Aid Platform

A full-stack volunteer-need matching system for NGOs, powered by **Google Gemini AI**. This platform connects community needs with available volunteers using intelligent matching algorithms, NLP-powered data extraction, a Gemini-driven chatbot, and real-time notifications.

![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-18-green)
![Python](https://img.shields.io/badge/Python-3.11-yellow)
![SQLite](https://img.shields.io/badge/SQLite-3-lightblue)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-orange)

---

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   React     │───▶│  Node.js     │───▶│   SQLite     │
│   Frontend  │    │  Express API │    │   Database   │
│   (Vite)    │    │              │    └──────────────┘
└─────────────┘    │              │    ┌──────────────┐
                   │              │───▶│  In-Memory   │
                   │              │    │  Cache       │
                   │              │    └──────────────┘
                   │              │    ┌──────────────────────┐
                   │              │───▶│  Python NLP Service  │
                   └──────────────┘    │  Flask + Gemini AI   │
                                       └──────────────────────┘
```

---

## ✨ Features

- **🤖 Gemini AI Integration** — Enhanced NLP extraction, human-readable match explanations, and a volunteer-facing chatbot powered by `gemini-1.5-flash`
- **🧠 Intelligent Matching Engine** — Matches volunteers to needs using skill overlap, distance, availability, and trust score
- **📝 NLP Text Extraction** — Extract structured data from paper surveys using OCR + spaCy NLP, enriched by Gemini
- **💬 Volunteer Chatbot** — Multi-turn AI assistant with persistent sessions, aware of live platform context (open needs count, user role)
- **📊 Real-time Dashboard** — Analytics, trends, heatmaps, and coverage gap analysis
- **🚨 Urgency Scoring** — Automatic urgency calculation: `severity×0.4 + people×0.3 + time_sensitive×0.2 + vulnerability×0.1`
- **📸 OCR Pipeline** — Upload survey images → Tesseract OCR → Gemini-enhanced NLP extraction → auto-create needs
- **🔐 Role-based Access** — Separate views for NGO admins, volunteers, and super admins
- **🔔 Notifications** — SMS (Twilio) and email (Nodemailer) for task assignments
- **🗺️ Heatmap Visualization** — Leaflet.js map with color-coded urgency markers
- **📍 DBSCAN Clustering** — Group nearby needs (within 200m) for efficient resource allocation
- **🔗 API Webhooks** — Accept external need data from partner NGO systems

---

## 📁 Project Structure

```
/project-root
├── frontend/                 # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── context/          # React Context providers
│   │   └── services/         # API service layer
│   └── index.html
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/           # DB, cache, app config
│   │   ├── controllers/      # Route handlers
│   │   │   └── chatController.js   # Gemini chat proxy
│   │   ├── middleware/       # Auth, upload, error handling
│   │   ├── routes/
│   │   │   └── chat.js       # POST /api/chat
│   │   ├── services/         # Email, SMS services
│   │   ├── utils/            # Helpers (haversine, scoring)
│   │   └── server.js         # Entry point
│   └── uploads/              # File upload storage
├── nlp-service/              # Python Flask + Gemini microservice
│   ├── app.py                # NLP + Gemini endpoints
│   ├── requirements.txt      # includes google-generativeai
│   └── .env                  # GEMINI_API_KEY (local only, not committed)
├── db/                       # Database files
│   ├── 001_init.sql          # Schema definition
│   └── seed.js               # Seed data script
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+ *(optional — for NLP service)*
- Docker & Docker Compose *(optional)*
- Google Gemini API key *(optional — platform degrades gracefully without it)*

### Option 1: Docker

```bash
# Copy and configure the root .env (add your Gemini key here)
echo "GEMINI_API_KEY=your_key_here" > .env

# Start all services
docker-compose up --build

# Seed the database (first time only)
docker exec cap_backend npm run seed
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- NLP Service: http://localhost:5001

---

### Option 2: Manual Setup

#### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # Configure environment variables
npm run seed            # Seed initial data (first time only)
npm run dev             # Starts on port 5000
```

#### 2. NLP Service *(optional but recommended)*

```bash
cd nlp-service
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Add your Gemini API key (get one free at https://aistudio.google.com/app/apikey)
echo "GEMINI_API_KEY=your_key_here" > .env

python app.py           # Starts on port 5001
```

> If the NLP service is not running, the backend automatically falls back to local regex-based extraction.  
> If `GEMINI_API_KEY` is not set, all endpoints still work — Gemini features are silently disabled.

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # Starts on port 3000
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Needs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/needs` | Create need (auto urgency scoring) | Yes |
| GET | `/api/needs` | List needs (filterable, paginated) | Yes |
| GET | `/api/needs/:id` | Get need with assignments | Yes |
| PUT | `/api/needs/:id` | Update need | Admin |
| DELETE | `/api/needs/:id` | Soft delete need | Admin |
| POST | `/api/needs/bulk-upload` | OCR upload paper survey | Yes |
| GET | `/api/needs/heatmap` | Heatmap data (lat/lng + urgency) | Yes |

### Volunteers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/volunteers/profile` | Create/update profile | Yes |
| GET | `/api/volunteers` | List volunteers (filterable) | Yes |
| GET | `/api/volunteers/:id` | Get full profile | Yes |
| PUT | `/api/volunteers/:id/availability` | Update schedule | Yes |
| GET | `/api/volunteers/:id/tasks` | Task history | Yes |

### Matching

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/matching/run` | Trigger matching engine | Admin |
| GET | `/api/matching/suggestions/:need_id` | Top 5 matches | Yes |
| POST | `/api/matching/assign` | Assign volunteer | Admin |
| POST | `/api/matching/accept/:task_id` | Accept task | Yes |
| POST | `/api/matching/complete/:task_id` | Complete task | Yes |

### Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/analytics/summary` | Dashboard statistics | Yes |
| GET | `/api/analytics/trends` | 30-day trends | Yes |
| GET | `/api/analytics/coverage-gaps` | Low coverage areas | Yes |
| GET | `/api/analytics/top-needs` | Top 5 urgent needs | Yes |

### Organizations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orgs` | Create organization | Admin |
| GET | `/api/orgs` | List organizations | Yes |
| GET | `/api/orgs/:id/needs` | Org's needs | Yes |
| POST | `/api/orgs/webhook` | External webhook (API key) | API Key |

### 🤖 Gemini Chat (New)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chat` | Send message to Gemini volunteer assistant | Yes |

**Request body:**
```json
{ "message": "What open needs are near me?" }
```

**Response:**
```json
{ "reply": "There are currently 12 open needs on the platform..." }
```

### NLP Service (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/extract` | Extract fields from text (Gemini-enhanced) |
| POST | `/match-score` | Compute match score + Gemini explanation |
| POST | `/cluster-needs` | DBSCAN clustering |
| POST | `/chat` | Gemini chatbot (called via backend proxy) |
| GET | `/health` | Health check (`gemini_available` field) |

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `NLP_SERVICE_URL` | Python service URL | `http://localhost:5001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `REDIS_URL` | Redis connection string *(optional)* | In-memory fallback used |
| `TWILIO_SID` | Twilio account SID | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Optional |
| `TWILIO_PHONE` | Twilio phone number | Optional |
| `SMTP_HOST` | SMTP server host | Optional |
| `SMTP_USER` | SMTP username | Optional |
| `SMTP_PASS` | SMTP password | Optional |

### NLP Service (`nlp-service/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key — [get yours free](https://aistudio.google.com/app/apikey) | Optional |
| `PORT` | Flask service port | `5001` |

> **Graceful degradation:** If `GEMINI_API_KEY` is absent or the Gemini call fails, all endpoints continue to work using spaCy/regex logic. No crashes.

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` |

---

## 🤖 Gemini AI Features

### 1. Enhanced Data Extraction (`POST /extract`)
Gemini reads the raw field-report text and returns a structured JSON object that **overrides and enriches** the base spaCy/regex result — providing more accurate `location`, `category`, `severity`, and a human-readable `description`.

### 2. Match Explanation (`POST /match-score`)
After the numeric score is computed, Gemini generates a one-sentence natural-language explanation:
```json
{
  "match_score": 0.82,
  "explanation": "Raj is an 82% match — his medical skills are exactly what's needed and he lives just 3 km away with a strong trust record.",
  "distance_km": 3.1,
  "breakdown": { "skill": 1.0, "distance": 0.88, "availability": 0.5, "trust": 0.75 }
}
```

### 3. Volunteer Chatbot (`POST /api/chat`)
Multi-turn conversational assistant with:
- Persistent in-memory session per user
- Live platform context (open needs count, user role)
- Graceful 503 response if Gemini is unconfigured

---

## 🧮 Matching Algorithm

```
match_score = skill_match × 0.4 + distance_score × 0.3 + availability × 0.2 + trust × 0.1
```

- **Skill Match (40%)**: `1.0` if volunteer has the need's category as a skill
- **Distance Score (30%)**: `max(0, 1 - distance / max_radius_km)`
- **Availability (20%)**: `1.0` if volunteer is available during need's time
- **Trust Score (10%)**: `trust_score / 100`
- **Hard Filters**: Score = `0` if no skill match OR distance > max radius

Needs with `urgency_score > 0.85` trigger **real-time matching** immediately on creation.

---

## 📊 Urgency Scoring

```
urgency = severity_norm × 0.4 + people_norm × 0.3 + time_sensitive × 0.2 + vulnerability_norm × 0.1
```

---

## 🔄 Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Batch Matching | Every 15 minutes | Runs matching engine for all open needs |
| Token Cleanup | Daily at 2 AM | Removes expired refresh tokens |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
