import type { Difficulty } from '../types/game';

export type FlagLayoutType =
  | 'solid'
  | 'h-bicolor'
  | 'h-tricolor'
  | 'h-triband-121'
  | 'v-tricolor'
  | 'v-tricolor-121'
  | 'v-bicolor'
  | 'nordic-cross'
  | 'symmetric-cross'
  | 'canton-h'
  | 'hoist-triangle'
  | 'diagonal-band'
  | 'saltire'
  | 'hoist-band-h2';

export type EmblemType =
  | 'none'
  | 'disc'
  | 'disc-offset'
  | 'star-5'
  | 'star-6'
  | 'crescent-star'
  | 'diamond'
  | 'maple-leaf'
  | 'cedar'
  | 'sun'
  | 'circle-sun';

export interface FlagPuzzleSpec {
  id: string;
  countryCode: string;
  difficulty: Difficulty;
  layout: FlagLayoutType;
  /** Expected colors for each layout zone in order (e.g. [top, middle, bottom] or [bg, crossOuter, crossInner]) */
  targetZones: string[];
  zoneLabels: string[];
  targetEmblem: EmblemType;
  targetEmblemColor: string;
  /** Optional emblem rotation in degrees (0, 45, 90, 180, 270) */
  targetEmblemRotation?: number;
  /** Palette of hex colors offered to the player */
  palette: { hex: string; label: string }[];
  /** Emblem choices offered to the player */
  emblemOptions: { type: EmblemType; label: string }[];
  hint: string;
}

