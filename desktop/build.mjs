import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src');
const distDir = resolve(__dirname, 'dist');

if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

// Bundle the CalBlend injection script
await build({
  entryPoints: [resolve(__dirname, 'src/inject/main.ts')],
  bundle: true,
  outfile: resolve(distDir, 'calblend-inject.js'),
  format: 'iife',
  target: ['es2022'],
  platform: 'browser',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production' ? 'inline' : false,
  alias: {
    '@calblend/event-detection': resolve(srcDir, 'event-detection.ts'),
    '@calblend/event-grouping': resolve(srcDir, 'event-grouping.ts'),
    '@calblend/event-merging': resolve(srcDir, 'event-merging.ts'),
    '@calblend/weekend': resolve(srcDir, 'weekend.ts'),
    '@calblend/colors': resolve(srcDir, 'colors.ts'),
    '@calblend/observer': resolve(srcDir, 'observer.ts'),
    '@calblend/styles': resolve(srcDir, 'styles.ts'),
    '@calblend/features': resolve(srcDir, 'features.ts'),
    '@calblend/storage': resolve(srcDir, 'storage.ts'),
    '@calblend/selectors': resolve(srcDir, 'selectors.ts'),
    '@calblend/types': resolve(srcDir, 'types.ts'),
    // Also handle @/src/ aliases used inside source modules
    '@/src': srcDir,
  },
});

// Copy HTML pages to dist
for (const page of ['settings.html', 'about.html']) {
  copyFileSync(resolve(__dirname, `src/${page}`), resolve(distDir, page));
}

console.log('[CalBlend Desktop] Build complete');
