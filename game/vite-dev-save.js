// Dev only: the map editor (src/lib/editor.svelte.ts) saves here.
//   /__dev/save-point   a point's rows and settings, into content/points/<file>.json
//   /__dev/save-tuning  sprite tuning (content/tuning.json, whole) and prop placement (size, dx, dy, flat),
//                       patched into the hand-formatted content/props.json line by line
// Files are rewritten without a page reload, since the editor already shows what was saved.
// Plain JS so the config needs no Node type definitions.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT = fileURLToPath(new URL('./src/content', import.meta.url));
const DIR = join(CONTENT, 'points');

export function devSave() {
  const quiet = new Set();
  return {
    name: 'dev-save',
    apply: 'serve',
    configureServer(server) {
      const route = (url, fn) =>
        server.middlewares.use(url, (req, res) => {
          if (req.method !== 'POST') return void res.writeHead(405).end();
          let body = '';
          req.on('data', (b) => (body += b));
          req.on('end', () => {
            try {
              fn(JSON.parse(body));
              res.writeHead(200).end('ok');
            } catch (e) {
              res.writeHead(500).end(String(e?.message ?? e));
            }
          });
        });
      const write = (path, text) => {
        quiet.add(path);
        writeFileSync(path, text);
      };

      route('/__dev/save-point', ({ id, patch }) => {
        const file = readdirSync(DIR).find((f) => f.endsWith('.json') && JSON.parse(readFileSync(join(DIR, f), 'utf8')).id === id);
        if (!file) throw new Error(`no point "${id}"`);
        const path = join(DIR, file);
        const data = { ...JSON.parse(readFileSync(path, 'utf8')), ...patch };
        for (const k of Object.keys(data)) if (data[k] === null) delete data[k];
        write(path, formatPoint(data));
      });

      route('/__dev/save-tuning', ({ tuning, props }) => {
        if (tuning) write(join(CONTENT, 'tuning.json'), JSON.stringify(sorted(tuning), null, 1) + '\n');
        if (props) {
          const path = join(CONTENT, 'props.json');
          let text = readFileSync(path, 'utf8');
          for (const [code, fields] of Object.entries(props)) text = patchProp(text, code, fields);
          JSON.parse(text); // never write a broken file
          write(path, text);
        }
      });
    },
    handleHotUpdate(ctx) {
      if (quiet.delete(ctx.file)) return [];
    },
  };
}

/** A point's JSON: other fields on one line each, rows one per line with their columns lined up. */
function formatPoint(data) {
  const rows = data.rows.map((r) => r.trim().split(/\s+/));
  const width = [];
  for (const r of rows) r.forEach((t, i) => (width[i] = Math.max(width[i] ?? 0, t.length)));
  const lines = Object.entries(data).map(([k, v]) => {
    if (k !== 'rows') return `  ${JSON.stringify(k)}: ${flat(v)}`;
    const body = rows.map((r) => `    ${JSON.stringify(r.map((t, i) => t.padEnd(width[i])).join(' ').trimEnd())}`);
    return `  "rows": [\n${body.join(',\n')}\n  ]`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}

const flat = (v) => (Array.isArray(v) && v.every((x) => typeof x !== 'object') ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v));
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

/** Set (or, for null, remove) fields on the first line of a prop's entry in props.json, keeping its layout. */
function patchProp(text, code, fields) {
  const lines = text.split('\n');
  const head = `  ${JSON.stringify(code)}: {`;
  const i = lines.findIndex((l) => l.startsWith(head));
  if (i < 0) throw new Error(`no prop "${code}" in props.json`);
  let line = lines[i];
  for (const [k, v] of Object.entries(fields)) {
    const re = new RegExp(`\\s*"${k}":\\s*[^,}]+,?`);
    if (v === null) {
      line = line.replace(re, '');
      continue;
    }
    const pair = `"${k}": ${JSON.stringify(v)}`;
    if (re.test(line)) line = line.replace(new RegExp(`"${k}":\\s*[^,}\\s]+`), pair);
    else if (/"sprite":\s*"[^"]*",?/.test(line)) line = line.replace(/("sprite":\s*"[^"]*")(,?)/, `$1, ${pair}$2`);
    else line = line.replace(head + ' ', `${head} ${pair}, `);
  }
  lines[i] = line.replace(/,(\s*)}/, '$1}');
  return lines.join('\n');
}
export { patchProp, formatPoint }; // for a quick check from the command line
