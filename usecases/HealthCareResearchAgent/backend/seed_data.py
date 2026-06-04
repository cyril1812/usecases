import os
import sys
import datetime

# Add the parent directory to Python path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal, Base, engine
from app.models import User, Document, DocumentChunk, ResearchQuery, Report, Citation
from app.auth import get_password_hash

def seed_database():
    print("Connecting to database and creating tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Create Default User
        email = "researcher@aura.com"
        password = "password123"
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"Creating default user: {email}...")
            user = User(
                name="Dr. Cyril Selvaraj",
                email=email,
                password_hash=get_password_hash(password),
                role="researcher"
            )
            db.add(user)
            db.flush()
        else:
            print(f"Default user {email} already exists.")
            
        # 2. Create Document Library entries
        doc1_title = "Clinical_Trial_Pembrolizumab.txt"
        doc1 = db.query(Document).filter(Document.filename == doc1_title).first()
        if not doc1:
            print(f"Seeding document: {doc1_title}...")
            doc1 = Document(
                user_id=user.id,
                filename=doc1_title,
                file_type="txt",
                status="completed"
            )
            db.add(doc1)
            db.flush()
            
            chunks1 = [
                "Pembrolizumab (Keytruda) is a humanized IgG4 monoclonal antibody that binds to the PD-1 receptor, blocking its interaction with PD-L1 and PD-L2. In clinical trials, Pembrolizumab monotherapy demonstrated exceptional progression-free survival (PFS) of 10.3 months compared to 6.0 months with chemotherapy in patients with advanced non-small-cell lung cancer (NSCLC) having high PD-L1 expression (TPS >= 50%).",
                "The neoadjuvant combination of Pembrolizumab plus Paclitaxel has shown outstanding pathological complete response (pCR) rates in triple-negative breast cancer (TNBC) patients. Paclitaxel works by stabilizing microtubules, thereby interfering with mitotic spindle assembly and cell division. Together, the chemo-immunotherapy synergy creates an immunogenic environment, enhancing tumor antigen presentation."
            ]
            import asyncio
            from app.services.rag_service import RAGService
            for idx, text in enumerate(chunks1):
                emb = asyncio.run(RAGService.get_embedding(text))
                chunk = DocumentChunk(
                    document_id=doc1.id,
                    chunk_text=text,
                    embedding_id=f"doc_{doc1.id}_chunk_{idx}",
                    embedding=emb
                )
                db.add(chunk)
                
        doc2_title = "CRISPR_Gene_Editing_Safety.txt"
        doc2 = db.query(Document).filter(Document.filename == doc2_title).first()
        if not doc2:
            print(f"Seeding document: {doc2_title}...")
            doc2 = Document(
                user_id=user.id,
                filename=doc2_title,
                file_type="txt",
                status="completed"
            )
            db.add(doc2)
            db.flush()
            
            chunks2 = [
                "Allogeneic CRISPR-Cas9 edited CAR-T cells (specifically CTX110) targeting the CD19 antigen represent a milestone in treating relapsed or refractory B-cell malignancies. CTX110 cells are gene-edited to prevent graft-versus-host disease (GvHD) and to reduce immune rejection by editing out the TCR and HLA class I expression pathways.",
                "In vivo CRISPR editing using NTLA-2002 target kallikrein genes in patients suffering from hereditary angioedema. NTLA-2002 has demonstrated an average 87% reduction in plasma kallikrein after a single dose, proving high target specificity and minimal off-target effects. This indicates gene editing represents a durable one-time cure."
            ]
            import asyncio
            from app.services.rag_service import RAGService
            for idx, text in enumerate(chunks2):
                emb = asyncio.run(RAGService.get_embedding(text))
                chunk = DocumentChunk(
                    document_id=doc2.id,
                    chunk_text=text,
                    embedding_id=f"doc_{doc2.id}_chunk_{idx}",
                    embedding=emb
                )
                db.add(chunk)

        # 3. Create Research Queries History
        query1_text = "Pembrolizumab vs Paclitaxel efficacy in lung cancer"
        q1 = db.query(ResearchQuery).filter(ResearchQuery.query == query1_text, ResearchQuery.user_id == user.id).first()
        if not q1:
            print("Seeding query history...")
            db.add(ResearchQuery(user_id=user.id, query=query1_text))
            db.add(ResearchQuery(user_id=user.id, query="CRISPR gene editing safety trials"))

        # 4. Create Pre-generated Report
        report_title = "Targeted Immunotherapy Outcomes Matrix"
        rep = db.query(Report).filter(Report.title == report_title, Report.user_id == user.id).first()
        if not rep:
            print("Seeding pre-generated report...")
            rep = Report(
                user_id=user.id,
                title=report_title,
                report_content="""# Targeted Immunotherapy Outcomes Matrix

## Overview
This report compares the therapeutic outcomes and safety profiles of Pembrolizumab immunotherapy and Paclitaxel chemotherapy for advanced non-small-cell lung cancer (NSCLC).

## Comparison outcomes

| Metric | Pembrolizumab Monotherapy | Paclitaxel Chemotherapy |
| :--- | :--- | :--- |
| **Mechanism** | PD-1 Immune Checkpoint Inhibitor | Microtubule Stabilizer (Antimitotic) |
| **PFS (Median)** | 10.3 Months | 6.0 Months |
| **Response Rate (ORR)** | 45.0% | 28.0% |
| **Severe Adverse Events (Grade 3+)** | 26.6% | 53.3% |
| **Common Side Effects** | Fatigue, Pruritus, Hypothyroidism | Peripheral Neuropathy, Neutropenia |

## Clinical Conclusions
Pembrolizumab monotherapy provides significantly improved survival endpoints and reduced toxic side effects compared to standard paclitaxel chemotherapy in patients with high PD-L1 expressing non-small-cell lung cancer (TPS >= 50%)."""
            )
            db.add(rep)
            db.flush()
            
            # 5. Add Citations
            db.add(Citation(
                report_id=rep.id,
                source="PubMed - PMID: 34123001",
                doi="10.1056/NEJMoa1606774",
                url="https://pubmed.ncbi.nlm.nih.gov/34123001/"
            ))
            db.add(Citation(
                report_id=rep.id,
                source="ClinicalTrials - NCT03700001",
                doi=None,
                url="https://clinicaltrials.gov/study/NCT03700001"
            ))

        db.commit()
        print("Database seeded successfully!")
        
        # 6. Seed Neo4j Knowledge Graph
        import asyncio
        asyncio.run(seed_graph())
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {str(e)}")
        raise e
    finally:
        db.close()

