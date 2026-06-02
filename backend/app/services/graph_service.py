import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

# Local in-memory graph fallback
# Format: {"nodes": [{"id": str, "label": str, "type": str}], "edges": [{"id": str, "source": str, "target": str, "type": str}]}
MOCK_GRAPH: Dict[str, List[Dict[str, Any]]] = {
    "nodes": [
        {"id": "Non-Small Cell Lung Cancer", "label": "Non-Small Cell Lung Cancer", "type": "Disease"},
        {"id": "Pembrolizumab", "label": "Pembrolizumab", "type": "Drug"},
        {"id": "Paclitaxel", "label": "Paclitaxel", "type": "Drug"},
        {"id": "PD-L1", "label": "PD-L1", "type": "Gene"},
        {"id": "TPS >= 50%", "label": "TPS >= 50%", "type": "Biomarker"},
        {"id": "Extended Survival", "label": "Extended Survival", "type": "Outcome"},
        {"id": "Peripheral Neuropathy", "label": "Peripheral Neuropathy", "type": "Outcome"}
    ],
    "edges": [
        {"id": "e1", "source": "Pembrolizumab", "target": "Non-Small Cell Lung Cancer", "type": "TREATS"},
        {"id": "e2", "source": "Paclitaxel", "target": "Non-Small Cell Lung Cancer", "type": "TREATS"},
        {"id": "e3", "source": "Pembrolizumab", "target": "PD-L1", "type": "TARGETS"},
        {"id": "e4", "source": "TPS >= 50%", "target": "PD-L1", "type": "INDICATES"},
        {"id": "e5", "source": "Pembrolizumab", "target": "Extended Survival", "type": "PRODUCES"},
        {"id": "e6", "source": "Paclitaxel", "target": "Peripheral Neuropathy", "type": "PRODUCES"}
    ]
}

class GraphService:
    @staticmethod
    def _get_driver():
        if settings.MOCK_NEO4J:
            return None
        try:
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(
                settings.NEO4J_URI, 
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            return driver
        except Exception as e:
            logger.warning(f"Failed to connect to Neo4j: {str(e)}. Enabling mock graph database fallback.")
            return None

    @staticmethod
    async def add_entity(name: str, entity_type: str) -> None:
        """Add node to Neo4j or mock store."""
        driver = GraphService._get_driver()
        if not driver:
            # Add to local mock
            # Check duplicates
            exists = any(node["id"] == name for node in MOCK_GRAPH["nodes"])
            if not exists:
                MOCK_GRAPH["nodes"].append({
                    "id": name,
                    "label": name,
                    "type": entity_type.capitalize()
                })
            return

        try:
            with driver.session() as session:
                query = f"MERGE (n:{entity_type.capitalize()} {{id: $name}}) SET n.label = $name"
                session.run(query, name=name)
        except Exception as e:
            logger.error(f"Error adding entity to Neo4j: {str(e)}")
            # Fallback
            exists = any(node["id"] == name for node in MOCK_GRAPH["nodes"])
            if not exists:
                MOCK_GRAPH["nodes"].append({"id": name, "label": name, "type": entity_type.capitalize()})

    @staticmethod
    async def add_relationship(source_name: str, target_name: str, relationship_type: str) -> None:
        """Add directed edge to Neo4j or mock store."""
        driver = GraphService._get_driver()
        if not driver:
            # Add to local mock
            edge_id = f"e_{source_name}_{target_name}_{relationship_type}".replace(" ", "_")
            exists = any(edge["id"] == edge_id for edge in MOCK_GRAPH["edges"])
            if not exists:
                MOCK_GRAPH["edges"].append({
                    "id": edge_id,
                    "source": source_name,
                    "target": target_name,
                    "type": relationship_type.upper()
                })
            return

        try:
            with driver.session() as session:
                # Dynamically construct Cypher relationship type
                query = (
                    "MATCH (a {id: $source_name}), (b {id: $target_name}) "
                    f"MERGE (a)-[r:{relationship_type.upper()}]->(b)"
                )
                session.run(query, source_name=source_name, target_name=target_name)
        except Exception as e:
            logger.error(f"Error adding relationship to Neo4j: {str(e)}")
            # Fallback
            edge_id = f"e_{source_name}_{target_name}_{relationship_type}".replace(" ", "_")
            exists = any(edge["id"] == edge_id for edge in MOCK_GRAPH["edges"])
            if not exists:
                MOCK_GRAPH["edges"].append({
                    "id": edge_id,
                    "source": source_name,
                    "target": target_name,
                    "type": relationship_type.upper()
                })

    @staticmethod
    async def get_graph_data() -> Dict[str, List[Dict[str, Any]]]:
        """Fetch all entities and relationships for graph visualization."""
        driver = GraphService._get_driver()
        if not driver:
            return MOCK_GRAPH

        try:
            with driver.session() as session:
                # Fetch nodes
                node_query = "MATCH (n) RETURN n.id as id, labels(n)[0] as type, n.label as label"
                node_results = session.run(node_query)
                nodes = []
                for record in node_results:
                    nodes.append({
                        "id": record["id"],
                        "label": record["label"] or record["id"],
                        "type": record["type"] or "Entity"
                    })

                # Fetch edges
                edge_query = "MATCH (a)-[r]->(b) RETURN a.id as source, b.id as target, type(r) as type"
                edge_results = session.run(edge_query)
                edges = []
                for idx, record in enumerate(edge_results):
                    edges.append({
                        "id": f"e{idx}",
                        "source": record["source"],
                        "target": record["target"],
                        "type": record["type"]
                    })

                return {"nodes": nodes, "edges": edges}
        except Exception as e:
            logger.error(f"Error reading graph data from Neo4j: {str(e)}")
            return MOCK_GRAPH
