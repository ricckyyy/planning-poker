interface Props {
  allVoted: boolean;
  onClick: () => void;
}

export default function RevealButton({ allVoted, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 32px', fontSize: '18px', cursor: 'pointer',
        background: allVoted ? '#4CAF50' : '#9E9E9E',
        color: 'white', border: 'none', borderRadius: '8px',
      }}
    >
      カードを公開
    </button>
  );
}
