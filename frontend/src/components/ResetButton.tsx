interface Props { onClick: () => void; }

export default function ResetButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-48 h-12 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors duration-200 font-medium text-sm"
    >
      次のラウンド
    </button>
  );
}
