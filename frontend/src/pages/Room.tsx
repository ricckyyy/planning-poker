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

  if (!myName) return <NameModal onJoin={setMyName} />;

  const allVoted = (state?.members ?? []).length > 0 &&
    (state?.members ?? []).every(m => m.hasVoted);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Planning Poker</h1>
      <p style={{ color: connected ? 'green' : 'red' }}>
        {connected ? '接続中' : '再接続中...'}
      </p>
      <p style={{ fontFamily: 'monospace', color: '#666', fontSize: '14px' }}>
        このURLをチームに共有: {window.location.href}
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          style={{ marginLeft: '8px', cursor: 'pointer', padding: '2px 8px' }}
        >
          コピー
        </button>
      </p>

      {state && (
        <>
          <MemberList members={state.members} status={state.status} />
          <br />
          {state.status === 'voting' ? (
            <>
              <CardDeck selectedVote={myVote} onVote={handleVote} disabled={false} />
              <br />
              <RevealButton allVoted={allVoted} onClick={reveal} />
            </>
          ) : (
            <ResetButton onClick={reset} />
          )}
        </>
      )}
    </div>
  );
}
