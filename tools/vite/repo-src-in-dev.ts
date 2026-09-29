import type { Plugin } from 'vite';

/**
 * In development, the browser normalizes the pages' relative `src` (../../src/...,
 * ../../../src/..., ../../../../src/...) to `/src/...`, which does not exist with the site root at
 * sites/<site>/: it is served from the repo's src/.
 */
export function repoSrcInDev(repo: string): Plugin {
  return {
    name: 'repo-src-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/src/')) req.url = `/@fs${repo}${req.url}`;
        next();
      });
    },
  };
}
