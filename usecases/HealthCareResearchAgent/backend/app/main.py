import datetime
import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

from app.config import settings
from app.db import engine, Base, get_db
from app.models import User, Document, ResearchQuery, Report, Citation
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, RoleChecker
from app.services.pubmed_service import PubMedService
from app.services.clinical_trials_service import ClinicalTrialsService
from app.services.graph_service import GraphService
from app.tasks import ingest_document_task
from app.agents.graph import execute_research_workflow
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
except Exception as ex:
    logger.warning(f"Could not create vector extension: {str(ex)}")

# Dynamic migration to add is_pinned column
try:
    with engine.connect() as conn:
        dialect = engine.dialect.name
        if dialect == "postgresql":
            conn.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;"))
        else:
            try:
                conn.execute(text("ALTER TABLE reports ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;"))
            except Exception as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    pass
                else:
                    raise e
        conn.commit()
except Exception as ex:
    logger.warning(f"Could not run alter table migration: {str(ex)}")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Healthcare Research Copilot AI Agent",
    version="1.0.0",
    docs_url="/docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "researcher"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class QueryRequest(BaseModel):
    query: str

class ResearchHistoryItem(BaseModel):
    id: int
    query: str
    timestamp: datetime.datetime
    class Config:
        from_attributes = True

class ReportSummary(BaseModel):
    id: int
    title: str
    is_pinned: bool
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# --- API Endpoints ---

# 1. Authentication
@app.post(f"{settings.API_V1_STR}/auth/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_pwd,
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "name": user.name}

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "name": user.name}

@app.post(f"{settings.API_V1_STR}/auth/logout")
def logout():
    return {"detail": "Logged out successfully"}


