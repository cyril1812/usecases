import asyncio
import logging
from celery import Celery
from sqlalchemy.orm import Session
from app.config import settings
from app.db import SessionLocal
from app.models import Document, DocumentChunk, Report, Citation
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery("tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Helper to run async methods synchronously within Celery tasks
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task(name="tasks.ingest_document")
def ingest_document_task(document_id: int, file_content_hex: str, filename: str):
    """
    Parse uploaded file, split it into chunks, generate embeddings,
    and save them to Pinecone (vector index) and PostgreSQL (text index).
    """
    logger.info(f"Starting ingestion task for document_id={document_id}")
    db = SessionLocal()
    try:
        # Convert hex string back to bytes
        file_bytes = bytes.fromhex(file_content_hex)
        
        # Parse text from file
        text = RAGService.parse_file(file_bytes, filename)
        if not text:
            raise ValueError("No extractable text found in file")

        # Chunk plain text
        chunks = RAGService.chunk_text(text)
        logger.info(f"Extracted {len(chunks)} chunks from {filename}")

        # Generate embeddings and index chunks (Pinecone or Local Fallback)
        vector_ids = run_async(RAGService.index_chunks(document_id, chunks))

        # Save chunk text index to PostgreSQL database
        for idx, (chunk_text, vector_id) in enumerate(zip(chunks, vector_ids)):
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_text=chunk_text,
                embedding_id=vector_id
            )
            db.add(db_chunk)

        # Update document status to completed
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "completed"
        db.commit()
        logger.info(f"Successfully processed document_id={document_id}")
        return {"status": "success", "chunks_count": len(chunks)}

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to ingest document_id={document_id}: {str(e)}")
        # Update document status to failed
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "failed"
        db.commit()
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()

@celery_app.task(name="tasks.generate_report")
def generate_report_task(user_id: int, query: str):
    """
    Long-running Celery task to execute the multi-agent LangGraph workflow,
    generate a detailed research report, and save it to the database.
    """
    logger.info(f"Starting research report generation for user_id={user_id}, query='{query}'")
    db = SessionLocal()
    try:
        from app.agents.graph import execute_research_workflow
        
        # Run LangGraph workflow synchronously inside worker thread
        result = run_async(execute_research_workflow(query))
        
        # Extract report data and compile report
        report_content = result.get("report_content", "Failed to generate report content.")
        title = result.get("title", f"Research Report: {query[:30]}...")

        # Create Report entry in PostgreSQL database
        db_report = Report(
            user_id=user_id,
            title=title,
            report_content=report_content
        )
        db.add(db_report)
        db.flush() # Flush to get report ID

        # Save extracted citations
        citations = result.get("citations", [])
        for cit in citations:
            db_cit = Citation(
                report_id=db_report.id,
                source=cit.get("source", "Unknown"),
                doi=cit.get("doi"),
                url=cit.get("url")
            )
            db.add(db_cit)

        db.commit()
        logger.info(f"Successfully generated and saved report id={db_report.id}")
        return {"status": "success", "report_id": db_report.id}

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to generate report: {str(e)}")
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
