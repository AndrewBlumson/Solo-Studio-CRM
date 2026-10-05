export const STUDIO_THEMES = [
  {
    id: 'evergreen',
    name: 'Evergreen',
    description: 'Warm paper, deep green and a clay accent.',
    swatches: ['#31594f', '#f4f0e7', '#d97850'],
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Cool blue, clear daylight and a golden highlight.',
    swatches: ['#365986', '#eef3f8', '#e4a83d'],
  },
  {
    id: 'clay',
    name: 'Clay studio',
    description: 'Soft stone, earthy rust and a muted olive detail.',
    swatches: ['#8c4836', '#f6eee5', '#8b9460'],
  },
  {
    id: 'plum',
    name: 'Plum room',
    description: 'Quiet lilac, ink and a warm rose accent.',
    swatches: ['#674469', '#f3edf3', '#bd718e'],
  },
] as const;

export type StudioThemeId = (typeof STUDIO_THEMES)[number]['id'];