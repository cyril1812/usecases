# Aura: Enterprise Healthcare Research Copilot AI Agent

Aura is a production-ready, AI-powered healthcare and pharmaceutical research copilot. It enables medical researchers, clinicians, and life science teams to query medical literature (NCBI PubMed), registered clinical trials (ClinicalTrials.gov), and proprietary corporate documents (via PDF/DOCX/HTML RAG parsing) to generate evidence-based matrix reports, toxicity comparisons, and populate a live medical knowledge graph.

## Architecture and Core Design

```text
       User Research Query
               ↓
    +----------------------+
    |    Planner Agent     | (LangGraph Orchestration)
    +----------------------+
       ↓         ↓        ↓
  +---------+ +--------+ +---------+
  | PubMed  | | Trials | |   RAG   | (Parallel Search & Ingestion Engines)
  | Search  | | Search | | Context |
  +---------+ +--------+ +---------+
       ↓         ↓        ↓
    +----------------------+
    | Literature Reviewer  | (Structured abstract Objective/Methods/Conclusion extraction)
    +----------------------+
               ↓
    +----------------------+
    |   Evidence Ranker    | (Ranks clinical designs: RCTs, Reviews, Cohorts, Case Reports)
    +----------------------+
               ↓
    +----------------------+
    |  Drug Intelligence   | (Adverse effects, comparative efficacy profiles)
    +----------------------+
               ↓
    +----------------------+
    |   Report Generator   | (Compiles report markdown & updates Neo4j Knowledge Graph)
    +----------------------+
               ↓
  Visual Interactive Dashboard (React 19, TS, Zustand, Custom Canvas Property Graph)
```

---

## Folder Structure

```text
HealthCareResearchAgent/
├── .github/
│   └── workflows/
│       └── ci-cd.yaml          # GitHub Actions lint, test & build pipeline
├── backend/
│   ├── app/
│   │   ├── agents/             # LangGraph Multi-Agent implementation
│   │   │   ├── graph.py        # Graph composition & workflow entrypoint
│   │   │   ├── planner.py      # User intent parser & terms extractor
│   │   │   ├── pubmed_searcher.py
│   │   │   ├── clinical_trial.py
│   │   │   ├── literature_reviewer.py
│   │   │   ├── rag_retriever.py
│   │   │   ├── evidence_ranker.py
│   │   │   ├── drug_intelligence.py
│   │   │   └── report_generator.py
│   │   ├── services/           # External API & Database logic
│   │   │   ├── pubmed_service.py
│   │   │   ├── clinical_trials_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── graph_service.py
│   │   │   └── report_service.py
│   │   ├── auth.py             # User JWT Auth and RBAC guards
│   │   ├── config.py           # App environments & mock auto-switches
│   │   ├── db.py               # SQLAlchemy db connection Engine
│   │   ├── models.py           # PostgreSQL models
│   │   ├── tasks.py            # Celery asynchronous task definitions
│   │   └── main.py             # FastAPI routing entrypoint
│   ├── tests/                  # Pytest unit tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable components (Sidebar, Canvas Graph, Charts)
│   │   ├── pages/              # Login, Chat Workspace, Documents, Reports, Admin console
│   │   ├── store/              # Zustand global states (auth, active research)
│   │   ├── App.tsx             # Theme settings, routing rules & guards
│   │   ├── main.tsx
│   │   └── index.css           # Curated HSL dark styles & glassmorphic classes
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── kubernetes/
│   └── k8s-manifests.yaml      # Kubernetes cluster orchestration config
├── docker-compose.yml          # Local multi-container setup (DBs, Backend, Frontend)
└── README.md
```

---

## Technology Stack

* **Frontend:** React 19, TypeScript, Material UI, React Query, Zustand, Recharts (premium analytics charts), Lucide Icons, and custom HTML5 Canvas rendering for node graph interactions.
* **Backend:** FastAPI, Python 3.12+, LangGraph (agent flow state machines), LangChain, PostgreSQL, Redis, Celery (asynchronous file ingestion & pipeline builders).
* **Vector Ingestion:** Pinecone Vector Database with local similarity search fallback.
* **Knowledge Graph:** Neo4j Graph Database with local in-memory property graph fallback.

---

## Environment Variables

Create a `.env` file in the root workspace to configure active credentials:

```bash
# JWT Secret
JWT_SECRET=super-secret-jwt-key-for-healthcare-research-agent-12345

# PostgreSQL & Redis
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthcare_research
REDIS_URL=redis://localhost:6379/0

# LLM Providers (Optional - falls back to offline Mock Mode if empty)
OPENAI_API_KEY=your-openai-api-key

# Vector Database (Optional - falls back to local similarity engine if empty)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=healthcare-research-index

# Graph Database (Optional - falls back to local in-memory property graph if empty)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password
```

---

## Quick Start (Docker Compose)

The easiest way to spin up the entire application along with PostgreSQL, Redis, and Neo4j is using Docker Compose:

```bash
docker compose up --build
```

Access coordinates:
* **Frontend UI Dashboard:** `http://localhost:5173`
* **FastAPI Swagger Docs:** `http://localhost:8000/docs`
* **Neo4j DB Console:** `http://localhost:7474`
