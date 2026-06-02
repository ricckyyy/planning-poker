import { Member } from '../hooks/usePoker';

interface Props {
  members: Member[];
  status: 'voting' | 'revealed';
}

export default function MemberList({ members, status }: Props) {
  return (
    <div>
      <h3>参加者 ({members.length}人)</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {members.map(m => (
          <div key={m.name} style={cardStyle(m.hasVoted, status)}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {status === 'revealed' && m.vote ? m.vote : (m.hasVoted ? '✓' : '?')}
            </div>
            <div style={{ fontSize: '14px' }}>{m.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = (hasVoted: boolean, status: string): React.CSSProperties => ({
  width: '80px', height: '100px', border: '2px solid',
  borderColor: hasVoted ? '#4CAF50' : '#ccc',
  borderRadius: '8px', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: '8px',
  background: status === 'revealed' ? '#fff9c4' : (hasVoted ? '#e8f5e9' : 'white'),
});
