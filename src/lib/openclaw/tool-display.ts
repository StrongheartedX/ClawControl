// Tool display resolution: maps tool names to icons, human-readable titles,
// and keys to extract detail text from args.

export type ToolIconType =
  | 'terminal'
  | 'file-text'
  | 'edit'
  | 'pen-line'
  | 'globe'
  | 'search'
  | 'folder'
  | 'database'
  | 'puzzle'

export interface ToolDisplay {
  icon: ToolIconType
  title: string
  detailKeys: string[]
}

const TOOL_MAP: Record<string, ToolDisplay> = {
  // Shell / exec
  bash:           { icon: 'terminal', title: 'Bash',           detailKeys: ['command', 'cmd'] },
  execute:        { icon: 'terminal', title: 'Execute',        detailKeys: ['command', 'cmd'] },
  exec:           { icon: 'terminal', title: 'Exec',           detailKeys: ['command', 'cmd'] },
  shell:          { icon: 'terminal', title: 'Shell',          detailKeys: ['command', 'cmd'] },
  run_command:    { icon: 'terminal', title: 'Run Command',    detailKeys: ['command', 'cmd'] },

  // File read
  read:           { icon: 'file-text', title: 'Read File',     detailKeys: ['path', 'file_path', 'filename'] },
  read_file:      { icon: 'file-text', title: 'Read File',     detailKeys: ['path', 'file_path', 'filename'] },
  cat:            { icon: 'file-text', title: 'Read File',     detailKeys: ['path', 'file_path'] },

  // File write
  write:          { icon: 'edit', title: 'Write File',         detailKeys: ['path', 'file_path', 'filename'] },
  write_file:     { icon: 'edit', title: 'Write File',         detailKeys: ['path', 'file_path', 'filename'] },
  create_file:    { icon: 'edit', title: 'Create File',        detailKeys: ['path', 'file_path', 'filename'] },

  // File edit / patch
  edit:           { icon: 'pen-line', title: 'Edit File',      detailKeys: ['path', 'file_path', 'filename'] },
  edit_file:      { icon: 'pen-line', title: 'Edit File',      detailKeys: ['path', 'file_path', 'filename'] },
  patch:          { icon: 'pen-line', title: 'Patch File',     detailKeys: ['path', 'file_path', 'filename'] },
  replace:        { icon: 'pen-line', title: 'Replace',        detailKeys: ['path', 'file_path', 'filename'] },

  // Search
  grep:           { icon: 'search', title: 'Grep',            detailKeys: ['pattern', 'query', 'regex'] },
  search:         { icon: 'search', title: 'Search',          detailKeys: ['query', 'pattern', 'term'] },
  ripgrep:        { icon: 'search', title: 'Search',          detailKeys: ['pattern', 'query'] },

  // File system
  glob:           { icon: 'folder', title: 'Find Files',      detailKeys: ['pattern', 'glob', 'path'] },
  find:           { icon: 'folder', title: 'Find',            detailKeys: ['pattern', 'path', 'name'] },
  list_dir:       { icon: 'folder', title: 'List Directory',  detailKeys: ['path', 'dir', 'directory'] },
  ls:             { icon: 'folder', title: 'List Files',      detailKeys: ['path', 'dir'] },

  // Web / browser
  web_search:     { icon: 'globe', title: 'Web Search',       detailKeys: ['query', 'q', 'search'] },
  browse:         { icon: 'globe', title: 'Browse',           detailKeys: ['url', 'href'] },
  fetch:          { icon: 'globe', title: 'Fetch',            detailKeys: ['url', 'href'] },
  http:           { icon: 'globe', title: 'HTTP Request',     detailKeys: ['url', 'href', 'endpoint'] },
  curl:           { icon: 'globe', title: 'HTTP Request',     detailKeys: ['url', 'href'] },

  // Memory / task
  memory:         { icon: 'database', title: 'Memory',        detailKeys: ['key', 'query'] },
  task:           { icon: 'database', title: 'Task',           detailKeys: ['description', 'title', 'name'] },
  remember:       { icon: 'database', title: 'Remember',      detailKeys: ['key', 'content'] },
}

/** Resolve a tool name to its display metadata. Falls back to a generic puzzle icon. */
export function resolveToolDisplay(toolName: string): ToolDisplay {
  // Exact match
  const lower = toolName.toLowerCase()
  if (TOOL_MAP[lower]) return TOOL_MAP[lower]

  // Try stripping common prefixes (e.g. "mcp_tool_bash" -> "bash")
  const stripped = lower.replace(/^(mcp_tool_|tool_|mcp_)/, '')
  if (TOOL_MAP[stripped]) return TOOL_MAP[stripped]

  // Partial match: check if any key is contained in the tool name
  for (const [key, display] of Object.entries(TOOL_MAP)) {
    if (lower.includes(key)) return display
  }

  // Fallback
  return {
    icon: 'puzzle',
    title: toolName,
    detailKeys: []
  }
}

/**
 * Extract a human-readable detail string from tool call args.
 * Traverses detailKeys in order and returns the first non-empty string value,
 * truncated to maxLen characters.
 */
export function extractToolDetail(
  args: Record<string, unknown> | undefined,
  detailKeys: string[],
  maxLen = 80
): string {
  if (!args) return ''

  for (const key of detailKeys) {
    const val = args[key]
    if (typeof val === 'string' && val.trim()) {
      const trimmed = val.trim()
      if (trimmed.length > maxLen) {
        return trimmed.slice(0, maxLen) + '\u2026'
      }
      return trimmed
    }
  }

  return ''
}
