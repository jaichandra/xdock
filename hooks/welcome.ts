// The banner a first-time person sees at the top of the dock: what the dock is for and the few things worth knowing,
// until they dismiss it or run a first command. Whether it was seen is one small file, outside the plugin's folder (a
// plugin update replaces that), so it is shown once per person, not once per session.

export const WELCOME_FILE = 'xdock-welcomed'

// Where the marker lives: in Claude Code's config folder.
export const welcomePath = (configDir: string | undefined, home: string | undefined): string | undefined =>
  configDir ? `${configDir.replace(/\/$/, '')}/${WELCOME_FILE}` : home ? `${home.replace(/\/$/, '')}/.claude/${WELCOME_FILE}` : undefined

export type WelcomeLine = { lead: string; text: string }

// The key facts, short enough to read at a glance. `lead` is said bold, `text` after it.
export const WELCOME_LINES: readonly WelcomeLine[] = [
  { lead: 'Run here.', text: 'Type a command below or press a suggestion. It runs in the dock, and you keep chatting.' },
  { lead: 'Claude can read it.', text: 'Ask "why did the server crash?" and it sees the output.' },
  { lead: '/x <command>', text: 'runs one, /x close hides the dock (runs keep going), /shell opens a shell.' },
  { lead: 'Links are presses.', text: 'URLs open in the browser, file paths in your editor.' },
  { lead: 'vi, ssh, less?', text: 'They need a terminal: press Attach next to the run.' },
]

// The rows the banner takes in a pane `columns` wide: the border, the title, the lines (counted high where they wrap),
// the button and the row of space after it.
export function welcomeRows(columns: number): number {
  const width = Math.max(20, columns - 4)
  const lines = WELCOME_LINES.reduce((sum, line) => sum + Math.max(1, Math.ceil((line.lead.length + 1 + line.text.length) / width)), 0)
  return 2 + 1 + lines + 1 + 1
}

// A pane too short for the banner and the dock's own parts does not show it.
export const WELCOME_MIN_ROWS = 30
