import React from 'react';
import { useResearchStore } from '../store/researchStore';
import { Check, Info, ShieldCheck, XCircle, FileSpreadsheet } from 'lucide-react';

export default function DrugComparisonTable() {
  const { comparisons } = useResearchStore();

  if (comparisons.length === 0) return null;

  const exportToCSV = () => {
    if (comparisons.length === 0) return;
    const headers = ['Drug Name', 'Class / Mechanism', 'Clinical Efficacy', 'Safety Profile', 'Adverse Side Effects'];
    const rows = comparisons.map(item => [
      item.drug,
      item.class,
      item.efficacy,
      item.safety,
      item.side_effects
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'AURA_Drug_Comparison_Matrix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="border-b border-[var(--border-light)] pb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
            Drug Intelligence Comparative Matrix
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Comparative drug safety, class, efficacy, and side effect profiles
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-gray-500 hover:text-white flex items-center gap-1.5 transition-all text-[var(--text-muted)] shrink-0 shadow-sm"
          title="Export comparison data to CSV"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-light)] bg-white/5">
              <th className="p-4 font-bold text-[var(--primary)] text-xs uppercase tracking-wider">Drug Name</th>
              <th className="p-4 font-bold text-[var(--primary)] text-xs uppercase tracking-wider">Class / Mechanism</th>
              <th className="p-4 font-bold text-[var(--primary)] text-xs uppercase tracking-wider">Clinical Efficacy</th>
              <th className="p-4 font-bold text-[var(--primary)] text-xs uppercase tracking-wider">Safety Profile</th>
              <th className="p-4 font-bold text-[var(--primary)] text-xs uppercase tracking-wider">Adverse Side Effects</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((item, idx) => (
              <tr 
                key={idx} 
                className="border-b border-[var(--border-light)] hover:bg-white/[0.02] transition-colors duration-150"
              >
                <td className="p-4 font-semibold text-[var(--text-main)] min-w-[150px]">
                  {item.drug}
                </td>
                <td className="p-4 text-[var(--text-muted)] min-w-[180px]">
                  {item.class}
                </td>
                <td className="p-4 min-w-[250px]">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-[var(--text-muted)] leading-relaxed">{item.efficacy}</span>
                  </div>
                </td>
                <td className="p-4 min-w-[220px]">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--primary)] mt-0.5 shrink-0" />
                    <span className="text-[var(--text-muted)] leading-relaxed">{item.safety}</span>
                  </div>
                </td>
                <td className="p-4 min-w-[200px]">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <span className="text-[var(--text-muted)] leading-relaxed">{item.side_effects}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
