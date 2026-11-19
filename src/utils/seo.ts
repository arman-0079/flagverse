import type { GameModeId, ScreenId } from '../types/game';

export const DEFAULT_SITE_URL =
  'https://ais-pre-iy4uwoydoiacagsia2ao7m-810433762954.asia-southeast1.run.app';

export const VALID_GAME_MODE_IDS: readonly GameModeId[] = [
  'flag-master',
  'country-to-flag',
  'world-map',
  'capital-hunter',
  'flag-memory',
  'flag-builder',
  'country-silhouette',
  'flag-battle',
  'true-false',
  'flag-match',
  'continent-quest',
  'daily-challenge',
] as const;

export const VALID_DEEP_LINK_VIEWS: readonly Exclude<ScreenId, 'intro' | 'play'>[] = [
  'hub',
  'online',
  'explore',
  'collection',
  'achievements',
  'statistics',
] as const;

export interface SitemapEntry {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

export const SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/?view=online', changefreq: 'weekly', priority: '0.9' },
  { path: '/?view=explore', changefreq: 'weekly', priority: '0.9' },
  { path: '/?view=collection', changefreq: 'weekly', priority: '0.8' },
  { path: '/?view=achievements', changefreq: 'monthly', priority: '0.7' },
  { path: '/?view=statistics', changefreq: 'monthly', priority: '0.7' },
  { path: '/?mode=flag-master', changefreq: 'weekly', priority: '0.9' },
  { path: '/?mode=country-to-flag', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=world-map', changefreq: 'weekly', priority: '0.9' },
  { path: '/?mode=capital-hunter', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=flag-memory', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=flag-builder', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=country-silhouette', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=flag-battle', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=true-false', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=flag-match', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=continent-quest', changefreq: 'weekly', priority: '0.8' },
  { path: '/?mode=daily-challenge', changefreq: 'daily', priority: '0.9' },
];

export function normalizeBaseUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || trimmed === 'MY_APP_URL') {
    return DEFAULT_SITE_URL;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return DEFAULT_SITE_URL;
  }
  return trimmed.replace(/\/+$/, '');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRobotsTxt(baseUrl?: string): string {
  const origin = normalizeBaseUrl(baseUrl);
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function buildSitemapXml(
  baseUrl?: string,
  lastmod = new Date().toISOString().slice(0, 10)
): string {
  const origin = normalizeBaseUrl(baseUrl);
  const urls = SITEMAP_ENTRIES.map((entry) => {
    const loc = `${origin}${entry.path}`;
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function parseInitialRouteParams(
  search: string,
  introSeen: boolean
): { screen: ScreenId; modeId: GameModeId } {
  const params = new URLSearchParams(search);
  const modeParam = params.get('mode') as GameModeId | null;
  if (modeParam && VALID_GAME_MODE_IDS.includes(modeParam)) {
    return { screen: 'play', modeId: modeParam };
  }

  const viewParam = params.get('view') as Exclude<ScreenId, 'intro' | 'play'> | null;
  if (viewParam && VALID_DEEP_LINK_VIEWS.includes(viewParam)) {
    return { screen: viewParam, modeId: 'flag-master' };
  }

  const codeParam = params.get('code');
  if (codeParam && codeParam.trim().length >= 4) {
    return { screen: 'online', modeId: 'flag-master' };
  }

  const autostart = params.get('autostart') === '1';
  return {
    screen: autostart || introSeen ? 'hub' : 'intro',
    modeId: 'flag-master',
  };
}
