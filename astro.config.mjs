import { defineConfig } from 'astro/config';
import translate from './scripts/translate-integration.mjs';

export default defineConfig({
  site: 'https://gravelboost.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  integrations: [translate()],
});
