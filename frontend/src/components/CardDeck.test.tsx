import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardDeck from './CardDeck';

const CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

test('renders all 9 cards', () => {
  render(<CardDeck selectedVote={null} onVote={() => {}} disabled={false} />);
  CARDS.forEach(card => {
    expect(screen.getByText(card)).toBeInTheDocument();
  });
});

test('calls onVote with card value when clicked', async () => {
  const onVote = vi.fn();
  render(<CardDeck selectedVote={null} onVote={onVote} disabled={false} />);
  await userEvent.click(screen.getByText('5'));
  expect(onVote).toHaveBeenCalledWith('5');
});

test('does not call onVote when disabled', async () => {
  const onVote = vi.fn();
  render(<CardDeck selectedVote={null} onVote={onVote} disabled={true} />);
  await userEvent.click(screen.getByText('5'));
  expect(onVote).not.toHaveBeenCalled();
});

test('selected card is rendered', () => {
  render(<CardDeck selectedVote="8" onVote={() => {}} disabled={false} />);
  expect(screen.getByText('8')).toBeInTheDocument();
});
