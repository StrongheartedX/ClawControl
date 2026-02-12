# ClawControl

A cross-platform desktop and mobile client for OpenClaw AI assistant. Built with Electron, React, and TypeScript.

> **Latest Release: [v1.1.0](https://github.com/jakeledwards/ClawControl/releases/tag/v1.1.0)** — Download the [installer](https://github.com/jakeledwards/ClawControl/releases/download/v1.1.0/ClawControl.Setup.1.1.0.exe) or [portable exe](https://github.com/jakeledwards/ClawControl/releases/download/v1.1.0/ClawControl.1.1.0.exe) for Windows.

## Features

- **Concurrent Agent Streaming**: Talk to multiple agents simultaneously with per-session stream isolation
- **Chat Interface**: Clean, modern chat UI with streaming support, markdown rendering, and code block copy buttons
- **Thinking Mode**: Toggle extended thinking for complex tasks with visible reasoning display
- **Agent Selection**: Switch between different AI agents with per-session agent identity
- **Agent Management**: Create, delete, and browse agent profiles, configuration, and workspace files
- **Sessions Management**: Create, view, and manage chat sessions with unread message indicators
- **Subagent Spawning**: Spawn isolated subagent sessions for parallel task execution, with inline status blocks and popout windows
- **ClawHub Skill Browser**: Search and browse available skills with VirusTotal security scan badges, download stats, and one-click install
- **Tool Call Visibility**: See tool calls inline during chat as the agent works
- **Stop Button**: Abort in-progress chat streams at any time
- **Server Settings**: Full-page editor for OpenClaw server configuration — agent defaults, tools & memory, and channel settings with dirty tracking and conflict detection
- **Cron Jobs**: View and manage scheduled tasks with live status updates
- **Dark/Light Theme**: Full theme support with system preference detection
- **Cross-Platform**: Windows, macOS, iOS, and Android support via Electron and Capacitor

## Screenshots

<p align="center">
  <img src="screenshots/home.png" width="600" alt="Main Chat Interface">
  <br><em>Main chat interface with session sidebar and quick-start prompts</em>
</p>

<p align="center">
  <img src="screenshots/agent.png" width="600" alt="Agent Profile">
  <br><em>Agent profile view with configuration and workspace files</em>
</p>

<p align="center">
  <img src="screenshots/skills.png" width="600" alt="Skills Panel">
  <br><em>Installed skills panel</em>
</p>

<p align="center">
  <img src="screenshots/skillsearch.png" width="600" alt="ClawHub Skill Browser">
  <br><em>ClawHub skill browser with search, security scan badges, and skill details</em>
</p>

<p align="center">
  <img src="screenshots/subagents.png" width="600" alt="Subagent Blocks">
  <br><em>Inline subagent status blocks with popout links</em>
</p>

<p align="center">
  <img src="screenshots/subagentchat.png" width="600" alt="Subagent Chat Window">
  <br><em>Subagent popout window showing an isolated conversation</em>
</p>

<p align="center">
  <img src="screenshots/cronjob.png" width="600" alt="Cron Jobs">
  <br><em>Cron job management</em>
</p>

<p align="center">
  <img src="screenshots/connect.png" width="600" alt="Connection Settings">
  <br><em>Connection and authentication settings</em>
</p>

## Download

Pre-built Windows binaries are available on the [Releases](https://github.com/jakeledwards/ClawControl/releases) page:

- **ClawControl Setup 1.1.0.exe** — Windows installer
- **ClawControl 1.1.0.exe** — Portable executable (no installation required)

### What's New in v1.1.0

- Stop button to abort in-progress chat streams
- Copy button on code blocks
- Subagent inline status blocks and popout windows
- ClawHub skill browser with VirusTotal security scan badges
- Agent create and delete support
- Tool call visibility in chat
- Capacitor mobile support (iOS and Android)
- Numerous streaming and session fixes

See the full [release notes](https://github.com/jakeledwards/ClawControl/releases/tag/v1.1.0) for details.

## Installation (from source)

```bash
# Clone the repository
git clone git@github.com:jakeledwards/ClawControl.git
cd ClawControl

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Configuration

The app connects to your local OpenClaw instance. Default configuration:
- **Server URL**: `wss://your-server.local` or `ws://localhost:8080`

### Connecting to a Local Server

1. Make sure your OpenClaw server is running on your local network.
2. In the app, open **Settings** (gear icon).
3. Set **Server URL** to your local WebSocket endpoint (for example: `ws://192.168.1.50:8080`).
4. If your server requires auth, set **Authentication Mode** and enter your **Gateway Token/Password**.
5. Click **Save & Connect**.

### Connecting Through Tailscale

You must be connected to Tailscale before the app can reach your OpenClaw server.

1. Connect your computer to Tailscale.
2. Get your server's Tailscale hostname or IP.
3. In the app, open **Settings** (gear icon).
4. Set **Server URL** to your Tailscale endpoint (for example: `wss://your-server.tailnet-123.ts.net`).
5. If your server requires auth, set **Authentication Mode** and enter your **Gateway Token/Password**.
6. Click **Save & Connect**.

### Settings Management

You can configure the connection details directly in the application by clicking the **Settings (Gear)** icon in the top bar.

**Available Options:**
1.  **Server URL**: The WebSocket URL of your OpenClaw instance.
    - **Validation**: Must start with `ws://` (insecure) or `wss://` (secure).
    - **Example**: `wss://your-server.local` or `ws://localhost:8080`
2.  **Authentication Mode**: Toggle between Token and Password authentication.
3.  **Gateway Token/Password**: The credential for your OpenClaw instance (if enabled).

Settings are automatically persisted between sessions. If you change the URL or credentials, click **Save & Connect** to apply the changes and attempt a reconnection.

### Server Settings

Once connected, you can configure the OpenClaw server itself from within ClawControl:

1. Open **Settings** (gear icon) and click **OpenClaw Server Settings**.
2. Browse three tabs of server configuration:
   - **Agent Defaults**: Primary model, thinking level, verbose/elevated modes, timezone, time format, context token limits, timeouts, concurrency, workspace, compaction mode, human delay
   - **Tools & Memory**: Tool profile preset, web search/fetch toggles and limits, code execution host and timeout, elevated tools, memory backend, citations, memory search provider
   - **Channels**: Per-channel enable toggles for WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and Mattermost, with DM/group policies and history limits
3. Make changes — a save bar appears at the bottom when edits are detected.
4. Click **Save** to apply. The server restarts automatically and the app reconnects.

### Authentication Modes

ClawControl supports two authentication modes, matching your server's `gateway.auth.mode` setting:

| Mode | Server Config | Auth Payload |
|------|---------------|--------------|
| **Token** | `gateway.auth.mode = "token"` | `{ token: "your-token" }` |
| **Password** | `gateway.auth.mode = "password"` | `{ password: "your-password" }` |

Select the mode that matches your OpenClaw server configuration.

### Self-Signed Certificates

When connecting to a server with a self-signed or untrusted SSL certificate, you may encounter a certificate error.

**To resolve:**
1. ClawControl will detect the certificate error and show a modal
2. Click "Open URL to Accept Certificate" to open the HTTPS URL in your browser
3. Accept the browser's certificate warning (e.g., "Proceed to site" or "Accept the risk")
4. Close the browser tab and retry the connection in ClawControl


You can change this in the app settings or by modifying `src/store/index.ts`.

## Development

```bash
# Start development server with hot reload
npm run dev

# Run type checking
npm run typecheck

# Run tests
npm run test

# Run tests once
npm run test:run
```

## Building

### Windows (from Windows)

```bash
npm run build:win
```

Output: `release/ClawControl Setup.exe` and `release/ClawControl Portable.exe`

### macOS (from macOS)

```bash
npm run build:mac
```

Output: `release/ClawControl.dmg`

### Cross-Platform Note

Building Windows packages from Linux/WSL requires Wine. For best results:
- Build Windows packages on Windows
- Build macOS packages on macOS

## Project Structure

```
clawcontrol/
├── electron/              # Electron main process
│   ├── main.ts            # Main process entry
│   └── preload.ts         # Preload script (IPC bridge)
├── src/
│   ├── components/        # React components
│   │   ├── ChatArea.tsx
│   │   ├── InputArea.tsx
│   │   ├── RightPanel.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── CertErrorModal.tsx
│   │   ├── SkillDetailView.tsx
│   │   ├── CronJobDetailView.tsx
│   │   ├── AgentDetailView.tsx
│   │   └── ServerSettingsView.tsx
│   ├── lib/
│   │   ├── openclaw/            # Modular WebSocket client
│   │   │   ├── client.ts        # Core connection, event routing, per-session stream state
│   │   │   ├── types.ts         # Protocol frame types, domain interfaces
│   │   │   ├── chat.ts          # chat.send, chat.history, chat.abort
│   │   │   ├── sessions.ts      # Session CRUD and sessions.spawn
│   │   │   ├── agents.ts        # Agent listing, identity, files, create/delete
│   │   │   ├── config.ts        # Server config read/write (config.get, config.patch)
│   │   │   ├── skills.ts        # Skill listing, toggle, install
│   │   │   ├── cron-jobs.ts     # Cron job listing, toggle, details
│   │   │   ├── utils.ts         # ANSI stripping, content extraction, helpers
│   │   │   └── index.ts         # Public re-exports
│   │   ├── openclaw-client.test.ts  # Integration tests (Vitest)
│   │   └── platform.ts         # Platform abstraction (Electron/Capacitor/web)
│   ├── store/
│   │   └── index.ts       # Zustand state management
│   ├── styles/
│   │   └── index.css      # Main stylesheet
│   ├── App.tsx
│   └── main.tsx
├── build/                 # App icons and build assets
├── scripts/               # Utility scripts
└── capacitor.config.ts    # Capacitor mobile config
```

## OpenClaw API

ClawControl communicates with OpenClaw using a custom frame-based protocol (v3) over WebSocket. The protocol uses three frame types:

### Frame Types

**Request Frame** - Client to server RPC calls:
```javascript
{
  type: 'req',
  id: '1',
  method: 'chat.send',
  params: { sessionKey: 'session-123', message: 'Hello!' }
}
```

**Response Frame** - Server responses to requests:
```javascript
{
  type: 'res',
  id: '1',
  ok: true,
  payload: { /* result data */ }
}
```

**Event Frame** - Server-pushed events (streaming, presence, etc.):
```javascript
{
  type: 'event',
  event: 'chat',
  payload: { state: 'delta', message: { content: '...' } }
}
```

### Connection Handshake

On connect, the server sends a `connect.challenge` event. The client responds with:
```javascript
{
  type: 'req',
  id: '1',
  method: 'connect',
  params: {
    minProtocol: 3,
    maxProtocol: 3,
    role: 'operator',
    client: { id: 'gateway-client', displayName: 'ClawControl', version: '1.0.0' },
    auth: { token: 'your-token' }  // or { password: 'your-password' }
  }
}
```

### Available Methods

**Sessions**
- `sessions.list` - List all sessions (supports `includeDerivedTitles`, `includeLastMessage`, `limit`)
- `sessions.delete` - Delete a session by key
- `sessions.patch` - Update session properties (e.g., label)

**Chat**
- `chat.send` - Send a message (`sessionKey`, `message`, `thinking`)
- `chat.history` - Get messages for a session

**Agents**
- `agents.list` - List available agents

**Skills**
- `skills.status` - List skills with full metadata (enabled state, requirements, install options)
- `skills.update` - Enable/disable a skill
- `skills.install` - Install a skill

**Configuration**
- `config.get` - Read the full server config (returns config object + hash for conflict detection)
- `config.patch` - Write partial config updates via JSON merge patch (triggers server restart)

**Cron Jobs**
- `cron.list` - List scheduled jobs
- `cron.get` - Get full cron job details
- `cron.update` - Update job status (active/paused)

### Full Method List (From `hello-ok`)

This is the complete set of RPC method names reported by the server in `hello-ok.payload.features.methods`. This list can vary by server version and configuration.

```text
health
logs.tail
channels.status
channels.logout
status
usage.status
usage.cost
tts.status
tts.providers
tts.enable
tts.disable
tts.convert
tts.setProvider
config.get
config.set
config.apply
config.patch
config.schema
exec.approvals.get
exec.approvals.set
exec.approvals.node.get
exec.approvals.node.set
exec.approval.request
exec.approval.resolve
wizard.start
wizard.next
wizard.cancel
wizard.status
talk.mode
models.list
agents.list
agents.files.list
agents.files.get
agents.files.set
skills.status
skills.bins
skills.install
skills.update
update.run
voicewake.get
voicewake.set
sessions.list
sessions.preview
sessions.patch
sessions.reset
sessions.delete
sessions.compact
last-heartbeat
set-heartbeats
wake
node.pair.request
node.pair.list
node.pair.approve
node.pair.reject
node.pair.verify
device.pair.list
device.pair.approve
device.pair.reject
device.token.rotate
device.token.revoke
node.rename
node.list
node.describe
node.invoke
node.invoke.result
node.event
cron.list
cron.status
cron.add
cron.update
cron.remove
cron.run
cron.runs
system-presence
system-event
send
agent
agent.identity.get
agent.wait
browser.request
chat.history
chat.abort
chat.send
```

### Streaming Events

Chat responses stream via `event` frames. All events include an optional `sessionKey` for per-session routing.

- `chat` event with `state: 'delta'` — Cumulative text chunks
- `chat` event with `state: 'final'` — Complete message (canonical)
- `agent` event with `stream: 'assistant'` — Text output (cumulative per content block)
- `agent` event with `stream: 'tool'` — Tool call start/result
- `agent` event with `stream: 'lifecycle'` — Agent lifecycle (complete/end signals)
- `presence` event — Agent online/offline status

The client uses per-session stream isolation (`Map<string, SessionStreamState>`) so multiple agents can stream concurrently without cross-contaminating text buffers. Stream source arbitration ensures only one event type (`chat` or `agent`) handles text for each session.

## Tech Stack

- **Electron** - Desktop app framework
- **Capacitor** - Native mobile (iOS/Android)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **Vitest** - Testing framework

## License

MIT
