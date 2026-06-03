import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RevealButton from './RevealButton';

test('renders reveal button', () => {
  render(<RevealButton allVoted={false} onClick={() => {}} />);
  expect(screen.getByRole('button', { name: 'カードを公開' })).toBeInTheDocument();
});

test('calls onClick when allVoted is true', async () => {
  const onClick = vi.fn();
  render(<RevealButton allVoted={true} onClick={onClick} />);
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