async def seed_graph():
    print("Seeding Neo4j Knowledge Graph...")
    from app.services.graph_service import GraphService
    # Nodes
    nodes = [
        ("Non-Small Cell Lung Cancer", "Disease"),
        ("Pembrolizumab", "Drug"),
        ("Paclitaxel", "Drug"),
        ("PD-L1", "Gene"),
        ("TPS >= 50%", "Biomarker"),
        ("Extended Survival", "Outcome"),
        ("Peripheral Neuropathy", "Outcome")
    ]
    for label, node_type in nodes:
        await GraphService.add_entity(label, node_type)

    # Edges
    edges = [
        ("Pembrolizumab", "Non-Small Cell Lung Cancer", "TREATS"),
        ("Paclitaxel", "Non-Small Cell Lung Cancer", "TREATS"),
        ("Pembrolizumab", "PD-L1", "TARGETS"),
        ("TPS >= 50%", "PD-L1", "INDICATES"),
        ("Pembrolizumab", "Extended Survival", "PRODUCES"),
        ("Paclitaxel", "Peripheral Neuropathy", "PRODUCES")
    ]
    for src, tgt, rel in edges:
        await GraphService.add_relationship(src, tgt, rel)
    print("Neo4j Knowledge Graph seeded successfully!")

if __name__ == "__main__":
    seed_database()
