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
    <div style={overlay}>
      <div style={modal}>
        <h2>Planning Poker</h2>
        <p>あなたの名前を入力してください</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="名前"
            style={{ padding: '8px', fontSize: '16px', width: '200px' }}
          />
          <br /><br />
          <button type="submit" disabled={!name.trim()} style={{ padding: '8px 24px', fontSize: '16px' }}>
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modal: React.CSSProperties = {
  background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center',
};
