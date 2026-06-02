# Deployment Guide - Enterprise Healthcare Research Agent

This deployment guide outlines the staging and production deployment steps for the Healthcare Research Agent platform.

---

## 1. Local Development Quickstart

To run the application locally on your machine:

### Backend Setup

1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate # On Windows
   # or: source venv/bin/activate # On Unix
   ```
2. Install python package requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Make sure dependencies are installed (they are already installed):
   ```bash
   npm install --legacy-peer-deps
   ```
3. Run the local development server:
   ```bash
   npm run dev
   ```
4. Access the workspace UI at `http://localhost:5173`.

---

## 2. Docker Compose Production Deployment

To package and run the entire multi-container stack (FastAPI, React, PostgreSQL, Redis, Celery worker, Neo4j Graph DB) in a production-like local sandbox:

1. Build and boot all containers from the root directory:
   ```bash
   docker compose up --build -d
   ```
2. Verify all services are healthy and running:
   ```bash
   docker compose ps
   ```
3. Read the backend and worker logs to verify successful databases migration:
   ```bash
   docker compose logs -f backend
   docker compose logs -f worker
   ```

---

## 3. Kubernetes Production Orchestration

For high-availability scaling in cloud environments (AWS EKS, GCP GKE, Microsoft AKS):

1. Create the dedicated platform namespace:
   ```bash
   kubectl create -f kubernetes/k8s-manifests.yaml
   ```
2. Inspect pod statuses to ensure database services are up:
   ```bash
   kubectl get pods -n healthcare-research -w
   ```
3. Set up resource quotas and ingress controller rules as needed to expose the LoadBalancer IP for `frontend-service`.

---

## 4. Scaling Considerations

* **FastAPI Backend:** The backend deployment can be scaled to `N` replicas behind an ingress controller. Sticky sessions are not required since the API endpoints are entirely stateless and authenticated via JWT.
* **Celery Worker:** Scale the worker replicas to support concurrent document parsing and chunking. Celery concurrency should be set to match the available CPU cores of the cluster nodes.
* **Vector DB (Pinecone):** For large documents libraries, configure Pinecone index replica sizing to ensure low latency semantic matching.
* **Graph DB (Neo4j):** In production, migrate from Neo4j Community Edition to a scaled Neo4j Enterprise cluster.
