import { useState, FormEvent } from 'react';

interface Props {
  onJoin: (name: string) => void;
}

export default function NameModal({ onJoin }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-slate-50 mb-2 text-center">Planning Poker</h2>
        <p className="text-slate-400 text-sm text-center mb-6">あなたの名前を入力してください</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="名前"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-50 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-2 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(99,102,241,0.5)] transition-all duration-200"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
