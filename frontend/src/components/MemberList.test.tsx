import { render, screen } from '@testing-library/react';
import MemberList from './MemberList';

const members = [
  { name: 'Alice', hasVoted: false, vote: null },
  { name: 'Bob', hasVoted: true, vote: '5' },
];

test('renders all member names', () => {
  render(<MemberList members={members} status="voting" resetKey={0} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Bob')).toBeInTheDocument();
});

test('shows check mark for voted member during voting', () => {
  render(<MemberList members={members} status="voting" resetKey={0} />);
  expect(screen.getByText('✓')).toBeInTheDocument();
});

test('shows ? for member who has not voted', () => {
  render(<MemberList members={members} status="voting" resetKey={0} />);
  // Both front and back faces are in the DOM (CSS hides back face visually)
  expect(screen.getAllByText('?').length).toBeGreaterThan(0);
});

test('shows vote values when status is revealed', () => {
  render(<MemberList members={members} status="revealed" resetKey={0} />);
  expect(screen.getByText('5')).toBeInTheDocument();
});
