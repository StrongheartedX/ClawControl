# OpenClaw API Integration Strategy

## 1. Endpoint Discovery
The OpenClaw Gateway operates as a WebSocket server.
- **Default Endpoint:** `ws://localhost:18789` (Local)
- **Production Endpoint:** `wss://<hostname>`
- **Discovery Mechanism:** Manual configuration via UI Settings.

## 2. Protocol Overview
The client communicates using a **custom frame-based protocol (v3)** over WebSocket. All frames are JSON objects with a `type` field indicating the frame kind.

### Frame Types

**Request Frame (`req`)** — sent by the client:
```json
{
  "type": "req",
  "id": "1",
  "method": "sessions.list",
  "params": { "limit": 50 }
}
```

**Response Frame (`res`)** — sent by the server:
```json
{
  "type": "res",
  "id": "1",
  "ok": true,
  "payload": { ... }
}
```

Error responses set `ok: false` and include an `error` object:
```json
{
  "type": "res",
  "id": "1",
  "ok": false,
  "error": { "code": "AUTH_FAILED", "message": "Invalid token" }
}
```

**Event Frame (`event`)** — pushed by the server:
```json
{
  "type": "event",
  "event": "chat",
  "payload": { ... }
}
```

## 3. Authentication
Authentication uses a challenge/handshake flow immediately after the WebSocket connection opens.

**Flow:**
1. **Connect** to the WebSocket URL.
2. **Receive** a `connect.challenge` event from the server (may include a `nonce`).
3. **Send** a `connect` request with protocol version, client info, and credentials.

```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "role": "operator",
    "client": {
      "id": "gateway-client",
      "displayName": "ClawControl",
      "version": "1.0.0",
      "platform": "web",
      "mode": "backend"
    },
    "auth": { "token": "YOUR_GATEWAY_TOKEN" }
  }
}
```

The `auth` field supports two modes:
- **Token auth:** `{ "token": "..." }`
- **Password auth:** `{ "password": "..." }`

4. **Receive** a `res` frame with `payload.type: "hello-ok"` on success.

- **Token Storage:** Persisted in local storage (`clawcontrol-storage`).
- **Token Source:** Found in `~/.config/openclaw/config.json` on the server machine.

## 4. Data Schema Mapping
We map OpenClaw protocol entities to internal TypeScript interfaces.

| OpenClaw Entity | Internal Interface | File |
|-----------------|-------------------|------|
| `session` | `Session` | `src/lib/openclaw/types.ts` |
| `message` | `Message` | `src/lib/openclaw/types.ts` |
| `agent` | `Agent` | `src/lib/openclaw/types.ts` |
| `skill` | `Skill` | `src/lib/openclaw/types.ts` |
| `cronJob` | `CronJob` | `src/lib/openclaw/types.ts` |
| `agentFile` | `AgentFile` | `src/lib/openclaw/types.ts` |

**Key RPC Methods:**
- `sessions.list` — List chat sessions
- `sessions.delete` — Delete a session
- `sessions.patch` — Update session metadata (e.g., label)
- `sessions.spawn` — Spawn a new isolated subagent session
- `chat.send` — Send a message
- `chat.history` — Retrieve message history for a session
- `agents.list` — List available agents
- `agent.identity.get` — Get agent identity (name, emoji, avatar)
- `agents.files.list` / `agents.files.get` / `agents.files.set` — Agent workspace files
- `skills.status` — List skills with status
- `skills.update` — Enable/disable a skill
- `skills.install` — Install a skill
- `cron.list` / `cron.get` / `cron.update` — Cron job management
- `config.get` — Read full server config (returns `{ config, hash, path, exists, valid }`)
- `config.patch` — Write partial config updates (accepts `{ raw: JSON, baseHash }`, triggers server restart via SIGUSR1)

## 5. Streaming Events
The server pushes real-time events for chat and agent activity. All events include an optional `sessionKey` field identifying which session they belong to.

### Per-Session Stream Isolation
The client uses `Map<string, SessionStreamState>` to track stream state independently per session. Each session maintains its own stream source, accumulated text, mode, and content block offset. This enables concurrent conversations with multiple agents without cross-contaminating text buffers.

**`SessionStreamState` fields:**
- `source` — `'chat' | 'agent' | null` — first event type to arrive claims the session
- `text` — accumulated streaming text
- `mode` — `'delta' | 'cumulative' | null` — detected streaming mode
- `blockOffset` — tracks content block boundaries for cumulative text merging
- `started` — whether the stream has begun
- `runId` — correlates events within a single agent turn

