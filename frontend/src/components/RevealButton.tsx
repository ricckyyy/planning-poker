interface Props {
  allVoted: boolean;
  onClick: () => void;
}

export default function RevealButton({ allVoted, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-48 h-12 rounded-xl font-medium text-sm text-white transition-all duration-200',
        allVoted
          ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_28px_rgba(99,102,241,0.7)]'
          : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60',
      ].join(' ')}
    >
      カードを公開
    </button>
  );
}
