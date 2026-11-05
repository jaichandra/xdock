import { expect, test } from 'claude-code/testing'

import {
  BUTTON_COLORS,
  BUTTON_HOVERS,
  darken,
  descendants,
  groupSuggestions,
  highlight,
  isAtBottom,
  isInteractive,
  withColor,
  setsColor,
  makeTargets,
  matchesAny,
  MAX_LINES,
  packageScripts,
  readPid,
  RunLog,
  shellQuote,
  statusMark,
  statusWords,
  stripAnsi,
  suggestionKind,
  suggestions,
  troubleOf,
  troublePrompt,
} from '../hooks/run'

test('colour and title escapes are stripped, the text stays', async () => {
  expect(stripAnsi('\u001b[32mready\u001b[0m \u001b]0;title\u0007on :3000')).toBe('ready on :3000')
})

test('a log joins pieces into lines and shows an unfinished one', async () => {
  const log = new RunLog()
  log.push('first\nsec')
  log.push('ond\nthi')
  expect(log.tail(10)).toEqual(['first', 'second', 'thi'])
  expect(log.size()).toBe(3)
  expect(log.tail(2)).toEqual(['second', 'thi'])
})

test('a progress bar that redraws with a carriage return shows its last state', async () => {
  const log = new RunLog()
  log.push('10%\r50%\r100%\ndone\n')
  expect(log.tail(5)).toEqual(['100%', 'done'])
})

test('a line that ends with a carriage return keeps its text', async () => {
  const log = new RunLog()
  log.push('Error: net::ERR_NAME_NOT_RESOLVED\r\nnext\r')
  expect(log.tail(5)).toEqual(['Error: net::ERR_NAME_NOT_RESOLVED', 'next'])
  log.push('\n')
  expect(log.tail(5)).toEqual(['Error: net::ERR_NAME_NOT_RESOLVED', 'next'])
})

test('an escape sequence cut in two by the chunks is not shown as text', async () => {
  const log = new RunLog()
  log.push('a\u001b[2')
  log.push('Kb \u001b[3')
  log.push('1mred\u001b[0m\n')
  expect(log.tail(5)).toEqual(['ab red'])
  expect(log.styled(1)[0]?.text).toBe('ab \u001b[31mred\u001b[0m')
})

test('a log keeps the last lines only', async () => {
  const log = new RunLog()
  for (let at = 0; at < MAX_LINES + 50; at++) log.push(`line ${at}\n`)
  expect(log.size()).toBe(MAX_LINES)
  expect(log.tail(1)).toEqual([`line ${MAX_LINES + 49}`])
  expect(log.tail(MAX_LINES + 100)[0]).toBe('line 50')
  log.clear()
  expect(log.size()).toBe(0)
})

test('package scripts come as npm run, the usual ones first', async () => {
  const text = JSON.stringify({ scripts: { prepare: 'x', 'test:unit': 'y', dev: 'z', 'bad name': 'q', build: 'b' } })
  expect(packageScripts(text)).toEqual(['npm run dev', 'npm run test:unit', 'npm run build', 'npm run prepare'])
  expect(packageScripts('not json')).toEqual([])
  expect(packageScripts('{}')).toEqual([])
})

test('make targets skip patterns, variables and special targets', async () => {
  const text = ['CC := gcc', '.PHONY: all', 'all: build', 'build: main.o', '%.o: %.c', 'x = y', 'test:', 'build: again'].join('\n')
  expect(makeTargets(text)).toEqual(['make all', 'make build', 'make test'])
})

test('suggestions put package scripts first, then cargo, then make, up to ten', async () => {
  expect(suggestions({ packageJson: '{"scripts":{"dev":"x"}}', hasCargo: true, makefile: 'lint:\n' })).toEqual([
    'npm run dev',
    'cargo run',
    'cargo test',
    'make lint',
  ])
  expect(suggestions({})).toEqual([])
  const many = JSON.stringify({ scripts: Object.fromEntries(Array.from({ length: 30 }, (_, at) => [`s${at}`, 'x'])) })
  expect(suggestions({ packageJson: many })).toHaveLength(10)
})

