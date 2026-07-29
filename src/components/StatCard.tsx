type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
};

// ダッシュボードの主役（学習時間・連続日数）より一段控えめに見せる補助的な指標
export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="elevate-1 rounded-xl p-4 sm:p-5">
      <p className="type-eyebrow text-ink-tertiary">{label}</p>
      <p className="type-stat-value mt-2.5 text-ink">{value}</p>
      {sub && <p className="type-caption mt-1 text-ink-tertiary">{sub}</p>}
    </div>
  );
}
