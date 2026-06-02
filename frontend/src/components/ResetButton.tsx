interface Props { onClick: () => void; }

export default function ResetButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 32px', fontSize: '18px', cursor: 'pointer',
        background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px',
      }}
    >
      次のラウンド
    </button>
  );
}
