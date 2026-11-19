// Local bundled flag SVG URLs via Vite import.meta.glob (zero third-party HTTP dependencies)
const flag4x3Modules = import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const flag1x1Modules = import.meta.glob('/node_modules/flag-icons/flags/1x1/{ch,va}.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const FLAG_URL_MAP: Record<string, string> = {};

for (const [path, url] of Object.entries(flag4x3Modules)) {
  const match = path.match(/\/([a-z0-9-]+)\.svg$/i);
  if (match) {
    FLAG_URL_MAP[match[1].toLowerCase()] = url;
  }
}

const SQUARE_FLAG_URL_MAP: Record<string, string> = {};
for (const [path, url] of Object.entries(flag1x1Modules)) {
  const match = path.match(/\/([a-z0-9-]+)\.svg$/i);
  if (match) {
    SQUARE_FLAG_URL_MAP[match[1].toLowerCase()] = url;
  }
}

export function getFlagUrl(code: string, preferSquare = false): string {
  const lower = code.toLowerCase();
  if (preferSquare && SQUARE_FLAG_URL_MAP[lower]) {
    return SQUARE_FLAG_URL_MAP[lower];
  }
  return FLAG_URL_MAP[lower] || '';
}

export function hasFlagAsset(code: string): boolean {
  return Boolean(FLAG_URL_MAP[code.toLowerCase()]);
}
