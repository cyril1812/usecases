import React from 'react';
import Sidebar from '../components/Sidebar';
import GraphVisualizer from '../components/GraphVisualizer';

export default function KnowledgeGraph() {
  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-6 border-b border-[var(--border-light)] pb-4">
          <h1 className="text-2xl font-bold font-['Outfit'] tracking-wide text-[var(--text-main)]">
            Medical Knowledge Graph
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Map relationships between target diseases, active treatments, chemical drugs, and clinical trials outcomes
          </p>
        </header>

        <div className="max-w-5xl">
          <GraphVisualizer />
        </div>
      </main>
    </div>
  );
}
