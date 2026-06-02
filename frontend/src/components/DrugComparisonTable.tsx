import React from 'react';
import { useResearchStore } from '../store/researchStore';
import { Check, Info, ShieldCheck, XCircle } from 'lucide-react';

export default function DrugComparisonTable() {
  const { comparisons } = useResearchStore();

  if (comparisons.length === 0) return null;

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="border-b border-[var(--border-light)] pb-3">
        <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
          Drug Intelligence Comparative Matrix
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Comparative drug safety, class, efficacy, and side effect profiles
        </p>
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
