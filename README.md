# Full-Stack Adaptive RAG College Chatbot

A production-ready College Query Support Chatbot implementing an advanced, 10-step **Adaptive Retrieval-Augmented Generation (Adaptive RAG)** pipeline. The system provides factual, grounded responses for student inquiries (admissions, fee schedules, scholarships, examinations, attendance policies, hostels, placements, etc.) with trace logs and source citations.

---

## Architecture Stack

- **Frontend**: React.js, Vite, Tailwind CSS, Framer Motion, Axios, React Router, Lucide Icons.
- **Backend API**: Node.js, Express.js, Winston logging, Multer (file uploading), Rate Limiter.
- **Vector Database & Embeddings**: FastAPI Python wrapper around ChromaDB utilizing the `sentence-transformers/all-MiniLM-L6-v2` local embedding model.
- **LLM Engine**: Groq Cloud API (`llama-3.3-70b-versatile`).

---

## 10-Step Adaptive RAG Flow

The application moves away from basic "Retrieve -> Synthesize" designs by introducing dynamic routing, query restructuring, doc grading, and corrective retries:

```
                  [User Query Input]
                          │
            1-2. Query Router & Classifier
             /            │            \
      (Greeting)     (General KB)     (College Query)     (Out of Scope)
        /                 │                  │                   \
[Direct Hello]    [Direct LLM Ans]     3. Query Rewriter    [Polite Rejection]
                                             │
                                      4. Retrieve (Top-K)
                                             │
                                   5. Relevance Grader
                                     /             \
                           (Low Relevance)    (Relevant Chunks)
                                 │                   │
                        6. Query Rewrite Retry       │
                                 │                   │
                            Re-Retrieve              │
                                 \                   /
                                7. Context Compressor
                                         │
                                8. Answer Generator
                                         │
                              9. Hallucination Check
                               /                 \
                       (Hallucinated)        (Grounded)
                             │                   │
                        [Fallback Rej]     10. Quality Grader
                                             /          \
                                         (Low)         (High/Med)
                                           │                │
                                      [Re-Generate]   [Final Response]
```

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/             # Env configuration variables
│   │   ├── controllers/        # Chat, documents, and sessions controller
│   │   ├── middleware/         # Rate limiting, logger, global error handler
│   │   ├── routes/             # API routing mappings
│   │   ├── services/           # Groq API, session handlers, HTTP Chroma clients
│   │   ├── utils/              # Winston logger, text chunker logic
│   │   ├── rag/                # The 10-Step Adaptive RAG Modules
│   │   │   ├── router.js
│   │   │   ├── queryRewriter.js
│   │   │   ├── retriever.js
│   │   │   ├── relevanceGrader.js
│   │   │   ├── contextCompressor.js
│   │   │   ├── answerGenerator.js
│   │   │   ├── hallucinationChecker.js
│   │   │   └── answerGrader.js
│   │   └── server.js
│   └── Dockerfile
├── chromadb-service/
│   ├── server.py               # FastAPI server wrapping chromadb
│   ├── requirements.txt        # python libs
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Sidebar, Header, Bubble, Input, SourceCards
│   │   ├── context/            # Theme, Chat global states
│   │   ├── pages/              # ChatPage, DashboardPage
│   │   ├── services/           # Axios-based api service
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── Dockerfile
├── data/                       # Directory containing cataloged document files
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development Setup

### Prerequisites

1. **Python 3.8 - 3.11** installed.
2. **Node.js 18+** installed.
3. **Groq API Key**: Get one from [Groq Console](https://console.groq.com/).

### Configuration

Create a `.env` file at the root based on `.env.example`:

```env
GROQ_API_KEY=your_groq_api_key_here
CHROMADB_HOST=localhost
CHROMADB_PORT=8001
CHROMADB_COLLECTION=college_knowledge
EMBEDDING_MODEL=all-MiniLM-L6-v2
TOP_K=5
```

### 1. Start Vector DB Microservice

```bash
cd chromadb-service
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python server.py
```
*The service will start on `http://localhost:8001`.*

### 2. Start Express Backend API

Open a new terminal window:
```bash
cd backend
npm install
npm run dev
```
*The Express server will launch on `http://localhost:5000`.*

### 3. Start React Frontend

Open a third terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The Vite hot-reloading dev server will serve on `http://localhost:5173`.*

---

## Run with Docker Compose (Recommended)

If you have Docker installed, you can launch the entire stack with a single command:

```bash
# Define your API key in your terminal context or in a root .env file
export GROQ_API_KEY="your_groq_api_key"

# Build and start services
docker-compose up --build
```
- Access Frontend: `http://localhost:5173`
- Access Backend API: `http://localhost:5000`
- Access ChromaDB FastAPI: `http://localhost:8001`

---

## Populate Sample Documents

1. Place plain-text (.txt) documents into respective folders in `/data/` (e.g. `/data/admissions/admission_process.txt`).
2. Go to the **Admin Dashboard** (`http://localhost:5173/admin`).
3. Click the **Reindex Knowledge Base** button. This automatically reads all files, chunks them, generates sentence-embeddings, and updates ChromaDB.
4. You can also upload new text documents dynamically using the dashboard upload form.

---

## Production Deployment Instructions

### 1. Backend & ChromaDB (Render Deployment)

Because ChromaDB requires Python and native C++ compilation (for HNSW), it is recommended to run the backend and ChromaDB services as separate components or containerized web services on **Render**.

#### Deploying ChromaDB Microservice:
1. Click **New +** -> **Web Service** on Render.
2. Connect your Git repository.
3. Choose **Docker** as the Runtime environment (Render will automatically detect `chromadb-service/Dockerfile` if you specify it as the Docker Build Path).
4. Set the Environment Variables:
   - `CHROMADB_PORT` = `8001`
5. Click **Deploy**.

#### Deploying Node.js Express Backend:
1. Click **New +** -> **Web Service**.
2. Set Runtime to **Node**.
3. Set Build Command to: `npm install` (within the `backend` subdirectory).
4. Set Start Command to: `node src/server.js`.
5. Set Environment Variables:
   - `GROQ_API_KEY` = `your_key_here`
   - `CHROMADB_HOST` = `your-render-chroma-service-url`
   - `CHROMADB_PORT` = `443` (Render services use HTTPS)
   - `FRONTEND_URL` = `your-vercel-frontend-url`
   - `NODE_ENV` = `production`

---

### 2. Frontend (Vercel Deployment)

Vercel is optimized for frontend assets.

1. Connect your repository to **Vercel**.
2. Configure Project Framework to **Vite** or select **Other**.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `VITE_BACKEND_URL` = `https://your-render-backend-url.onrender.com`
5. Click **Deploy**.
