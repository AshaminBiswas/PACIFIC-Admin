import type { ProductCatalogModel, TopProductCategory } from '../types/admin';

export const DEFAULT_CUBICLE_DESCRIPTION =
  'Our most sought-after commercial restroom cubicle system engineered with 12mm/18mm solid compact laminate. Features adjustable supporting legs and an overhead continuous headrail for maximum structural stability.';

export const DEFAULT_CUBICLE_SPECS = [
  { label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' },
  { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
  { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
  { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
  { label: 'Fire Rating', value: 'Class 1 / BS 476 Part 7' },
  { label: 'Water Resistance', value: '100% Moisture, Water & Humidity Proof' },
];

export const DEFAULT_TOP_CATEGORIES: TopProductCategory[] = [
  {
    id: 'cat-cubicle',
    key: 'Cubicle',
    name: 'Restroom Cubicle Systems',
    tagline: 'Engineered Solid Phenolic Compact HPL Cubicle Systems',
    description: 'Commercial restroom partition systems designed for high-traffic environments, public washrooms, corporate offices, airports, and educational institutes. Available in SS Hardware (Golden, Black, SS) and Nylon Hardware options.',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    modelCount: 0,
  },
  {
    id: 'cat-lockers',
    key: 'Lockers',
    name: 'Compact Laminate Locker Systems',
    tagline: 'Heavy-Duty Moisture-Proof Modular Tier Storage Models',
    description: 'Vandal-resistant, hygienic compact laminate locker series engineered for fitness centers, athletic clubs, hospitals, corporate workspaces, and industrial staff rooms. Uniform heavy-duty hardware across all models.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    modelCount: 0,
  },
  {
    id: 'cat-urinal',
    key: 'Urinal Partitions',
    name: 'Urinal Partition Screens',
    tagline: 'Hygienic Solid Privacy Dividers with Wall & Leg Mounts',
    description: 'Sleek, moisture-resistant privacy screen partitions for modern commercial restrooms. Model A includes an extra supporting floor leg, while Models B, C, and D feature wall-mounted cantilever configurations.',
    imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
    modelCount: 0,
  },
  {
    id: 'Kids Toilet',
    key: 'Kids Toilet',
    name: 'Kids Toilet Cubicle Systems',
    tagline: 'Child-Friendly Ergonomic Safety Partitions with Anti-Finger Trap Design',
    description: 'Specially engineered colorful, vibrant, and safety-focused restroom cubicles for schools, kindergartens, daycare centers, and amusement parks. Features rounded safety corners, low-height doors, and anti-pinch safety gap clearance.',
    imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1200&q=80',
    modelCount: 0,
  },
];

// Empty by default — all models are created and managed dynamically by admin via the model builder forms
export const DEFAULT_CATALOG_MODELS: ProductCatalogModel[] = [];