test('the wrapper reports its pid before anything else', async () => {
  expect(readPid('@@xdock-pid 4242\nhello')).toEqual({ pid: 4242, rest: 'hello' })
  expect(readPid('@@xdock-pi')).toBeUndefined()
  expect(readPid('@@run-pa')).toEqual({ rest: '@@run-pa' })
  expect(readPid('@@xdock-pid 42')).toBeUndefined()
  expect(readPid('plain output')).toEqual({ rest: 'plain output' })
  expect(readPid('@@xdock-pid x\nrest')).toEqual({ rest: 'rest' })
})

test('every process below a pid is found, nothing else', async () => {
  const ps = [' 1 0', ' 100 1', ' 101 100', ' 102 101', ' 103 100', ' 200 1', '', 'junk'].join('\n')
  expect(descendants(ps, 100).sort()).toEqual([100, 101, 102, 103])
  expect(descendants(ps, 999)).toEqual([999])
})

test('a run is marked and described by how it ended', async () => {
  expect(statusMark('running', null)).toBe('●')
  expect(statusMark('exited', 0)).toBe('✓')
  expect(statusMark('exited', 2)).toBe('✗')
  expect(statusWords('exited', 2)).toBe('exit 2')
  expect(statusWords('exited', null)).toBe('killed')
  expect(statusWords('stopped', null)).toBe('stopped')
  // Over, with no exit code to tell: what a command typed into a multiplexer pane's own shell leaves.
  expect(statusMark('done', null)).toBe('○')
  expect(statusWords('done', null)).toBe('done')
  expect(statusWords('failed', null)).toBe('could not start')
})

test('suggestions from xdock.json come first and are not repeated', async () => {
  expect(suggestions({ extra: ['docker compose up', 'npm run dev'], packageJson: '{"scripts":{"dev":"x","test":"y"}}' })).toEqual([
    'docker compose up',
    'npm run dev',
    'npm run test',
  ])
})

test('a word matches a remote or a path whatever its case, and no words match nothing', async () => {
  expect(matchesAny('ssh://host/team/Acme-Shop.git', ['acme'])).toBe(true)
  expect(matchesAny('/w/other', ['acme', ' other '])).toBe(true)
  expect(matchesAny('/w/other', ['acme'])).toBe(false)
  expect(matchesAny('/w/other', [])).toBe(false)
  expect(matchesAny('/w/other', ['', '  '])).toBe(false)
})

test('a line of output is split into the kinds the pane colours', async () => {
  expect(highlight(' \u25b6 OPEN THIS IN YOUR BROWSER:      \u2502')).toEqual([
    { text: ' ', kind: 'border' },
    { text: '\u25b6 OPEN THIS IN YOUR BROWSER:', kind: 'banner' },
    { text: ' \u2502', kind: 'border' },
  ])
  expect(highlight('    http://localhost:3000/  \u2502')).toEqual([
    { text: '    ', kind: 'border' },
    { text: 'http://localhost:3000/', kind: 'url' },
    { text: ' \u2502', kind: 'border' },
  ])
  expect(highlight('        # Root - redirects to /app/')[1]).toEqual({ text: '# Root - redirects to /app/', kind: 'comment' })
  expect(highlight('    docker logs api')).toEqual([
    { text: '    ', kind: 'border' },
    { text: 'docker logs api', kind: 'command' },
  ])
  expect(highlight('docker logs api')).toEqual([{ text: 'docker logs api', kind: 'command' }])
  expect(highlight('  Debug / supporting URLs (open in browser or curl):')[1]).toEqual({ text: 'Debug / supporting URLs (open in browser or curl):', kind: 'heading' })
  expect(highlight('2026 ERROR connection refused')).toEqual([{ text: '2026 ERROR connection refused', kind: 'error' }])
  expect(highlight('WARN slow disk')).toEqual([{ text: 'WARN slow disk', kind: 'warning' }])
})

