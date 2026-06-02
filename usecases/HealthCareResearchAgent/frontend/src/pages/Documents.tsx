import React from 'react';
import Sidebar from '../components/Sidebar';
import DocumentLibrary from '../components/DocumentLibrary';

export default function Documents() {
  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-6 border-b border-[var(--border-light)] pb-4">
          <h1 className="text-2xl font-bold font-['Outfit'] tracking-wide text-[var(--text-main)]">
            Document Intelligence
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Ingest scientific publications, clinical trial protocols, or corporate research documents into the RAG search database
          </p>
        </header>

        <div className="max-w-4xl">
          <DocumentLibrary />
        </div>
      </main>
    </div>
  );
}
