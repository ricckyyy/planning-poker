import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePoker } from '../hooks/usePoker';
import NameModal from '../components/NameModal';
import MemberList from '../components/MemberList';
import CardDeck from '../components/CardDeck';
import RevealButton from '../components/RevealButton';
import ResetButton from '../components/ResetButton';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, connected, join, vote, reveal, reset } = usePoker();
  const [myName, setMyName] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (connected && myName && roomId) {
      join(roomId, myName);
    }
  }, [connected, myName, roomId]);

  useEffect(() => {
    if (state?.status === 'voting') setMyVote(null);
  }, [state?.status]);

  const handleVote = (value: string) => {
    setMyVote(value);
    vote(value);
  };

  const handleReset = () => {
    setResetKey(k => k + 1);
    reset();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!myName) return <NameModal onJoin={setMyName} />;

  const allVoted = (state?.members ?? []).length > 0 &&
    (state?.members ?? []).every(m => m.hasVoted);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-50">Planning Poker</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
              />
              <span className="text-xs text-slate-400">
                {connected ? '接続中' : '再接続中...'}
              </span>
            </div>
            <button
              onClick={handleCopyUrl}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors duration-150"
            >
              {copied ? 'コピー済み ✓' : 'URLをコピー'}
            </button>
          </div>
        </header>

        {/* Room URL */}
        <p className="font-mono text-xs text-slate-600 text-center truncate">
          {window.location.href}
        </p>

        {/* Game area */}
        {state && (
          <div className="flex flex-col gap-8">
            <MemberList members={state.members} status={state.status} resetKey={resetKey} />

            {state.status === 'voting' ? (
              <div className="flex flex-col items-center gap-6">
                <CardDeck selectedVote={myVote} onVote={handleVote} disabled={false} />
                <RevealButton allVoted={allVoted} onClick={reveal} />
              </div>
            ) : (
              <div className="flex justify-center">
                <ResetButton onClick={handleReset} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