# 2. Research
@app.post(f"{settings.API_V1_STR}/research/query")
async def execute_query(req: QueryRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Record the search query history
    search_query = ResearchQuery(user_id=current_user.id, query=req.query)
    db.add(search_query)
    db.commit()

    # Synchronously execute the LangGraph agent workflow to provide instant chat responses
    try:
        final_state = await execute_research_workflow(req.query)
        
        # Optionally create report automatically from query search
        report = Report(
            user_id=current_user.id,
            title=final_state.get("title", f"Report for: {req.query[:30]}"),
            report_content=final_state.get("report_content", "")
        )
        db.add(report)
        db.flush()
        
        for cit in final_state.get("citations", []):
            citation = Citation(
                report_id=report.id,
                source=cit.get("source", "Unknown"),
                doi=cit.get("doi"),
                url=cit.get("url")
            )
            db.add(citation)
        db.commit()

        return {
            "query": req.query,
            "research_goal": final_state.get("research_goal"),
            "keywords": final_state.get("keywords"),
            "mesh_terms": final_state.get("mesh_terms"),
            "execution_plan": final_state.get("execution_plan"),
            "pmids": final_state.get("pmids"),
            "papers": final_state.get("papers"),
            "trials": final_state.get("trials"),
            "rag_results": final_state.get("rag_results"),
            "evidence_ranking": final_state.get("evidence_ranking"),
            "comparisons": final_state.get("comparisons"),
            "report_id": report.id,
            "report_content": final_state.get("report_content")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent workflow error: {str(e)}")

@app.get(f"{settings.API_V1_STR}/research/history", response_model=List[ResearchHistoryItem])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ResearchQuery).filter(ResearchQuery.user_id == current_user.id).order_by(ResearchQuery.timestamp.desc()).all()


# 3. PubMed direct searches
@app.get(f"{settings.API_V1_STR}/pubmed/search")
async def pubmed_search(q: str, max_results: int = 5, current_user: User = Depends(get_current_user)):
    pmids = await PubMedService.search_pubmed(q, max_results)
    return {"pmids": pmids}

@app.get(f"{settings.API_V1_STR}/pubmed/paper/{{id}}")
async def pubmed_paper(id: str, current_user: User = Depends(get_current_user)):
    abstracts = await PubMedService.fetch_abstracts([id])
    if not abstracts:
        raise HTTPException(status_code=404, detail="Paper not found")
    return abstracts[0]


# 4. Clinical Trials direct searches
@app.get(f"{settings.API_V1_STR}/clinical-trials/search")
async def clinical_trials_search(condition: Optional[str] = None, intervention: Optional[str] = None, current_user: User = Depends(get_current_user)):
    result = await ClinicalTrialsService.search_trials(condition=condition, intervention=intervention, limit=10)
    return result


# 5. Documents Upload & Search
@app.post(f"{settings.API_V1_STR}/documents/upload")
async def upload_document(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Save file record in database
    file_type = file.filename.split(".")[-1].lower()
    if file_type not in ["pdf", "docx", "txt", "html"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    doc = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_type=file_type,
        status="processing"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Ingest document text. Reading file content in bytes
    file_bytes = await file.read()
    file_hex = file_bytes.hex()

    # Trigger Celery ingestion task (or call directly if Redis is not configured)
    try:
        ingest_document_task.delay(doc.id, file_hex, file.filename)
    except Exception as e:
        # Fallback to local synchronous processing if celery/redis is offline
        logger.warning(f"Celery task dispatch failed: {str(e)}. Falling back to local ingestion.")
        ingest_document_task(doc.id, file_hex, file.filename)

    return {"id": doc.id, "filename": doc.filename, "status": doc.status}

@app.get(f"{settings.API_V1_STR}/documents")
def get_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.user_id == current_user.id).all()

@app.delete(f"{settings.API_V1_STR}/documents/{{id}}")
def delete_document(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"status": "success", "detail": "Document deleted successfully"}


# 6. Reports
@app.post(f"{settings.API_V1_STR}/reports/generate")
async def generate_report(req: QueryRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Simple trigger: run sync agent workflow, create report, and return report summary
    try:
        final_state = await execute_research_workflow(req.query)
        report = Report(
            user_id=current_user.id,
            title=final_state.get("title", f"Report: {req.query[:30]}"),
            report_content=final_state.get("report_content", "")
        )
        db.add(report)
        db.flush()
        
        for cit in final_state.get("citations", []):
            citation = Citation(
                report_id=report.id,
                source=cit.get("source", "Unknown"),
                doi=cit.get("doi"),
                url=cit.get("url")
            )
            db.add(citation)
        db.commit()
        return {"id": report.id, "title": report.title, "created_at": report.created_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{settings.API_V1_STR}/reports/{{id}}")
def get_report(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    citations = db.query(Citation).filter(Citation.report_id == id).all()
    return {
        "id": report.id,
        "title": report.title,
        "report_content": report.report_content,
        "is_pinned": report.is_pinned,
        "created_at": report.created_at,
        "citations": [{"source": c.source, "doi": c.doi, "url": c.url} for c in citations]
    }

@app.get(f"{settings.API_V1_STR}/reports", response_model=List[ReportSummary])
def get_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).all()

@app.put(f"{settings.API_V1_STR}/reports/{{id}}/pin")
def toggle_pin_report(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.is_pinned = not report.is_pinned
    db.commit()
    db.refresh(report)
    return {"id": report.id, "title": report.title, "is_pinned": report.is_pinned}


# 7. Knowledge Graph Exploration
@app.get(f"{settings.API_V1_STR}/graph/entities")
async def get_graph_entities(current_user: User = Depends(get_current_user)):
    data = await GraphService.get_graph_data()
    return data.get("nodes", [])

@app.get(f"{settings.API_V1_STR}/graph/relationships")
async def get_graph_relationships(current_user: User = Depends(get_current_user)):
    data = await GraphService.get_graph_data()
    return data.get("edges", [])

@app.get(f"{settings.API_V1_STR}/graph")
async def get_full_graph(current_user: User = Depends(get_current_user)):
    data = await GraphService.get_graph_data()
    return data
