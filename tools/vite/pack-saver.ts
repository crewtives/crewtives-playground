import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

// Development-only endpoint so that /bake can write the 4D pack to public/packs/<name>/.
// POST /__pack/save?name=<pack>&file=<relative path>  (body = the file's bytes)
export function packSaver({ packsDir }: { packsDir: string }): Plugin {
  return {
    name: 'pack-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__pack/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const url = new URL(req.url ?? '', 'http://localhost');
        const name = url.searchParams.get('name') ?? '';
        const file = url.searchParams.get('file') ?? '';
        const target = resolve(packsDir, name, file);
        const valid =
          /^[a-z0-9-]+$/.test(name) &&
          /^[a-z0-9._/-]+$/.test(file) &&
          target.startsWith(resolve(packsDir, name) + sep);
        if (!valid) {
          res.statusCode = 400;
          res.end('invalid pack name or file');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, Buffer.concat(chunks));
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 500;
            res.end(String(error));
          }
        });
      });
    },
  };
}