export const FLAG_PUZZLES: FlagPuzzleSpec[] = [
  {
    id: 'jp',
    countryCode: 'jp',
    difficulty: 'easy',
    layout: 'solid',
    targetZones: ['#FFFFFF'],
    zoneLabels: ['Field'],
    targetEmblem: 'disc',
    targetEmblemColor: '#BC002D',
    palette: [
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#BC002D', label: 'Crimson' },
      { hex: '#006A4E', label: 'Deep Green' },
      { hex: '#0038A8', label: 'Cobalt' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'disc', label: 'Center Disc' },
      { type: 'star-5', label: '5-Point Star' },
      { type: 'crescent-star', label: 'Crescent & Star' },
    ],
    hint: 'A pure white field centered with a crimson rising sun disc.',
  },
  {
    id: 'fr',
    countryCode: 'fr',
    difficulty: 'easy',
    layout: 'v-tricolor',
    targetZones: ['#0055A4', '#FFFFFF', '#EF4135'],
    zoneLabels: ['Left', 'Center', 'Right'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#0055A4', label: 'Royal Blue' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#EF4135', label: 'Red' },
      { hex: '#009246', label: 'Emerald' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Blue at the hoist, white in the center, and red at the fly.',
  },
  {
    id: 'de',
    countryCode: 'de',
    difficulty: 'easy',
    layout: 'h-tricolor',
    targetZones: ['#111111', '#DD0000', '#FFCE00'],
    zoneLabels: ['Top', 'Middle', 'Bottom'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#111111', label: 'Black' },
      { hex: '#DD0000', label: 'Red' },
      { hex: '#FFCE00', label: 'Gold' },
      { hex: '#FFFFFF', label: 'White' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Horizontal bands ordered from dark at the top to gold at the base.',
  },
  {
    id: 'it',
    countryCode: 'it',
    difficulty: 'easy',
    layout: 'v-tricolor',
    targetZones: ['#009246', '#FFFFFF', '#CE2B37'],
    zoneLabels: ['Left', 'Center', 'Right'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#009246', label: 'Green' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#CE2B37', label: 'Red' },
      { hex: '#FF883E', label: 'Orange' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Green at the hoist, white in the middle, and red on the right.',
  },
  {
    id: 'ua',
    countryCode: 'ua',
    difficulty: 'easy',
    layout: 'h-bicolor',
    targetZones: ['#005BBB', '#FFD500'],
    zoneLabels: ['Top Half', 'Bottom Half'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#005BBB', label: 'Sky Blue' },
      { hex: '#FFD500', label: 'Wheat Gold' },
      { hex: '#DC143C', label: 'Crimson' },
      { hex: '#FFFFFF', label: 'White' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Blue skies stretching above golden wheat fields.',
  },
  {
    id: 'pl',
    countryCode: 'pl',
    difficulty: 'easy',
    layout: 'h-bicolor',
    targetZones: ['#FFFFFF', '#DC143C'],
    zoneLabels: ['Top Half', 'Bottom Half'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#DC143C', label: 'Crimson' },
      { hex: '#005BBB', label: 'Blue' },
      { hex: '#111111', label: 'Black' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'White on the top half, crimson red on the bottom half.',
  },
  {
    id: 'id',
    countryCode: 'id',
    difficulty: 'easy',
    layout: 'h-bicolor',
    targetZones: ['#CE1126', '#FFFFFF'],
    zoneLabels: ['Top Half', 'Bottom Half'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#CE1126', label: 'Red' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#0055A4', label: 'Blue' },
      { hex: '#FFD500', label: 'Gold' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Red (courage) above white (purity).',
  },
  {
    id: 'se',
    countryCode: 'se',
    difficulty: 'easy',
    layout: 'nordic-cross',
    targetZones: ['#006AA7', '#FECC00', '#FECC00'],
    zoneLabels: ['Field', 'Cross Border', 'Cross Core'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#006AA7', label: 'Swedish Blue' },
      { hex: '#FECC00', label: 'Nordic Gold' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#C8102E', label: 'Red' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'A solid golden Nordic cross across a vibrant blue field.',
  },
  {
    id: 'fi',
    countryCode: 'fi',
    difficulty: 'easy',
    layout: 'nordic-cross',
    targetZones: ['#FFFFFF', '#002F6C', '#002F6C'],
    zoneLabels: ['Field', 'Cross Border', 'Cross Core'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#FFFFFF', label: 'Snow White' },
      { hex: '#002F6C', label: 'Lake Blue' },
      { hex: '#FECC00', label: 'Gold' },
      { hex: '#C8102E', label: 'Red' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'A deep blue Nordic cross over snow-white ground.',
  },
  {
    id: 'ch',
    countryCode: 'ch',
    difficulty: 'easy',
    layout: 'symmetric-cross',
    targetZones: ['#D52B1E', '#FFFFFF'],
    zoneLabels: ['Field', 'Greek Cross'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#D52B1E', label: 'Swiss Red' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#0038A8', label: 'Blue' },
      { hex: '#111111', label: 'Black' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'A bold centered white Greek cross on a vibrant red field.',
  },
  {
    id: 'bd',
    countryCode: 'bd',
    difficulty: 'medium',
    layout: 'solid',
    targetZones: ['#006A4E'],
    zoneLabels: ['Field'],
    targetEmblem: 'disc-offset',
    targetEmblemColor: '#F42A41',
    palette: [
      { hex: '#006A4E', label: 'Emerald Green' },
      { hex: '#F42A41', label: 'Crimson' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#FFDE00', label: 'Gold' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'disc', label: 'Centered Disc' },
      { type: 'disc-offset', label: 'Hoist-Offset Disc' },
      { type: 'crescent-star', label: 'Crescent & Star' },
    ],
    hint: 'Deep green field with a red sun disc offset slightly toward the hoist.',
  },
  {
    id: 'pw',
    countryCode: 'pw',
    difficulty: 'medium',
    layout: 'solid',
    targetZones: ['#0099FF'],
    zoneLabels: ['Field'],
    targetEmblem: 'disc-offset',
    targetEmblemColor: '#FFDE00',
    palette: [
      { hex: '#0099FF', label: 'Pacific Blue' },
      { hex: '#FFDE00', label: 'Moon Gold' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#006A4E', label: 'Green' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'disc', label: 'Centered Disc' },
      { type: 'disc-offset', label: 'Hoist-Offset Disc' },
      { type: 'star-5', label: '5-Point Star' },
    ],
    hint: 'Light ocean blue with a golden full moon disc shifted toward the hoist.',
  },
  {
    id: 'vn',
    countryCode: 'vn',
    difficulty: 'easy',
    layout: 'solid',
    targetZones: ['#DA251D'],
    zoneLabels: ['Field'],
    targetEmblem: 'star-5',
    targetEmblemColor: '#FFFF00',
    targetEmblemRotation: 0,
    palette: [
      { hex: '#DA251D', label: 'Red' },
      { hex: '#FFFF00', label: 'Gold Yellow' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#007A3D', label: 'Green' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'star-5', label: '5-Point Star' },
      { type: 'disc', label: 'Circle Disc' },
      { type: 'crescent-star', label: 'Crescent & Star' },
    ],
    hint: 'A large upright five-pointed gold star centered on a crimson field.',
  },
  {
    id: 'so',
    countryCode: 'so',
    difficulty: 'medium',
    layout: 'solid',
    targetZones: ['#4189DD'],
    zoneLabels: ['Field'],
    targetEmblem: 'star-5',
    targetEmblemColor: '#FFFFFF',
    targetEmblemRotation: 0,
    palette: [
      { hex: '#4189DD', label: 'Sky Blue' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#FFD100', label: 'Gold' },
      { hex: '#006A4E', label: 'Green' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'star-5', label: '5-Point Star' },
      { type: 'star-6', label: '6-Point Star' },
      { type: 'disc', label: 'Moon Disc' },
    ],
    hint: 'A crisp white five-pointed Star of Unity centered on UN sky blue.',
  },
  {
    id: 'no',
    countryCode: 'no',
    difficulty: 'medium',
    layout: 'nordic-cross',
    targetZones: ['#BA0C2F', '#FFFFFF', '#00205B'],
    zoneLabels: ['Field', 'Outer Fimbriation', 'Inner Cross'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#BA0C2F', label: 'Red' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#00205B', label: 'Navy Blue' },
      { hex: '#FECC00', label: 'Gold' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Red background with a white-outlined navy blue Nordic cross.',
  },
  {
    id: 'is',
    countryCode: 'is',
    difficulty: 'medium',
    layout: 'nordic-cross',
    targetZones: ['#02529C', '#FFFFFF', '#DC1E35'],
    zoneLabels: ['Field', 'Outer Fimbriation', 'Inner Cross'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#02529C', label: 'Atlantic Blue' },
      { hex: '#FFFFFF', label: 'Glacier White' },
      { hex: '#DC1E35', label: 'Volcanic Red' },
      { hex: '#111111', label: 'Basalt' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Ocean blue field with a white-bordered volcanic red Nordic cross.',
  },
  {
    id: 'ca',
    countryCode: 'ca',
    difficulty: 'easy',
    layout: 'v-tricolor-121',
    targetZones: ['#FF0000', '#FFFFFF', '#FF0000'],
    zoneLabels: ['Left Band', 'Center Square', 'Right Band'],
    targetEmblem: 'maple-leaf',
    targetEmblemColor: '#FF0000',
    palette: [
      { hex: '#FF0000', label: 'Maple Red' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#0055A4', label: 'Blue' },
      { hex: '#007A3D', label: 'Green' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'maple-leaf', label: 'Maple Leaf' },
      { type: 'cedar', label: 'Cedar Tree' },
      { type: 'star-5', label: '5-Point Star' },
    ],
    hint: 'Red vertical borders framing a white central square with a red maple leaf.',
  },
  {
    id: 'lb',
    countryCode: 'lb',
    difficulty: 'medium',
    layout: 'h-triband-121',
    targetZones: ['#EE161F', '#FFFFFF', '#EE161F'],
    zoneLabels: ['Top Stripe', 'Wide Center', 'Bottom Stripe'],
    targetEmblem: 'cedar',
    targetEmblemColor: '#00A651',
    palette: [
      { hex: '#EE161F', label: 'Red' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#00A651', label: 'Cedar Green' },
      { hex: '#111111', label: 'Black' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'cedar', label: 'Lebanon Cedar' },
      { type: 'maple-leaf', label: 'Maple Leaf' },
      { type: 'disc', label: 'Sun Disc' },
    ],
    hint: 'Horizontal red-white-red bands (1:2:1) with a green cedar in the center.',
  },
  {
    id: 'cz',
    countryCode: 'cz',
    difficulty: 'medium',
    layout: 'hoist-triangle',
    targetZones: ['#FFFFFF', '#D7141A', '#11457E'],
    zoneLabels: ['Top Half', 'Bottom Half', 'Hoist Triangle'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#D7141A', label: 'Red' },
      { hex: '#11457E', label: 'Blue' },
      { hex: '#FFCE00', label: 'Gold' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'White above red with a blue chevron triangle extending from the hoist.',
  },
  {
    id: 'br',
    countryCode: 'br',
    difficulty: 'medium',
    layout: 'solid',
    targetZones: ['#009C3B'],
    zoneLabels: ['Field'],
    targetEmblem: 'diamond',
    targetEmblemColor: '#FFDF00',
    palette: [
      { hex: '#009C3B', label: 'Amazon Green' },
      { hex: '#FFDF00', label: 'Gold' },
      { hex: '#002776', label: 'Celestial Blue' },
      { hex: '#FFFFFF', label: 'White' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'diamond', label: 'Diamond & Globe' },
      { type: 'disc', label: 'Circle Disc' },
      { type: 'star-5', label: '5-Point Star' },
    ],
    hint: 'Vibrant green field cradling a golden diamond with the celestial blue globe.',
  },
  {
    id: 'tr',
    countryCode: 'tr',
    difficulty: 'medium',
    layout: 'solid',
    targetZones: ['#E30A17'],
    zoneLabels: ['Field'],
    targetEmblem: 'crescent-star',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#E30A17', label: 'Turkish Red' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#006233', label: 'Green' },
      { hex: '#FFCC00', label: 'Gold' },
    ],
    emblemOptions: [
      { type: 'none', label: 'None' },
      { type: 'crescent-star', label: 'Crescent & Star' },
      { type: 'star-5', label: '5-Point Star' },
      { type: 'disc', label: 'Sun Disc' },
    ],
    hint: 'Crimson background displaying a crisp white crescent moon and five-pointed star.',
  },
  {
    id: 'ie',
    countryCode: 'ie',
    difficulty: 'medium',
    layout: 'v-tricolor',
    targetZones: ['#169B62', '#FFFFFF', '#FF883E'],
    zoneLabels: ['Left', 'Center', 'Right'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#169B62', label: 'Emerald' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#FF883E', label: 'Orange' },
      { hex: '#CE2B37', label: 'Red' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Green at the hoist, white in the center, and orange on the fly.',
  },
  {
    id: 'ci',
    countryCode: 'ci',
    difficulty: 'hard',
    layout: 'v-tricolor',
    targetZones: ['#F77F00', '#FFFFFF', '#009E60'],
    zoneLabels: ['Left', 'Center', 'Right'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#F77F00', label: 'Orange' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#009E60', label: 'Green' },
      { hex: '#0055A4', label: 'Blue' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'The reverse of Ireland: orange at the hoist, white center, green at the fly.',
  },
  {
    id: 'ae',
    countryCode: 'ae',
    difficulty: 'hard',
    layout: 'hoist-band-h2',
    targetZones: ['#FF0000', '#00732F', '#FFFFFF', '#111111'],
    zoneLabels: ['Hoist Band', 'Top Stripe', 'Middle Stripe', 'Bottom Stripe'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#FF0000', label: 'Red' },
      { hex: '#00732F', label: 'Green' },
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#111111', label: 'Black' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Vertical red hoist band meeting horizontal green, white, and black stripes.',
  },
  {
    id: 'tz',
    countryCode: 'tz',
    difficulty: 'hard',
    layout: 'diagonal-band',
    targetZones: ['#1EB53A', '#FCD116', '#111111', '#00A3DD'],
    zoneLabels: ['Upper Hoist', 'Band Border', 'Diagonal Core', 'Lower Fly'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#1EB53A', label: 'Green' },
      { hex: '#FCD116', label: 'Gold Border' },
      { hex: '#111111', label: 'Black' },
      { hex: '#00A3DD', label: 'Ocean Blue' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Green upper-left and sky-blue lower-right divided by a gold-edged black diagonal.',
  },
  {
    id: 'jm',
    countryCode: 'jm',
    difficulty: 'hard',
    layout: 'saltire',
    targetZones: ['#009B3A', '#111111', '#FED100'],
    zoneLabels: ['Top/Bottom Triangles', 'Side Triangles', 'Diagonal Saltire'],
    targetEmblem: 'none',
    targetEmblemColor: '#FFFFFF',
    palette: [
      { hex: '#009B3A', label: 'Green' },
      { hex: '#111111', label: 'Black' },
      { hex: '#FED100', label: 'Gold' },
      { hex: '#FFFFFF', label: 'White' },
    ],
    emblemOptions: [{ type: 'none', label: 'None' }],
    hint: 'Gold diagonal cross separating green top/bottom triangles from black side triangles.',
  },
];
