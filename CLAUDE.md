# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend tests (run from repo root)
npm test

# Run a single test file
cd backend && npx jest --testPathPattern=dynamo.test

# Frontend dev server
npm run dev

# CDK deploy (requires AWS credentials)
npm run deploy
```

## Architecture

npm workspaces monorepo with three packages: `frontend`, `backend`, `infra`.

**Data flow:** React (Vercel) ↔ WebSocket ↔ API Gateway WebSocket API → Lambda → DynamoDB

**Real-time:** Every state change triggers `broadcastState()` which sends the full room state to all connected members. The frontend replaces its state on every message (no diff/patch).

**Backend** (`backend/src/`):
- `lib/dynamo.ts` — all DynamoDB operations. Single table with PK/SK pattern: `ROOM#<id>/META`, `ROOM#<id>/MEMBER#<connId>`, `CONN#<connId>/META`. TTL resets to `now + 3600s` on every write.
- `lib/broadcast.ts` — fetches room state from DynamoDB and posts to all member connections via API Gateway Management API. Cleans up stale connections on `GoneException`.
- `handlers/connect.ts` — saves `CONN` record on WebSocket connect.
- `handlers/disconnect.ts` — removes member, deletes room if 0 members remain, otherwise broadcasts updated state.
- `handlers/message.ts` — routes `join | vote | reveal | reset` actions.

**Frontend** (`frontend/src/`):
- `hooks/usePoker.ts` — manages WebSocket lifecycle (auto-reconnect every 2s on close), exposes `join/vote/reveal/reset` actions. WebSocket URL comes from `VITE_WS_URL` env var.
- `pages/Home.tsx` — generates 8-char nanoid and redirects to `/rooms/:id`.
- `pages/Room.tsx` — orchestrates all components, calls `join` when WebSocket connects and `myName` is set.

**Infra** (`infra/lib/stack.ts`): CDK stack creates DynamoDB table, 3 Lambda functions (Node.js 22, esbuild bundled), API Gateway WebSocket API, and IAM policy for `execute-api:ManageConnections`.

## Deployment

- **Backend:** push to `backend/**` or `infra/**` → GitHub Actions runs `cdk deploy`
- **Frontend:** push to `frontend/**` → Vercel auto-deploys
- `frontend/.env.local` holds `VITE_WS_URL` for local dev (gitignored). Production value is set in Vercel dashboard.

## WebSocket Protocol

Client sends `{ action: "join"|"vote"|"reveal"|"reset", ...args }`. Server always responds with full state broadcast to all members. During `voting` status, `vote` fields are `null` in the broadcast; they are revealed only when `status === "revealed"`.
