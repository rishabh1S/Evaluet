# Evaluet — Real-Time AI Interview Platform 🎙️🤖

Evaluet is a real-time, voice-first AI interview platform that simulates realistic technical interviews using live speech recognition, streaming LLM responses, and synchronized interviewer video presence.

Unlike chat-based interview tools, Evaluet focuses on natural turn-taking, spoken responses, and interviewer realism, closely matching real interview conditions.

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
```
Mobile App (Expo / React Native)
│
├── Audio Recorder (PCM 16kHz)
├── WebSocket (Live Audio + AI Audio)
├── Interviewer Video Stage
│
Backend (FastAPI)
│
├── WebSocket Runtime
│   ├── STT (Deepgram Flux)
│   ├── LLM Streaming (Groq)
│   ├── TTS (Deepgram Aura-2)
│
├── Interview State Manager
├── Transcript & Session Persistence (Postgres)
├── Report Generation Pipeline
│   └── LLM → JSON → Email
│
Postgres (NeonDB)
S3 (Interviewer Media)
```

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
- **Zustand** - Global State management
- **Tanstack Query** - Data fetching

## 📂 Project Structure

### Backend
```
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
```

### Frontend

```
app-ui/
├── app/
│ ├── (auth)/ # Login / Register
│ ├── (app)/ # Protected screens
│ ├── interview/ # Live interview UI
│ └── _layout.tsx # App layout & routing
├── components/ # UI components
├── lib/ # Auth, env, helpers
└── tamagui.config.ts
```

## 🔐 Authentication Flow

1. User registers or logs in via email/password
2. Backend issues a JWT
3. JWT stored securely on device
4. All protected API calls include:
   Authorization: Bearer <token>
5. WebSocket interview sessions validate the token before initialization

## 🎙️ Interview Lifecycle

### 1. Interview Setup
- User selects:
- Job role
- Job level
- Interviewer persona
- Resume uploaded as PDF
- Backend:
- Extracts resume text
- Builds a **context-aware system prompt**
- Creates a persistent interview session in the database
- Returns a session-bound WebSocket URL

---

### 2. Live Interview (Real-Time)

- Client opens a **WebSocket connection** using the session ID
- Microphone audio streamed as **raw PCM (16kHz, mono)** in near-real time
- Backend pipeline:
- **Deepgram Flux** performs streaming STT with End-Of-Turn detection
- User speech is queued only when AI is not speaking
- AI responses are streamed token-by-token from **Groq LLM**
- Sentences are converted to speech via **Deepgram Aura-2 TTS**
- Strict turn-taking enforced:
- No audio overlap
- Silence keep-alive maintains STT connection
- Interviewer video stage:
- Idle and talking videos are **preloaded**
- Seamless crossfade triggered only when AI speaks
- Randomized seek offsets prevent repetitive visual loops

---

### 3. Deterministic Finalization
- Interview ends when:
- AI emits an explicit end signal
- Or interview state expires
- Backend actions:
- Transcript finalized and stored
- Session marked **COMPLETED** or **FAILED**
- WebSocket gracefully closed
- Client:
- Stops recording
- Clears interviewer state
- Displays interview completion state

---

### 4. Async Report Generation
- Runs **out-of-band** after interview completion
- Backend:
- Cleans and normalizes transcript
- Generates a structured evaluation using LLM
- Enforces strict JSON-only output
- Parses output using fault-tolerant JSON handling
- Results:
- Hiring score (1–10)
- Detailed markdown feedback
- Report is:
- Stored in the database
- Sent to the candidate via email

---

## 🧠 Interviewer Design Philosophy

Evaluet’s interviewer is intentionally designed as an **evaluation system**, not a chatbot.

Core principles:
- **Human-like presence** without pretending to be human
- **Voice-first interaction**, not text-first
- **No coaching, hints, or teaching**
- Focus on:
- Fundamentals
- Problem-solving approach
- Communication clarity
- Decision-making under ambiguity
- Deterministic behavior:
- Clear interview start
- Clear interview end
- No endless conversations

Interviewer personas (e.g., Sarah, Marcus, Victoria) differ in **tone and pressure**, but all follow the same rigorous evaluation standards.

This ensures interviews feel realistic, fair, and consistently measurable.

## ⚠️ Notes & Constraints

- Designed for voice-first usage
- Optimized for iOS audio behavior
- Requires active internet connection
- Report generation is asynchronous by design

## 🛣️ Future Enhancements

- OAuth (Google / LinkedIn)
- Interview replay & analytics

## License

This repository is provided for reference and educational purposes only.
Commercial usage, redistribution, or resale is **not permitted** without explicit permission.

![Logo](https://evaluet-interviewers-media.s3.ap-south-1.amazonaws.com/evaluet.png)
