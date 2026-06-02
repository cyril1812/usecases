import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { FileUp, File, Trash2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Document {
  id: number;
  filename: string;
  file_type: string;
  upload_date: string;
  status: 'processing' | 'completed' | 'failed';
}

export default function DocumentLibrary() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Documents
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load documents');
      return res.json() as Promise<Document[]>;
    },
    enabled: !!token
  });

  // Delete Document Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Deletion failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  // Upload File Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Check format
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt', 'html'].includes(ext)) {
      setErrorMsg('Unsupported file format. Please upload PDF, DOCX, TXT or HTML.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }

      // Success
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      // Polling refresh in case status is processing
      setTimeout(() => refetch(), 2000);
      setTimeout(() => refetch(), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Panel */}
      <div className="glass-panel p-6 flex flex-col items-center justify-center border-dashed border-2 border-[var(--border-medium)] hover:border-[var(--primary)] transition-colors duration-200">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".pdf,.docx,.txt,.html"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center gap-3 cursor-pointer w-full text-center py-6"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--primary-glow)] flex items-center justify-center text-[var(--primary)] mb-2">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--text-main)] block">
              {uploading ? 'Processing File...' : 'Upload research documents'}
            </span>
            <span className="text-xs text-[var(--text-muted)] mt-1 block">
              Supports PDF, DOCX, TXT, and HTML. Maximum file size 25MB.
            </span>
          </div>
        </label>
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-[var(--primary)] font-semibold mt-2 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing, chunking and indexing text vectors in Pinecone index...
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-red-400 font-semibold mt-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {errorMsg}
          </div>
        )}
      </div>

      {/* Library List */}
      <div className="glass-panel p-5 flex flex-col gap-4">
        <div className="border-b border-[var(--border-light)] pb-3">
          <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
            Ingested Document Library
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Manage files parsed into the semantic vector search RAG pipeline
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--text-dim)]">
            No documents ingested yet. Upload files above to build your research library database.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-white/5">
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">File Name</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Type</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Date Ingested</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Pipeline Status</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr 
                    key={doc.id} 
                    className="border-b border-[var(--border-light)] hover:bg-white/[0.01] transition-colors duration-150"
                  >
                    <td className="p-4 font-semibold text-[var(--text-main)] flex items-center gap-3">
                      <File className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)] uppercase text-xs font-bold">
                      {doc.file_type}
                    </td>
                    <td className="p-4 text-[var(--text-dim)]">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {doc.status === 'completed' ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Indexed (RAG active)
                        </div>
                      ) : doc.status === 'failed' ? (
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Index Failed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--primary)] text-xs font-semibold animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Vectorizing...
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-red-500/30 flex items-center justify-center text-[var(--text-dim)] hover:text-red-400 transition-all duration-200"
                        title="Delete document and remove vector index"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