test('errors, warnings, stack frames, banners and tags are found by what they say', async () => {
  const kindOf = (line: string) => highlight(line).find(part => part.kind !== 'border')?.kind
  expect(kindOf('Error: net::ERR_NAME_NOT_RESOLVED at https://a.example')).toBe('error')
  expect(kindOf('TypeError: x is not a function')).toBe('error')
  expect(kindOf('src/a.c:3: error: expected ;')).toBe('error')
  expect(kindOf('npm ERR! code ELIFECYCLE')).toBe('error')
  expect(kindOf('(node:79865) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.')).toBe('warning')
  expect(kindOf('gcc: warning: unused variable')).toBe('warning')
  expect(kindOf('npm WARN deprecated foo@1.0.0')).toBe('warning')
  expect(kindOf('    at navigate (/a/b/Frame.js:184:27)')).toBe('trace')
  expect(kindOf('    at async CdpPage.goto (/a/Page.js:572:20)')).toBe('trace')
  expect(kindOf('==> Generating proxy config: /a/b.js')).toBe('banner')
  expect(kindOf('compiled with 0 errors')).toBe('plain')
  expect(kindOf('at least one test ran')).toBe('plain')
  expect(highlight('[sandbox] gateway login started')).toEqual([
    { text: '[sandbox]', kind: 'tag' },
    { text: ' gateway login started', kind: 'plain' },
  ])
  expect(highlight('[sandbox] Error: boom').map(part => part.kind)).toEqual(['tag', 'error'])
})

test('a URL keeps out the punctuation after it and there can be several in a line', async () => {
  const parts = highlight('see (https://a.example/x) and https://b.example/y.')
  expect(parts.filter(part => part.kind === 'url').map(part => part.text)).toEqual(['https://a.example/x', 'https://b.example/y'])
  expect(parts.map(part => part.text).join('')).toBe('see (https://a.example/x) and https://b.example/y.')
})

test('plain text and empty lines pass through', async () => {
  expect(highlight('compiling...')).toEqual([{ text: 'compiling...', kind: 'plain' }])
  expect(highlight('')).toEqual([])
})

test('the window is at the bottom when it ends on the last rows or the tree fits', async () => {
  expect(isAtBottom({ offset: 80, bodyRows: 20, contentRows: 100 })).toBe(true)
  expect(isAtBottom({ offset: 95, bodyRows: 20, contentRows: 100 })).toBe(true)
  expect(isAtBottom({ offset: 79, bodyRows: 20, contentRows: 100 })).toBe(false)
  expect(isAtBottom({ offset: 0, bodyRows: 20, contentRows: 100 })).toBe(false)
  expect(isAtBottom({ offset: 0, bodyRows: 20, contentRows: 12 })).toBe(true)
})

test('a log keeps the colours of its lines, drops every other sequence, and the plain tail has none', () => {
  const log = new RunLog()
  log.push('\u001b[31mfailed\u001b[0m ok\u001b[2K\u001b[1G\u001b]0;title\u0007\u001b[?25l\n')
  expect(log.styled(5)).toEqual([{ text: '\u001b[31mfailed\u001b[0m ok', start: {} }])
  expect(log.tail(5)).toEqual(['failed ok'])
  // A stray escape and the other control characters are gone.
  log.push('a\u001bb\u0007c\n')
  expect(log.tail(5)).toEqual(['failed ok', 'abc'])
})

test('a style runs on into the next lines until it is reset, and a progress bar keeps its last state', () => {
  const log = new RunLog()
  log.push('\u001b[33;1mwarning\nthe next line\n\u001b[0mplain\nstill plain\n')
  expect(log.styled(9).map(line => line.start)).toEqual([{}, { fg: 'yellow', bold: true }, { fg: 'yellow', bold: true }, {}])
  const bar = new RunLog()
  bar.push('10%\r50%\r\u001b[32m100%\u001b[0m\n')
  expect(bar.tail(2)).toEqual(['100%'])
})