### Event Types

**`chat` event** — Message streaming:
- `state: "delta"` — Cumulative text chunk in `delta` or `message.content` field
- `state: "final"` — Complete message in `message` field (canonical)

**`agent` event** — Agent activity streaming:
- `stream: "assistant"` — Text output with `data.text` (cumulative per content block) or `data.delta`
- `stream: "tool"` — Tool call with `data.name`, `data.phase` (`start`/`result`), `data.result`
- `stream: "lifecycle"` — Agent lifecycle; `data.state: "complete"` or `data.phase: "end"` signals end of stream

**`presence` event** — Agent online/offline status changes.

### Stream Source Arbitration
For each session, the first event type (`chat` or `agent`) to arrive claims that session's stream. Subsequent events from the other source are ignored for that session, preventing duplicate content when both event types fire for the same response.

### Cumulative Text Merging
The server sends `data.text` as cumulative per content block (resets after tool calls). The client detects rewinds (when new text is shorter than accumulated text) and accumulates with `\n\n` separators across blocks.

### Parent Session Tracking & Subagent Detection
`parentSessionKeys: Set<string>` tracks sessions the user has explicitly sent messages to. Events from unknown session keys (not in the parent set) are detected as subagent activity. `defaultSessionKey` (most recent send target) is used as a fallback when events arrive without a `sessionKey`.

## 5b. Server Configuration

The `config.get` and `config.patch` RPC methods provide read/write access to the full OpenClaw server configuration (400+ options).

**Reading config:**
```json
{
  "type": "req", "id": "5", "method": "config.get", "params": {}
}
// Response payload: { config: { agents: { ... }, tools: { ... }, ... }, hash: "abc123", path: "/path/to/config.json", exists: true, valid: true }
```

**Patching config:**
```json
{
  "type": "req", "id": "6", "method": "config.patch",
  "params": {
    "raw": "{\"agents\":{\"defaults\":{\"thinkingDefault\":\"medium\"}}}",
    "baseHash": "abc123"
  }
}
```

Key behaviors:
- `config.patch` uses **JSON merge patch** semantics — only specified keys are changed, others are preserved
- `baseHash` enables optimistic concurrency control; the server rejects patches if the config has changed since the hash was read
- After a successful `config.patch`, the server restarts via SIGUSR1. Clients must wait for the WebSocket to reconnect before making further calls.
- The `raw` parameter is a JSON string (not an object) to preserve key ordering

**Settings exposed in the UI (ServerSettingsView):**
- **Agent Defaults**: model, thinking level, verbose/elevated modes, timezone, time format, context tokens, timeout, concurrency limits, workspace, compaction, human delay
- **Tools & Memory**: tool profile, web search/fetch toggles + limits, exec host/timeout, elevated tools, memory backend/citations, memory search provider
- **Channels**: Per-channel enable toggle with DM policy, group policy, and history limit (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Mattermost)

## 6. Error Handling
The client implements robust error handling for the WebSocket lifecycle:

- **Connection Errors:** `ws.onerror` captures network failures (e.g., Connection Refused, SSL Errors). Certificate errors on `wss://` connections trigger a `certError` event with a URL to accept the cert.
- **Protocol Errors:** Handled via `ok: false` in response frames with structured `error` objects containing `code`, `message`, and optional `details`.
- **Request Timeouts:** Pending requests time out after 30 seconds.
- **Reconnection Logic:** Exponential backoff (1s, 2s, 4s, 8s, ...) up to 5 attempts on `ws.onclose`.

## 7. Rate Limiting
- **Client-Side:** No explicit rate limiting is currently implemented, but the UI prevents rapid-fire submissions. An idempotency key is sent with each `chat.send` to prevent duplicate messages.
- **Server-Side:** OpenClaw Gateway handles request queuing.

## 8. Testing Strategy
- **Unit Tests:** `src/lib/openclaw-client.test.ts` covers the client logic using mocked WebSockets, including per-session stream isolation, subagent detection, and concurrent streaming.
- **Integration Tests:** The test suite includes integration tests that run against a live server on port 18789 (connection, auth, session CRUD, chat, agent listing, skills, cron jobs, agent identity/files).
- **Manual Test:** Run the app and use the **Connection Settings** modal to verify connectivity against a live server.
