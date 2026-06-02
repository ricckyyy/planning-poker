const CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

interface Props {
  selectedVote: string | null;
  onVote: (value: string) => void;
  disabled: boolean;
}

export default function CardDeck({ selectedVote, onVote, disabled }: Props) {
  return (
    <div>
      <h3>カードを選ぶ</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {CARDS.map(card => (
          <button
            key={card}
            onClick={() => onVote(card)}
            disabled={disabled}
            style={{
              width: '60px', height: '80px', fontSize: '18px',
              cursor: disabled ? 'default' : 'pointer',
              border: '2px solid',
              borderColor: selectedVote === card ? '#1976d2' : '#ccc',
              borderRadius: '8px',
              background: selectedVote === card ? '#e3f2fd' : 'white',
              fontWeight: selectedVote === card ? 'bold' : 'normal',
            }}
          >
            {card}
          </button>
        ))}
      </div>
    </div>
  );
}