test('lines have a number that does not change when the oldest go off the top', () => {
  const log = new RunLog()
  expect(log.first()).toBe(0)
  log.push(`${Array.from({ length: MAX_LINES + 5 }, (_, at) => `line ${at}`).join('\n')}\n`)
  expect(log.first()).toBe(5)
  expect(log.tail(1)).toEqual([`line ${MAX_LINES + 4}`])
  log.clear()
  expect(log.first()).toBe(0)
  expect(log.size()).toBe(0)
})

test('editors, pagers, monitors, sessions and REPLs need a terminal; builds, tests and scripts do not', () => {
  for (const cmd of ['vi notes.txt', 'vim', 'nvim -d a b', 'nano x', 'less log.txt', 'man ls', 'top', 'htop', 'watch ls', 'ssh host', 'tmux', 'k9s', 'python', 'python3 -i', 'node', 'psql', 'bash', 'sudo vim /etc/hosts', 'sudo -u bob vim x', 'EDITOR=vi vim x', '/usr/bin/vim x', 'git log | less', 'cd app && nvim x', 'docker exec -it web sh', 'kubectl exec -ti pod -- bash', 'podman run -it alpine', 'git rebase -i HEAD~3', 'git add -p', 'git commit']) {
    expect(isInteractive(cmd), cmd).toBe(true)
  }
  for (const cmd of ['npm test', 'ls -al', 'python script.py', 'node server.js', 'bash run.sh', 'git commit -m x', 'git commit --no-edit', 'git status', 'git log', 'docker run web', 'docker exec web ls', 'make dev', 'cat a | grep vi', 'echo vim', 'cargo run', 'psql -c "select 1"', 'ssh-keygen -t ed25519', 'vimeo-dl x', 'viewer x', 'sleep 1; echo done', '']) {
    expect(isInteractive(cmd), cmd).toBe(false)
  }
  // What hooks/xdock.json lists is told too, by first word.
  expect(isInteractive('mytui --x', ['mytui'])).toBe(true)
  expect(isInteractive('mytui --x')).toBe(false)
})

test('suggestions are grouped by what they start with, so `npm run` is said once', () => {
  const groups = groupSuggestions(['make seed', 'npm run dev', 'npm run test:ci', 'cargo run', 'cargo test', 'make build', 'docker compose up', 'npm run lint'])
  expect(groups.map(group => group.prefix)).toEqual(['make', 'npm run', 'cargo', 'make', '', 'npm run'])
  expect(groups[1]?.items).toEqual([{ cmd: 'npm run dev', label: 'dev' }, { cmd: 'npm run test:ci', label: 'test:ci' }])
  expect(groups[2]?.items.map(item => item.label)).toEqual(['run', 'test'])
  // A command of no known tool is a button of its own, whole.
  expect(groups[4]).toEqual({ prefix: '', items: [{ cmd: 'docker compose up', label: 'docker compose up' }] })
  expect(groupSuggestions([])).toEqual([])
})

test('a suggestion is for running, for testing or for anything else, by its last word', () => {
  for (const cmd of ['npm run dev', 'npm run start:ci', 'npm run serve', 'npm run watch', 'cargo run', 'make up']) expect(suggestionKind(cmd), cmd).toBe('run')
  for (const cmd of ['npm run test', 'npm run test:libs', 'cargo test', 'make e2e', 'npm run check']) expect(suggestionKind(cmd), cmd).toBe('test')
  for (const cmd of ['npm run build', 'npm run lint', 'make seed', 'docker compose up --build', 'npm run restart-all']) expect(suggestionKind(cmd), cmd).toBe('other')
})

test('the log can be dumped for a terminal: whole lines with a reset after each, and the unfinished one as it is', () => {
  const log = new RunLog()
  expect(log.dump()).toBe('')
  log.push('\u001b[31mred\nplain\npart')
  expect(log.dump()).toBe('\u001b[31mred\u001b[0m\nplain\u001b[0m\npart')
  // What comes next completes the unfinished line, as it would in the terminal.
  log.push('ial\n')
  expect(log.dump()).toBe('\u001b[31mred\u001b[0m\nplain\u001b[0m\npartial\u001b[0m\n')
})

