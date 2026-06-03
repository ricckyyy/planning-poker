import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NameModal from './NameModal';

test('renders planning poker title', () => {
  render(<NameModal onJoin={() => {}} />);
  expect(screen.getByText('Planning Poker')).toBeInTheDocument();
});

test('renders name input', () => {
  render(<NameModal onJoin={() => {}} />);
  expect(screen.getByPlaceholderText('名前')).toBeInTheDocument();
});

test('join button disabled when input is empty', () => {
  render(<NameModal onJoin={() => {}} />);
  expect(screen.getByRole('button', { name: '参加する' })).toBeDisabled();
});

test('calls onJoin with trimmed name on submit', async () => {
  const onJoin = vi.fn();
  render(<NameModal onJoin={onJoin} />);
  await userEvent.type(screen.getByPlaceholderText('名前'), '  Alice  ');
  await userEvent.click(screen.getByRole('button', { name: '参加する' }));
  expect(onJoin).toHaveBeenCalledWith('Alice');
});
