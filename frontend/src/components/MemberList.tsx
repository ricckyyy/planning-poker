import { Member } from '../hooks/usePoker';

interface Props {
  members: Member[];
  status: 'voting' | 'revealed';
  resetKey: number;
}

export default function MemberList({ members, status, resetKey }: Props) {
  const isRevealed = status === 'revealed';

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">
        参加者 ({members.length}人)
      </h3>
      <div className="flex flex-wrap gap-4 justify-center">
        {members.map((m, i) => (
          <div
            key={`${m.name}-${resetKey}`}
            className="flex flex-col items-center gap-1 animate-card-pop-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="card-flip-wrapper w-20 h-24">
              <div className={`card-flip-inner w-full h-full ${isRevealed ? 'is-flipped' : ''}`}>
                {/* Front face */}
                <div
                  className={[
                    'card-face absolute inset-0 rounded-xl border-2 flex items-center justify-center transition-all duration-300',
                    m.hasVoted
                      ? 'bg-slate-800 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                      : 'bg-slate-800 border-slate-600',
                  ].join(' ')}
                >
                  <span className={`text-2xl font-bold ${m.hasVoted ? 'text-green-400' : 'text-slate-500'}`}>
                    {m.hasVoted ? '✓' : '?'}
                  </span>
                </div>
                {/* Back face (revealed) */}
                <div className="card-face card-face-back absolute inset-0 rounded-xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{m.vote ?? '?'}</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-400">{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
