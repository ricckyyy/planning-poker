# Planning Poker UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all inline CSS in the Planning Poker frontend with Tailwind CSS v4 + custom animations, implementing a dark neon theme.

**Architecture:** Tailwind v4 with `@tailwindcss/vite` plugin (no config file needed). Custom animations defined in `src/index.css`. Vitest + Testing Library for component tests. No behavior changes — styling only.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS v4 (`@tailwindcss/vite`), Vitest, @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/package.json` | Modify | Add tailwindcss, @tailwindcss/vite, vitest, testing-library deps |
| `frontend/vite.config.ts` | Modify | Add Tailwind plugin + Vitest config |
| `frontend/tsconfig.json` | Modify | Add `vitest/globals` to types |
| `frontend/index.html` | Modify | Inter font, `class="dark"` on `<html>` |
| `frontend/src/index.css` | Create | Tailwind import + card flip + pop animations |
| `frontend/src/main.tsx` | Modify | Import index.css |
| `frontend/src/test-setup.ts` | Create | jest-dom matchers setup |
| `frontend/src/components/NameModal.tsx` | Modify | Dark modal with blur backdrop |
| `frontend/src/components/NameModal.test.tsx` | Create | Render + interaction tests |
| `frontend/src/components/CardDeck.tsx` | Modify | Dark cards + hover/glow + pop animation |
| `frontend/src/components/CardDeck.test.tsx` | Create | Cards render + selection tests |
| `frontend/src/components/MemberList.tsx` | Modify | Voted glow + card flip + stagger pop-in |
| `frontend/src/components/MemberList.test.tsx` | Create | Voted state + reveal tests |
| `frontend/src/components/RevealButton.tsx` | Modify | Gradient CTA with glow |
| `frontend/src/components/RevealButton.test.tsx` | Create | Active/inactive state tests |
| `frontend/src/components/ResetButton.tsx` | Modify | Outline ghost button |
| `frontend/src/components/ResetButton.test.tsx` | Create | Render + click test |
| `frontend/src/pages/Room.tsx` | Modify | Dark layout, header bar, resetKey for pop-in |

---

### Task 1: Install Tailwind CSS v4 & configure

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/index.css`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/index.html`

- [ ] **Step 1: Install Tailwind v4**

Run from repo root (so workspace hoisting works):
```bash
cd /path/to/planning-poker/frontend && npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Update vite.config.ts**

Replace `frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 3: Create src/index.css**

Create `frontend/src/index.css`:
```css
@import "tailwindcss";

/* Card selection pop */
@keyframes pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.12); }
  100% { transform: scale(1.05); }
}

