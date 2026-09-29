import { defineConfig } from 'vitest/config';

// Tests of the whole repository, apart from the build configs of the two sites.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
