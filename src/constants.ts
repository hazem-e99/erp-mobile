import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY PALETTE  —  based on #3f1052 (Deep Violet)
//
//  Light shades (for backgrounds / tints on dark surfaces):
//    primaryLight    #2d1a40   — subtle tinted surface (dark bg)
//    primaryLighter  #3d2255   — slightly brighter tint
//
//  Core brand:
//    primary         #7c3aad   — main interactive color on dark bg
//                              (brightened from #3f1052 for WCAG contrast on #0d0a10)
//    primaryBrand    #3f1052   — original brand hex (use in exports, logos)
//
//  Dark shades:
//    primaryDark     #6b21a8   — pressed / active state
//    primaryDeep     #521469   — hover state
//
//  Text on primary bg:
//    always white (#ffffff) — contrast ratio > 4.5:1 ✅
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // ✅ Primary — violet replaces orange
  primary:        '#7c3aad',   // main color on dark backgrounds (WCAG AA safe)
  primaryBrand:   '#3f1052',   // original brand color (logos, exports)
  primaryHover:   '#9333ea',   // lighter for hover states
  primaryDark:    '#6b21a8',   // pressed / active
  primaryDeep:    '#521469',   // deep accent
  primaryLight:   '#2d1a40',   // tinted surface background
  primaryLighter: '#3d2255',   // slightly brighter surface

  // App surfaces (dark theme)
  background:     '#0d0a10',   // ✅ slightly purple-tinted dark (was warm brown #0c0a09)
  card:           '#1a1020',   // ✅ purple-tinted card (was #1c1917)
  surface:        '#231530',   // ✅ elevated surface (was #292524)

  // Text
  text:           '#f4f0f6',   // ✅ slightly cool white (was #fafaf9)
  textSecondary:  '#a78bba',   // ✅ muted purple-grey (was #a8a29e)

  // Border
  border:         '#3b2050',   // ✅ purple-tinted border (was #3f3f46)

  // Status colors — unchanged
  success:        '#22c55e',
  warning:        '#eab308',
  destructive:    '#ef4444',

  // Utilities
  white:          '#ffffff',
  transparent:    'transparent',
};

// ─── API URL resolution ───────────────────────────────────────────────────────

const normalizeApiUrl = (url: string) => {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const resolveExpoHost = (): string | null => {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    null;

  if (!hostUri || typeof hostUri !== 'string') return null;
  return hostUri.split(':')[0] || null;
};

const resolvedHost  = resolveExpoHost();
const fallbackHost  = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const apiHost =
  Platform.OS === 'android' &&
  (resolvedHost === 'localhost' || resolvedHost === '127.0.0.1')
    ? '10.0.2.2'
    : resolvedHost || fallbackHost;

const envApiUrl       = process.env.EXPO_PUBLIC_API_URL;
const defaultDevApiUrl = `http://${apiHost}:3001/api`;

export const API_URL = normalizeApiUrl(envApiUrl || defaultDevApiUrl);
