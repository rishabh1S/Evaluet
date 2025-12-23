# Evaluet — Real-Time AI Interview Platform 🎙️🤖

Evaluet is a **voice-first AI interview platform** that conducts realistic, structured, live interviews using speech-to-text, text-to-speech, and large language models.  
It simulates a senior human interviewer — asking probing questions, adapting difficulty, and generating detailed post-interview evaluations.

Built with **FastAPI**, **WebSockets**, **PostgreSQL**, and **React Native (Expo)**, Evaluet focuses on **real-world interview realism**, not scripted chatbots.

## ✨ Key Features

### 🎧 Live Voice Interviews
- Real-time **speech-to-text** using Deepgram Flux
- Low-latency **AI voice responses** with natural turn-taking
- WebSocket-based duplex audio streaming
- Designed for uninterrupted spoken conversation

### 🧠 Realistic AI Interviewer
- Structured multi-phase interviews:
  - Introduction
  - Core subject validation
  - Resume verification
  - Behavioral assessment
  - Closing discussion
- Adaptive difficulty (basic → deep → edge cases)
- Strict turn-taking and termination rules
- No coaching, no teaching — **evaluation only**

### 📊 Automated Interview Reports
- AI-generated structured feedback
- Strengths, weaknesses, communication analysis
- Numerical score (1–10)
- Designed for async generation after interview completion

### 🔐 Authentication & Security
- Email + password authentication
- JWT-based access control
- Protected REST and WebSocket endpoints
- Secure token storage on mobile (Expo SecureStore)

### 📱 Mobile-First Experience
- Built with **Expo + React Native**
- Optimized for iOS audio sessions
- Stable recording/playback using `expo-av`
- Clean, distraction-free interview UI

---

## 🏗️ Architecture Overview
┌────────────┐ WebSocket ┌───────────────────┐
│ Mobile UI │ ───────────────▶ │ FastAPI Backend │
│ (Expo RN) │ ◀─────────────── │ │
└────────────┘ Audio + Text └───────────────────┘
│ │
│ │
▼ ▼
Speech Recording PostgreSQL
(PCM 16kHz) (Users, Sessions, Reports)
│
▼
Deepgram STT → LLM → TTS (Voice Response)


## 🧩 Tech Stack

### Backend
- **FastAPI** — REST + WebSocket APIs
- **SQLAlchemy** — ORM
- **PostgreSQL (NeonDB compatible)**
- **Deepgram Flux** — Real-time STT
- **Groq LLM API** — Interview logic & reporting
- **JWT (python-jose)** — Authentication
- **Passlib (bcrypt)** — Password hashing

### Frontend
- **Expo (React Native)**
- **Expo Router**
- **Tamagui** — UI system
- **expo-av** — Audio playback
- **expo-audio-studio** — PCM audio capture
- **WebSockets** — Real-time communication

## 📂 Project Structure

### Backend

backend/
├── app/
│ ├── auth/ # Auth, JWT, security
│ ├── models/ # SQLAlchemy models
│ ├── routers/ # API routes
│ ├── services/ # STT, TTS, interview logic
│ ├── prompts/ # System & report prompts
│ ├── repository/ # DB access layer
│ ├── db.py # DB setup
│ └── main.py # App entrypoint

### Frontend

app-ui/
├── app/
│ ├── (auth)/ # Login / Register
│ ├── (app)/ # Protected screens
│ ├── interview/ # Live interview UI
│ └── _layout.tsx # App layout & routing
├── components/ # UI components
├── lib/ # Auth, env, helpers
└── tamagui.config.ts

## 🔐 Authentication Flow

1. User registers or logs in via email/password
2. Backend issues a JWT
3. JWT stored securely on device
4. All protected API calls include:
   Authorization: Bearer <token>
5. WebSocket interview sessions validate the token before initialization

## 🎙️ Interview Lifecycle

1. **Interview Setup**
- User uploads resume
- Job role, level, description provided
- Backend creates interview session

2. **Live Interview**
- WebSocket connection established
- Audio streamed as PCM (16kHz mono)
- AI asks structured questions
- Strict turn-taking enforced

3. **Finalization**
- Transcript saved
- Session marked completed

4. **Async Report Generation**
- LLM analyzes transcript
- Structured feedback + score generated
- Stored for later retrieval


## 🧠 Interviewer Design Philosophy

Evaluet’s interviewer is designed to:
- Feel **human**, not robotic
- Be **calm, confident, and engaging**
- Avoid coaching or teaching
- Test **fundamentals, reasoning, and judgment**
- End interviews deterministically

This is **not** a chat assistant — it is an **evaluation system**.

## ⚠️ Notes & Constraints

- Designed for voice-first usage
- Optimized for iOS audio behavior
- Requires active internet connection
- Report generation is asynchronous by design

## 🛣️ Future Enhancements

- OAuth (Google / LinkedIn)
- Interview replay & analytics
- Custom interviewer personalities
- Multi-language support
- Enterprise dashboards
- VAD-based auto mic control