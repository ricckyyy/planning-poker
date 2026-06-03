import { useState } from 'react';

const CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

interface Props {
  selectedVote: string | null;
  onVote: (value: string) => void;
  disabled: boolean;
}

export default function CardDeck({ selectedVote, onVote, disabled }: Props) {
  const [popping, setPopping] = useState<string | null>(null);

  const handleClick = (card: string) => {
    if (disabled) return;
    setPopping(card);
    setTimeout(() => setPopping(null), 150);
    onVote(card);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">カードを選ぶ</h3>
      <div className="flex flex-wrap gap-3 justify-center">
        {CARDS.map(card => {
          const isSelected = selectedVote === card;
          return (
            <button
              key={card}
              onClick={() => handleClick(card)}
              disabled={disabled}
              className={[
                'w-[72px] h-[96px] rounded-xl border flex items-center justify-center text-2xl font-bold text-white',
                'select-none transition-all duration-150',
                isSelected
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-500 border-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.7)]'
                  : 'bg-slate-800 border-slate-600 hover:-translate-y-1 hover:shadow-[0_0_12px_rgba(99,102,241,0.5)]',
                disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
                popping === card ? 'animate-pop' : '',
              ].filter(Boolean).join(' ')}
            >
              {card}
            </button>
          );
        })}
      </div>
    </div>
  );
}