/* Member card pop-in on mount/reset */
@keyframes card-pop-in {
  0%   { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-pop {
  animation: pop 150ms ease-out forwards;
}

.animate-card-pop-in {
  animation: card-pop-in 200ms ease-out both;
}

/* Card flip (3D reveal) */
.card-flip-wrapper {
  perspective: 600px;
}

.card-flip-inner {
  transform-style: preserve-3d;
  transition: transform 0.4s ease-in-out;
  position: relative;
}

.card-flip-inner.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-face-back {
  transform: rotateY(180deg);
}
```

- [ ] **Step 4: Import CSS in main.tsx**

Replace `frontend/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Update index.html**

Replace `frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="ja" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Planning Poker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body style="font-family: 'Inter', sans-serif;">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Verify dev server starts**

Run: `cd frontend && npm run dev`
Expected: Server starts, no compilation errors in terminal

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/index.css frontend/src/main.tsx frontend/index.html
git commit -m "feat: add Tailwind CSS v4 with dark theme CSS"
```

---

### Task 2: Set up Vitest + Testing Library

**Files:**
- Modify: `frontend/package.json` (scripts + devDeps)
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test-setup.ts`
- Modify: `frontend/tsconfig.json`

- [ ] **Step 1: Install test dependencies**

```bash
cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Update vite.config.ts with test block**

Replace `frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Create test-setup.ts**

Create `frontend/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add test script and update tsconfig**

In `frontend/package.json`, add `"test": "vitest run"` to scripts:
```json
{
  "name": "frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "nanoid": "^5.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "latest",
    "tailwindcss": "latest",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "latest"
  }
}
```

In `frontend/tsconfig.json`, change `"types"` to include both existing and vitest:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Verify tests run**

Run: `cd frontend && npm test`
Expected: `No test files found` (exits 0, no errors)

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test-setup.ts frontend/tsconfig.json
git commit -m "feat: add Vitest + Testing Library"
```

---

### Task 3: Redesign NameModal

**Files:**
- Create: `frontend/src/components/NameModal.test.tsx`
- Modify: `frontend/src/components/NameModal.tsx`

- [ ] **Step 1: Write tests**

Create `frontend/src/components/NameModal.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests to confirm baseline**

Run: `cd frontend && npm test -- --reporter=verbose NameModal`
Expected: PASS (existing behavior is correct)

- [ ] **Step 3: Rewrite NameModal.tsx**

Replace `frontend/src/components/NameModal.tsx`:
```tsx
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-slate-50 mb-2 text-center">Planning Poker</h2>
        <p className="text-slate-400 text-sm text-center mb-6">あなたの名前を入力してください</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="名前"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-50 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-2 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(99,102,241,0.5)] transition-all duration-200"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- --reporter=verbose NameModal`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/NameModal.tsx frontend/src/components/NameModal.test.tsx
git commit -m "feat: redesign NameModal with dark blur backdrop"
```

---

### Task 4: Redesign CardDeck

**Files:**
- Create: `frontend/src/components/CardDeck.test.tsx`
- Modify: `frontend/src/components/CardDeck.tsx`

- [ ] **Step 1: Write tests**

Create `frontend/src/components/CardDeck.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests to confirm baseline**

Run: `cd frontend && npm test -- --reporter=verbose CardDeck`
Expected: PASS

- [ ] **Step 3: Rewrite CardDeck.tsx**

Replace `frontend/src/components/CardDeck.tsx`:
```tsx
import { useState } from 'react';

const CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

interface Props {
  selectedVote: string | null;
  onVote: (value: string) => void;
  disabled: boolean;
}

export default function CardDeck({ selectedVote, onVote, disabled }: Props) {
  const [popping, setPopping] = useState<string | null>(null);

  const handleClick = (card: string) => {
    if (disabled) return;
    setPopping(card);
    setTimeout(() => setPopping(null), 150);
    onVote(card);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">カードを選ぶ</h3>
      <div className="flex flex-wrap gap-3 justify-center">
        {CARDS.map(card => {
          const isSelected = selectedVote === card;
          return (
            <button
              key={card}
              onClick={() => handleClick(card)}
              disabled={disabled}
              className={[
                'w-[72px] h-[96px] rounded-xl border flex items-center justify-center text-2xl font-bold text-white',
                'select-none transition-all duration-150',
                isSelected
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-500 border-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.7)]'
                  : 'bg-slate-800 border-slate-600 hover:-translate-y-1 hover:shadow-[0_0_12px_rgba(99,102,241,0.5)]',
                disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
                popping === card ? 'animate-pop' : '',
              ].filter(Boolean).join(' ')}
            >
              {card}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- --reporter=verbose CardDeck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CardDeck.tsx frontend/src/components/CardDeck.test.tsx
git commit -m "feat: redesign CardDeck with indigo glow and pop animation"
```

---

### Task 5: Redesign MemberList

**Files:**
- Create: `frontend/src/components/MemberList.test.tsx`
- Modify: `frontend/src/components/MemberList.tsx`

- [ ] **Step 1: Write tests**

Create `frontend/src/components/MemberList.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests — expect FAIL on the new `resetKey` prop**

Run: `cd frontend && npm test -- --reporter=verbose MemberList`
Expected: FAIL — `resetKey` prop doesn't exist yet

- [ ] **Step 3: Rewrite MemberList.tsx**

Replace `frontend/src/components/MemberList.tsx`:
```tsx
import { Member } from '../hooks/usePoker';

interface Props {
  members: Member[];
  status: 'voting' | 'revealed';
  resetKey: number;
}

export default function MemberList({ members, status, resetKey }: Props) {
  const isRevealed = status === 'revealed';

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">
        参加者 ({members.length}人)
      </h3>
      <div className="flex flex-wrap gap-4 justify-center">
        {members.map((m, i) => (
          <div
            key={`${m.name}-${resetKey}`}
            className="flex flex-col items-center gap-1 animate-card-pop-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="card-flip-wrapper w-20 h-24">
              <div className={`card-flip-inner w-full h-full ${isRevealed ? 'is-flipped' : ''}`}>
                {/* Front face */}
                <div
                  className={[
                    'card-face absolute inset-0 rounded-xl border-2 flex items-center justify-center transition-all duration-300',
                    m.hasVoted
                      ? 'bg-slate-800 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                      : 'bg-slate-800 border-slate-600',
                  ].join(' ')}
                >
                  <span className={`text-2xl font-bold ${m.hasVoted ? 'text-green-400' : 'text-slate-500'}`}>
                    {m.hasVoted ? '✓' : '?'}
                  </span>
                </div>
                {/* Back face (revealed) */}
                <div className="card-face card-face-back absolute inset-0 rounded-xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{m.vote ?? '?'}</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-400">{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- --reporter=verbose MemberList`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MemberList.tsx frontend/src/components/MemberList.test.tsx
git commit -m "feat: redesign MemberList with voted glow, flip animation, and stagger pop-in"
```

---

### Task 6: Redesign RevealButton & ResetButton

**Files:**
- Create: `frontend/src/components/RevealButton.test.tsx`
- Create: `frontend/src/components/ResetButton.test.tsx`
- Modify: `frontend/src/components/RevealButton.tsx`
- Modify: `frontend/src/components/ResetButton.tsx`

- [ ] **Step 1: Write tests**

Create `frontend/src/components/RevealButton.test.tsx`:
```tsx
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
```

Create `frontend/src/components/ResetButton.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run tests to confirm baseline**

Run: `cd frontend && npm test -- --reporter=verbose RevealButton ResetButton`
Expected: PASS

- [ ] **Step 3: Rewrite RevealButton.tsx**

Replace `frontend/src/components/RevealButton.tsx`:
```tsx
interface Props {
  allVoted: boolean;
  onClick: () => void;
}

export default function RevealButton({ allVoted, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-48 h-12 rounded-xl font-medium text-sm text-white transition-all duration-200',
        allVoted
          ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_28px_rgba(99,102,241,0.7)]'
          : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60',
      ].join(' ')}
    >
      カードを公開
    </button>
  );
}
```

- [ ] **Step 4: Rewrite ResetButton.tsx**

Replace `frontend/src/components/ResetButton.tsx`:
```tsx
interface Props { onClick: () => void; }

export default function ResetButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-48 h-12 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors duration-200 font-medium text-sm"
    >
      次のラウンド
    </button>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `cd frontend && npm test -- --reporter=verbose RevealButton ResetButton`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/RevealButton.tsx frontend/src/components/RevealButton.test.tsx frontend/src/components/ResetButton.tsx frontend/src/components/ResetButton.test.tsx
git commit -m "feat: redesign RevealButton (gradient glow) and ResetButton (outline)"
```

---

### Task 7: Redesign Room.tsx layout & header

**Files:**
- Modify: `frontend/src/pages/Room.tsx`

Note: This task adds `resetKey` state to Room and passes it to MemberList (required by Task 5's new prop).

- [ ] **Step 1: Rewrite Room.tsx**

Replace `frontend/src/pages/Room.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePoker } from '../hooks/usePoker';
import NameModal from '../components/NameModal';
import MemberList from '../components/MemberList';
import CardDeck from '../components/CardDeck';
import RevealButton from '../components/RevealButton';
import ResetButton from '../components/ResetButton';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, connected, join, vote, reveal, reset } = usePoker();
  const [myName, setMyName] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (connected && myName && roomId) {
      join(roomId, myName);
    }
  }, [connected, myName, roomId]);

  useEffect(() => {
    if (state?.status === 'voting') setMyVote(null);
  }, [state?.status]);

  const handleVote = (value: string) => {
    setMyVote(value);
    vote(value);
  };

  const handleReset = () => {
    setResetKey(k => k + 1);
    reset();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!myName) return <NameModal onJoin={setMyName} />;

  const allVoted = (state?.members ?? []).length > 0 &&
    (state?.members ?? []).every(m => m.hasVoted);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-50">Planning Poker</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
              />
              <span className="text-xs text-slate-400">
                {connected ? '接続中' : '再接続中...'}
              </span>
            </div>
            <button
              onClick={handleCopyUrl}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors duration-150"
            >
              {copied ? 'コピー済み ✓' : 'URLをコピー'}
            </button>
          </div>
        </header>

        {/* Room URL */}
        <p className="font-mono text-xs text-slate-600 text-center truncate">
          {window.location.href}
        </p>

        {/* Game area */}
        {state && (
          <div className="flex flex-col gap-8">
            <MemberList members={state.members} status={state.status} resetKey={resetKey} />

            {state.status === 'voting' ? (
              <div className="flex flex-col items-center gap-6">
                <CardDeck selectedVote={myVote} onVote={handleVote} disabled={false} />
                <RevealButton allVoted={allVoted} onClick={reveal} />
              </div>
            ) : (
              <div className="flex justify-center">
                <ResetButton onClick={handleReset} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

Run: `cd frontend && npm test`
Expected: All tests PASS

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
Open app and confirm:
- Dark `slate-950` background
- Header: "Planning Poker" left, pulsing green dot + "URLをコピー" button right
- Monospace URL shown below header
- NameModal shows dark card with blur when no name set
- After joining: card deck with dark cards, hover lifts + glows

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Room.tsx
git commit -m "feat: redesign Room with dark layout, header bar, and connection badge"
```

---

## Verification Checklist

Manual end-to-end check after all tasks complete:

1. `cd frontend && npm run dev` → app loads with dark slate-950 background, Inter font
2. Visit room URL → NameModal shows with blurred backdrop, dark card, indigo gradient submit button
3. Enter name → header shows "Planning Poker", green pulsing dot "接続中", "URLをコピー" button
4. Click "URLをコピー" → button shows "コピー済み ✓" for 2 seconds
5. Hover a voting card → card lifts 4px and shows indigo glow
6. Click a voting card → card shows indigo→violet gradient + stronger glow
7. Click a different card → previous card deselects, new card activates
8. Open second browser tab with same URL, enter different name → their member card appears with `?` and slate border
9. Second tab votes → their member card shows green glow ring with `✓`
10. All members voted → RevealButton shows indigo gradient and glows
11. Click "カードを公開" → all member cards flip (3D) to show vote numbers simultaneously
12. Click "次のラウンド" → cards pop in with stagger animation, voting state resets
13. Kill dev server / block WebSocket → dot turns red, label shows "再接続中..."
