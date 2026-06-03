import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetButton from './ResetButton';

test('renders reset button', () => {
  render(<ResetButton onClick={() => {}} />);
  expect(screen.getByRole('button', { name: '次のラウンド' })).toBeInTheDocument();
});

test('calls onClick when clicked', async () => {
  const onClick = vi.fn();
  render(<ResetButton onClick={onClick} />);
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