test('a word for a shell line is one word, whatever it holds', () => {
  expect(shellQuote('/tmp/xdock-x-1.log')).toBe("'/tmp/xdock-x-1.log'")
  expect(shellQuote("it's $(x) `y`")).toBe("'it'\\''s $(x) `y`'")
  expect(shellQuote('')).toBe("''")
})

test('a colour can be made darker by a share, channel by channel', () => {
  expect(darken('#ffffff', 0.1)).toBe('#e6e6e6')
  expect(darken('#c3c9fb', 0.1)).toBe('#b0b5e2')
  expect(darken('#8ed99f', 0.2)).toBe('#72ae7f')
  expect(darken('#102030', 0)).toBe('#102030')
  expect(darken('#102030', 1)).toBe('#000000')
})

test('the colour under the pointer is the button\'s 10% darker, never black', () => {
  for (const tone of ['neutral', 'primary', 'danger', 'success'] as const) {
    expect(BUTTON_HOVERS[tone]).toBe(darken(BUTTON_COLORS[tone], 0.1))
    expect(BUTTON_HOVERS[tone]).not.toBe(BUTTON_COLORS[tone])
  }
})

test('ls, grep and diff are asked to colour when the command is a plain one', () => {
  expect(withColor('ls -al')).toBe('ls --color=always -al')
  expect(withColor('grep -rn TODO src')).toBe('grep --color=always -rn TODO src')
  expect(withColor('diff a b')).toBe('diff --color=always a b')
  expect(withColor('ls')).toBe('ls --color=always')
  // Said already, or read by another program, or not one of them: as typed.
  expect(withColor('ls --color=never')).toBe('ls --color=never')
  expect(withColor('ls -G')).toBe('ls -G')
  expect(withColor('ls | wc -l')).toBe('ls | wc -l')
  expect(withColor('ls > out.txt')).toBe('ls > out.txt')
  expect(withColor('ls $(pwd)')).toBe('ls $(pwd)')
  expect(withColor('cd x && ls')).toBe('cd x && ls')
  expect(withColor('cat README.md')).toBe('cat README.md')
  expect(withColor('lsof -i')).toBe('lsof -i')
})

test('claude command lines are coloured as commands', () => {
  expect(highlight('claude plugin validate .')).toEqual([{ text: 'claude plugin validate .', kind: 'command' }])
})

test('a run is worth asking Claude about when it did not start, ended badly, or is printing errors', async () => {
  expect(troubleOf('failed', null, [])).toBe('failed')
  expect(troubleOf('exited', 1, [])).toBe('failed')
  expect(troubleOf('exited', null, [])).toBe('failed')
  expect(troubleOf('exited', 0, ['Error: not a failure of the run'])).toBeUndefined()
  expect(troubleOf('stopped', null, ['Error: boom'])).toBeUndefined()
  expect(troubleOf('running', null, ['ready on :3000'])).toBeUndefined()
  expect(troubleOf('running', null, ['ready', 'TypeError: x is not a function'])).toBe('errors')
  expect(troubleOf('done', null, ['npm ERR! missing script'])).toBe('errors')
})

test('the question names the run and the tool that shows its output', async () => {
  const text = troublePrompt(3, 'npm run dev', 'failed', 'mcp__xdock__run_output')
  expect(text).toContain('#3 `npm run dev`')
  expect(text).toContain('fail')
  expect(text).toContain('mcp__xdock__run_output')
  expect(troublePrompt(3, 'npm run dev', 'errors', 'x')).toContain('print errors')
})

test('a command that sets its own colour is told apart from one that does not', () => {
  expect(setsColor('NO_COLOR=1 make build')).toBe(true)
  expect(setsColor('FORCE_COLOR=0 npm test')).toBe(true)
  expect(setsColor('cd app && CLICOLOR_FORCE=0 make')).toBe(true)
  expect(setsColor('env FORCE_COLOR=0 npm test')).toBe(true)
  expect(setsColor('npm test')).toBe(false)
  // Only an assignment counts: the name as an argument or in a longer name is not one.
  expect(setsColor('echo NO_COLOR')).toBe(false)
  expect(setsColor('MY_NO_COLOR=1 npm test')).toBe(false)
})
