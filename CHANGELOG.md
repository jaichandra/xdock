# Changelog

## 0.5.7

- **No more "prompt.compose hook was skipped" line on managed machines.** The plugin no longer adds a section to the system prompt (a `prompt.compose` hook that a machine's policy module could skip, printing a notice on every prompt). The same guidance now lives in `run_output`'s description.

## 0.5.6

- **`forceColor` ships off.** `hooks/xdock.json` no longer sets `"forceColor": true`, which is what the README always said the default was. With it on, every command ran with `FORCE_COLOR=1`, and a script that looks for a phrase in a tool's output (`compiled successfully` from a build) never found it once the tool coloured it, so such a script could sit forever waiting. Commands now run as they would in a pipe; colour is opt-in with `"forceColor": true` in `hooks/xdock.json`, or per command (`FORCE_COLOR=1 npm test`).

## 0.5.5

- **Every process keeps all its output, as it printed it, in a private file.** From its first byte, a run's output is copied to `xdock-*.log` in `$TMPDIR` (readable only by you), colours, `\r` redraws and unfinished lines included, so nothing the dock cuts at its edge, tidies or scrolls off after 2,000 lines is lost. Open in shell follows that file from its first line, and `run_output` ends its answer with the file's path, so Claude can search all of it. Before, the file was made only by Open in shell, from the dock's tidied copy.
- **A command that sets its own colour is left alone by `forceColor`.** `NO_COLOR=1 make build` (or `FORCE_COLOR=0`, `CLICOLOR_FORCE=0`) runs without `FORCE_COLOR=1` added, so a script that looks for a phrase like `compiled successfully` in a tool's output still finds it. Before, `forceColor` coloured the phrase and such a script never saw it.
- **Fix: lines of output drawn over one another.** When a run printed more lines than the output box has rows, the newest lines were squeezed to no height and painted over their neighbours, so some vanished (such as a banner after a long build). Each line now keeps its row, and the oldest are cut at the top.

## 0.5.4

- **An "Ask Claude why" button next to a run that went wrong.** A run that could not start, ended with an exit code other than 0 (or was killed), or is still going but printed an error in its last 40 lines gets the button after its status. Pressing it asks Claude, as your own words, why that run failed, and points it at `run_output`. A run you stopped, or that exited 0, has none.
- **Claude is told to read a run's output first.** The `run_output` description now names failed dev runs, servers and builds, and a line in the system prompt tells Claude to call it before searching logs, Docker or processes when asked why a command failed. Before, with the tool deferred, Claude could miss it.
- **A row of space above the welcome banner's "Got it" button.**

## 0.5.3

- **A welcome banner for first-time users.** The first time the dock opens it shows a short box at the top: run commands here, Claude can read the output, `/x` and `/shell`, links are presses, and `Attach` for programs that need a terminal. Press **Got it**, or run a first command, and it goes. That is remembered in `xdock-welcomed` in Claude Code's config folder (`$CLAUDE_CONFIG_DIR`, else `~/.claude`), so it shows once per person, not once per session. Delete the file to see it again. A pane under 30 rows high does not show it.

## 0.5.2

- **Terminal runs open at their first line.** The dock shows the output of a run that has a terminal (`vi`, `less`) from its top, until you scroll.
- **`ls`, `grep` and `diff` colour their output.** With `forceColor` on, a plain command (no pipe, list, redirect or substitution) that starts with one of them gets `--color=always`, unless it already says what it wants. The dock still shows the command as typed.
- **`claude ...` command lines are coloured as commands.**
- **A screenshot at the top of the README.**
- **`/shell` and Open in shell open a terminal window on Linux** the way Attach does (a screen, outside herdr and tmux; the first terminal emulator installed). `/shell` starts `$SHELL` in the session's folder; Open in shell follows the run's output.
- **Attach opens a terminal window on Linux.** With a screen (`DISPLAY` or `WAYLAND_DISPLAY`) and outside herdr and tmux, Attach opens a window of the first terminal emulator installed: `$TERMINAL` when it is a plain program name, then `x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `alacritty`, `kitty`, `xterm`. If none opens, the button still gives the line to type.
- **The line to attach stays in the dock.** Under a run that needs a terminal, the dim hint now includes `env -u TMUX tmux -L xdock attach -t xdock`, so it can be copied into another terminal or SSH session after the toast is gone.

## 0.5.1

- **The pane is called "the dock"** in the UI and the docs (xdock stays the name of the plugin), so sentences read "Opens the dock" and "The dock follows those runs", not "Opens xdock".

## 0.5.0

- **Renamed from run-pane to xdock, and `/rp` is now `/x`; the Run pane is now xdock.** The plugin, marketplace (`jaichandra/xdock`), tool (`mcp__xdock__run_output`), config file (`hooks/xdock.json`), hidden tmux server (`tmux -L xdock`) and log files (`xdock-*.log`) carry the new name. `/rp` is gone.
- **Errors and warnings are found by what they say.** `Error: ...`, `TypeError: ...`, `error: ...`, `ERR_NAME_NOT_RESOLVED`, `npm ERR!`, `DeprecationWarning: ...`, `warning: ...` and `deprecated` were missed (a colon has no word boundary after it, and the match was case-sensitive). Stack frames (`at fn (file:1:2)`) are dim, `==>` lines are banners, and a leading `[tag]` is coloured apart from the line.
- **`hooks/xdock.json` ships with `"forceColor": true`**, so tools that colour only for a terminal (webpack, npm, ...) colour in the pane.

## 0.4.1

- **A row of space between the lines of suggestion buttons**, when they wrap.

## 0.4.0

The Run pane is where commands run, with their colours and links; a terminal is for the ones that need one.

- **Commands run in the Run pane.** Every command that does not need a terminal is a process of the plugin with its output in the pane, in herdr, tmux and iTerm2 too (0.3 typed every command into a pane). Commands that need a terminal (editors, pagers, monitors, `ssh`, REPLs with no script, `-it` containers, `git commit` with no message) get one: a pane beside Claude Code in herdr, tmux or iTerm2, else a window of a hidden tmux server (`tmux -L xdock`, started with a keeper window so exiting a shell in it does not end the server, and ended with the session). The Run pane follows what they print, including the screen an editor or pager holds, and an **Attach** button sits next to the run in the list (a window in the terminal Claude Code runs in on macOS; elsewhere the line to type). With no terminal to give, the command runs without one and says so. In `hooks/xdock.json`: `"interactive": ["mytui"]` adds first words, `"panes": "all"` gives every command a terminal as 0.3 did, `"multiplexer": false` keeps everything out of herdr, tmux and the hidden server.
- **iTerm2 without tmux.** In iTerm2, a command that needs a terminal is typed into a real iTerm pane split beside Claude Code (from the pane Claude Code runs in, not the focused one), with AppleScript. If the split fails, or the command holds a control character, the hidden tmux server takes it.
- **Colours.** The output keeps the colours and styles the command printed (16, 256 and true colour, bold, dim, italic, underline, inverse, strikethrough), carried across lines, with no other escape sequence in it (the part of a colour library that a log needs is in `hooks/ansi.ts`: the plugin has no build step). Lines the command did not style are still coloured by what they look like (banners, errors, warnings, notes). What Claude reads through `run_output` has no escape sequences. Commands are not asked to colour (`FORCE_COLOR=1` changes the text scripts read: `sandbox start ci` waits for `compiled successfully` in webpack's output before it prints its banner, and colour put escape codes inside the phrase), so a tool that colours only for a terminal prints plain text; `FORCE_COLOR=1` in the command, or `"forceColor": true` in `hooks/xdock.json`, asks for colour where it is safe.
- **Links.** A URL in the output opens in the browser when pressed, and a path in it that exists (`src/app.ts:12:5`, `./x`, `~/y`, from the run's folder) opens with what the system opens it with. They are drawn underlined, and Tab walks them like the buttons. Which paths are files is found in the background, so drawing the output never waits on the file system.
- **Open in shell** (the old Shell button) opens the selected run. A run in a hidden terminal: the Attach. A process of the plugin, which is on pipes and has no terminal to attach to: a window with everything it printed so far, then what it prints on (copied as it arrives to a private file in `$TMPDIR`, which the window tails; removed with the run). It is a view: typing there does not reach the process. With no run selected it is `/shell`.
- **`/shell` and Attach open their window in the terminal Claude Code runs in** (iTerm or Terminal.app), not in iTerm whenever it is installed: run in Terminal.app with iTerm installed, they failed with `Not authorized to send Apple events to iTerm (-1743)`, because macOS lets an app control itself but asks before one controls another. When macOS does refuse, the message says where to allow it (System Settings > Privacy & Security > Automation).
- **A new look.** Buttons are rectangles of a light colour (red for Stop, lavender for Restart, Attach and Open in shell, green for tests, grey for the rest) with a deep shade of it for the text, drawn so that the engine's own swap under the pointer and the focus does not make them black, and the same colour 10% darker under the pointer. The suggestions are in one wrapping row after a dim `Try`, the words they share (`npm run`, `make`, `cargo`) said once, coloured by what they do, and one row high like the buttons at the bottom. A row of space follows the title, the command field and the suggestions, and sits between "Nothing running..." and the buttons. Attach has a space before it in the run row. The End button is gone: scrolling down to the last line follows the output again.
- **The Run pane's output scrolls on its own** (wheel or keys, stopping at the first and last line) while the commands and the row of buttons stay in place, and the buttons are one row at the end instead of the same row above and below the output (Top and the dim help line are gone). Docs say **Run pane** for the plugin's own pane and **terminal pane** for the split a command runs in.
- **Fixes in terminal panes.** A pane just made is waited on (until its shell has drawn its prompt, five seconds at most) before the command is typed, so the terminal's echo of the line is not taken for the command and the first run no longer shows `0 lines` and `done` at once. A finished run no longer ends with the first line of a two-line prompt, and rows that end in spaces (iTerm2 pads every row) read as the lines they are.

## 0.3.0

- Inside herdr or tmux, `/x` runs each command in the last run's pane when nothing is running in it (shell at its prompt), else in a new pane beside Claude Code (below the last run's after the first); it types the command into the pane exactly as typed, so the pane keeps its history, and the Run pane follows the pane's output until the shell is at its prompt again, then marks the run done (a shell tells no exit code). `/x <command>` leaves the Run pane shut there (`/x` alone opens it) and answers with just `$ <command>`. If no pane can be made, the command runs as a process of the plugin as before. `"multiplexer": false` in `hooks/xdock.json` turns it off.
- A pane whose shell has a background job (`cmd &`, a `while ... &` loop) is not reused for the next `/x`: the job prints there, so the run gets a pane of its own.
- Leaving the session closes every multiplexer pane the plugin opened, for runs and for `/shell`; a `/clear` keeps them.
- `/shell` splits a focused pane in the session's folder in herdr or tmux. Outside them it is unchanged (a Terminal or iTerm window on macOS). The pane's button is now called Shell.

## 0.2.5

- The limited-view notice now says the buttons need Claude Code's flicker-free display mode, offers `/tui fullscreen` (switches in the session and saves the choice) next to `CLAUDE_CODE_NO_FLICKER=1 claude`, and links to https://code.claude.com/docs/en/fullscreen.
- README: the same, with the link.

## 0.2.4

- The notice for a pane above the prompt now says what is wrong: it is a limited view whose buttons may not respond, and the full pane (on the right, buttons working) needs the flicker-free display mode, `CLAUDE_CODE_NO_FLICKER=1 claude` (not a maximised window).
- README: "Turn on the flicker-free display mode" is now the first requirement.

## 0.2.3

- When the pane sits above the prompt, it shows the `CLAUDE_CODE_NO_FLICKER=1 claude` hint in bold red at its top, where it is hard to miss. The `/x` reply keeps its plain-text hint (the transcript line cannot be coloured).

## 0.2.2

- The `/x` hint for an inline pane now names the fix: start Claude Code with `CLAUDE_CODE_NO_FLICKER=1 claude` to dock the pane on the right.
- README: a note on why the pane may sit below the chat (fullscreen is off by default in some terminals) and how to turn it on.

## 0.2.1

- The pane asks for a 60 column dock when it sits beside a fullscreen transcript (the engine caps it at 45% of the terminal).
- `/x` says to open Claude Code fullscreen when the pane is inline above the prompt, since only the fullscreen layout docks it beside the chat.

## 0.2.0

- New `/x` command: `/x <command>` runs a command in the pane, `/x` opens it, `/x close` closes it. It never reaches Claude and leaves nothing in the transcript.
- The `>` prompt prefix is removed, so a prompt that starts with `>` (a quote, say) is sent to Claude as typed.

## 0.1.4

- What a `> <command>` did is shown as a toast instead of a "Prompt dropped by a hook" line in the transcript.

## 0.1.3

- The prompt box is cleared again just after the engine puts the submitted `> <command>` back, so it is really empty.

## 0.1.2

- The prompt box is cleared after a `> <command>` runs, ready for the next one.

## 0.1.1

- `/dev` is removed; use the `>` prompt prefix. Typing `>` into an empty prompt now adds a space after it.

## 0.1.0

First release as a repository of its own: the mod, taken out of the project it grew in.

- `>` at the start of a prompt opens the Run pane; `> <command>` runs a command in it; `> close` closes it. Typing `>` into an empty prompt adds a space after it.
- The pane lists runs with their status and the last 2,000 lines of each one's output, coloured with the theme, and follows the bottom while it is scrolled there.
- Suggestions from `package.json` scripts, `Cargo.toml` and `Makefile` targets.
- Stop sends Ctrl+C to the whole process tree, then SIGTERM, then SIGKILL; Force kill skips the waiting. Restart, Clear, Remove, Top and End as well.
- The `run_output` tool lets Claude read the latest output of a run.
- `/shell` opens a new Terminal or iTerm window in the session's folder (macOS), done inside the mod with osascript; the folder is passed as an argument and never written into the script.
- The state, the tool (`mcp__xdock__run_output`) and the pid marker carry the name xdock.
- Optional `hooks/xdock.json` (`suggestions`, `openFor`) for people who bundle the mod.
