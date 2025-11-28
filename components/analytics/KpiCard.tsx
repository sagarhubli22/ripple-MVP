interface KpiCardProps {
  label: string;
  value: string | number;
  caption?: string;
}

export function KpiCard({ label, value, caption }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      {caption && <div className="mt-1 text-xs text-slate-500">{caption}</div>}
    </div>
  );
}

