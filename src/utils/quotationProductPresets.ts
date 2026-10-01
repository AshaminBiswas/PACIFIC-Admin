import type { ProductCatalogModel, ProductCategoryType } from '../types/admin';

/**
 * Standard Pacific Catalog Models used for Quotations.
 * These ensure the quotation builder always has access to the official Pacific product range
 * with full technical specifications, door dimensions, ground heights, and hardware lists.
 */
export const PACIFIC_STANDARD_QUOTATION_MODELS: ProductCatalogModel[] = [
  // ── 1. CUBICLE MODELS (13) ──
  {
    id: 'std-delight',
    slug: 'cubicle-delight',
    title: 'Delight',
    category: 'Cubicle',
    subtitle: 'Standard Overhead-Braced Commercial Cubicle System',
    description: 'Our most sought-after commercial restroom cubicle system engineered with 12mm/18mm solid compact laminate. Features adjustable supporting legs and an overhead continuous headrail for maximum structural stability.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
      { label: 'Fire Rating', value: 'Class 1 / BS 476 Part 7' },
      { label: 'Water Resistance', value: '100% Moisture, Water & Humidity Proof' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Gravity Hinges (Self-Closing Pair with Nylon Cam)', material: 'Both' },
      { id: 'h2', name: 'Occupancy Indicator Lock with Emergency Release', material: 'Both' },
      { id: 'h3', name: 'Ergonomic Door Pull Handle / Knob', material: 'Both' },
      { id: 'h4', name: 'Coat Hook with Integrated Rubber Buffer Stop', material: 'Both' },
      { id: 'h5', name: 'Adjustable Supporting Legs (100–150mm ground clearance)', material: 'Both' },
      { id: 'h6', name: 'Continuous Top Headrail Stabilizer Box Extrusion', material: 'Both' },
      { id: 'h7', name: 'Wall Fixing U-Channels & SS 304 Fasteners Pack', material: 'Both' },
    ],
  },
  {
    id: 'std-skylight',
    slug: 'cubicle-skylight',
    title: 'Skylight',
    category: 'Cubicle',
    subtitle: 'High-Headroom Minimalist Architectural Cubicle',
    description: 'Minimalist high-headroom commercial cubicle engineered with 12mm/18mm solid compact laminate and concealed hardware junctions.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '2000 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Concealed Pivot Hinges (Self-Closing)', material: 'Both' },
      { id: 'h2', name: 'Occupancy Indicator Lock & Turn Bolt', material: 'Both' },
      { id: 'h3', name: 'Architectural Door Knob', material: 'Both' },
      { id: 'h4', name: 'Coat Hook with Buffer Stop', material: 'Both' },
      { id: 'h5', name: 'Heavy-Duty Adjustable Legs (100–150mm)', material: 'Both' },
      { id: 'h6', name: 'Overhead Continuous Stabilizer Headrail', material: 'Both' },
      { id: 'h7', name: 'Wall Fixing Anodized Channels & Fasteners', material: 'Both' },
    ],
  },
  {
    id: 'std-platina',
    slug: 'cubicle-platina',
    title: 'Platina',
    category: 'Cubicle',
    subtitle: 'Flagship Heavy-Duty Box Profile Commercial System',
    description: 'Flagship heavy-duty cubicle system with robust aluminum box profiles, engineered for corporate airports, stadiums, and high-abuse commercial restrooms.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Platina Heavy-Duty Self-Closing Gravity Hinges', material: 'Both' },
      { id: 'h2', name: 'Turn-Bolt Privacy Indicator Lock with Emergency Release', material: 'Both' },
      { id: 'h3', name: 'Platina Double-Sided Door Pull Handle', material: 'Both' },
      { id: 'h4', name: 'Coat Hook with Integrated Rubber Buffer', material: 'Both' },
      { id: 'h5', name: 'Box Profile Adjustable Floor Support Feet (100–150mm)', material: 'Both' },
      { id: 'h6', name: 'Heavy Anodized Box Headrail & Wall Junctions', material: 'Both' },
    ],
  },
  {
    id: 'std-gusto',
    slug: 'cubicle-gusto',
    title: 'Gusto',
    category: 'Cubicle',
    subtitle: 'Vandal-Resistant High-Abuse Restroom Cubicle',
    description: 'High-abuse, vandal-resistant commercial restroom partition system designed for transportation terminals and industrial plants.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1980 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Vandal-Resistant Continuous Hinges', material: 'Both' },
      { id: 'h2', name: 'Heavy-Duty Indicator Lock with Coin Emergency Release', material: 'Both' },
      { id: 'h3', name: 'Stainless Steel Solid Door Pull', material: 'Both' },
      { id: 'h4', name: 'Cast Stainless Steel Coat Hook', material: 'Both' },
      { id: 'h5', name: 'Adjustable Ground Clearance Legs (100–150mm)', material: 'Both' },
      { id: 'h6', name: 'Reinforced Top Headrail Channel', material: 'Both' },
    ],
  },
  {
    id: 'std-skywings',
    slug: 'cubicle-skywings',
    title: 'SkyWings',
    category: 'Cubicle',
    subtitle: 'Signature Aerofoil Wing Top Profile Cubicle',
    description: 'Signature aerofoil top profile cubicle with aerodynamic upper rail for upscale malls, hotels, and luxury clubhouses.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '2000 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Aerofoil Wing Top Rail Assembly', material: 'Both' },
      { id: 'h2', name: 'Self-Closing Gravity Hinges', material: 'Both' },
      { id: 'h3', name: 'Architectural Indicator Lock & Handle', material: 'Both' },
      { id: 'h4', name: 'Adjustable Supporting Legs (100–150mm)', material: 'Both' },
      { id: 'h5', name: 'Coat Hook with Integrated Buffer', material: 'Both' },
    ],
  },
  {
    id: 'std-wall-hung',
    slug: 'cubicle-wall-hung',
    title: 'wall hung',
    category: 'Cubicle',
    subtitle: 'Suspended Floor-Clearance Cubicle (Zero Floor Legs)',
    description: 'Suspended cantilever design providing 100% unobstructed floor clearance for automated scrubbing and maximum hygiene.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1850 mm (200mm suspended floor clearance)' },
      { label: 'Standard Depth', value: '1500 mm – 1650 mm' },
      { label: 'Door Width', value: '600 mm (Standard)' },
      { label: 'Board Thickness', value: '18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Structural Steel Wall-Cantilever Cantilever Brackets', material: 'Both' },
      { id: 'h2', name: 'Heavy-Duty Suspended Pivot Hinges', material: 'Both' },
      { id: 'h3', name: 'Turn-Bolt Privacy Lock with Indicator', material: 'Both' },
      { id: 'h4', name: 'Door Pull Knob & Coat Hook', material: 'Both' },
    ],
  },
  {
    id: 'std-saffron',
    slug: 'cubicle-saffron',
    title: 'saffron',
    category: 'Cubicle',
    subtitle: 'Streamlined Contemporary Aesthetic System',
    description: 'Streamlined contemporary cubicle system with refined edge chamfers and premium satin hardware.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Saffron Gravity Hinges with Cam Action', material: 'Both' },
      { id: 'h2', name: 'Privacy Turn Lock & Indicator', material: 'Both' },
      { id: 'h3', name: 'Door Knob & Coat Hook with Buffer', material: 'Both' },
      { id: 'h4', name: 'Adjustable Supporting Legs (100–150mm)', material: 'Both' },
      { id: 'h5', name: 'Continuous Top Headrail', material: 'Both' },
    ],
  },
  {
    id: 'std-splendor',
    slug: 'cubicle-splendor',
    title: 'Splendor',
    category: 'Cubicle',
    subtitle: '5-Star Luxury Executive Lounge Cubicle',
    description: 'Executive luxury cubicle system with full-height doors and concealed gap acoustic rebates for 5-star hotels and VIP lounges.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '2100 mm (Full Height Luxury Profile)' },
      { label: 'Standard Depth', value: '1600 mm – 1800 mm' },
      { label: 'Door Width', value: '650 mm (Standard) / 900 mm (Accessible)' },
      { label: 'Board Thickness', value: '18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Luxury Full-Length Concealed Pivot Hinges', material: 'Both' },
      { id: 'h2', name: 'Executive Soft-Closing Indicator Latch', material: 'Both' },
      { id: 'h3', name: 'Machined Solid Brass/SS Door Pull Handle', material: 'Both' },
      { id: 'h4', name: 'Solid Support Feet with Concealed Anchors', material: 'Both' },
    ],
  },
  {
    id: 'std-summer-fun-kids',
    slug: 'cubicle-summer-fun-kids',
    title: 'summer fun (kids)',
    category: 'Cubicle',
    subtitle: 'Child-Safe Colorful Restroom System for Preschools',
    description: 'Vibrant child-safe partition system with anti-finger trap rounded safety hinges and low door heights for nursery and primary schools.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1400 mm – 1600 mm (Child-Safe Low Height)' },
      { label: 'Standard Depth', value: '1200 mm – 1400 mm' },
      { label: 'Door Width', value: '550 mm – 600 mm with Safety Gap' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Anti-Finger Trap Safety Hinges', material: 'Both' },
      { id: 'h2', name: 'Child-Friendly Magnetic Latch / Turn Knob (No Lockout)', material: 'Both' },
      { id: 'h3', name: 'Low Height Door Pulls & Soft Buffer Stops', material: 'Both' },
      { id: 'h4', name: 'Rounded Safety Supporting Legs (100–150mm)', material: 'Both' },
    ],
  },
  {
    id: 'std-azalea-kids',
    slug: 'cubicle-azalea-kids',
    title: 'Azalea (Kids)',
    category: 'Cubicle',
    subtitle: 'Curved Floral-Theme Child Friendly Cubicle',
    description: 'Floral-themed curved partition system with gentle contours and anti-pinch safety hardware for children washrooms.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1450 mm (Child Friendly Profile)' },
      { label: 'Standard Depth', value: '1200 mm – 1400 mm' },
      { label: 'Door Width', value: '550 mm' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Safety Curved Edge Hinges (Anti-Pinch)', material: 'Both' },
      { id: 'h2', name: 'Emergency Easy-Release Latch Mechanism', material: 'Both' },
      { id: 'h3', name: 'Adjustable Supporting Legs (100–150mm)', material: 'Both' },
    ],
  },
  {
    id: 'std-miniarc-kids',
    slug: 'cubicle-miniarc-kids',
    title: 'miniarc (kids)',
    category: 'Cubicle',
    subtitle: 'Arched-Door Architectural Cubicle for Nursery Schools',
    description: 'Arched-door partition system with visual teacher supervision headroom for preschools and kindergartens.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1400 mm / 1500 mm' },
      { label: 'Standard Depth', value: '1200 mm – 1400 mm' },
      { label: 'Door Width', value: '550 mm' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Safety Pivot Hinges with 12mm Finger Gap', material: 'Both' },
      { id: 'h2', name: 'Nylon Ergonomic Safety Latches', material: 'Both' },
      { id: 'h3', name: 'Adjustable Supporting Legs', material: 'Both' },
    ],
  },
  {
    id: 'std-arcadia-kids',
    slug: 'cubicle-arcadia-kids',
    title: 'arcadia (Kids)',
    category: 'Cubicle',
    subtitle: 'Scalloped-Edge Playful Cubicle for Children Spaces',
    description: 'Playful scalloped-edge cubicle system engineered for amusement centers and kids play facilities.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1450 mm' },
      { label: 'Standard Depth', value: '1200 mm – 1400 mm' },
      { label: 'Door Width', value: '550 mm' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Child Safety Hinges & Buffer Hook', material: 'Both' },
      { id: 'h2', name: 'Surface Mounted Indicator Latch', material: 'Both' },
      { id: 'h3', name: 'Adjustable Supporting Legs', material: 'Both' },
    ],
  },
  {
    id: 'std-platina-wave',
    slug: 'cubicle-platina-wave',
    title: 'platina wave',
    category: 'Cubicle',
    subtitle: 'Designer Wave-Top Variation of Platina Flagship',
    description: 'Designer wave-top variation of Platina flagship with continuous wave profile and heavy-duty box extrusions.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1980 mm / 2000 mm (including 150mm floor gap)' },
      { label: 'Standard Depth', value: '1500 mm – 1800 mm' },
      { label: 'Door Width', value: '600 mm (Standard) / 900 mm (Accessible/ADA)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'h1', name: 'Wave Top Profile Extrusion Header', material: 'Both' },
      { id: 'h2', name: 'Heavy-Duty Gravity Hinges with Cam Action', material: 'Both' },
      { id: 'h3', name: 'Occupancy Indicator Lock & Double-Sided Pull Knob', material: 'Both' },
      { id: 'h4', name: 'Adjustable Supporting Legs (100–150mm)', material: 'Both' },
      { id: 'h5', name: 'Coat Hook with Integrated Buffer', material: 'Both' },
    ],
  },

  // ── 2. LOCKER MODELS (7) ──
  {
    id: 'std-locker-z-shape',
    slug: 'locker-z-shape',
    title: 'Z shape',
    category: 'Lockers',
    subtitle: 'Space-Optimized Dual Hanging Z-Locker Compartment',
    description: 'Innovative Z-shaped interlocking door geometry allowing two users to hang full-length garments in the footprint of a single column.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '380mm W × 450mm D × 1800mm H' },
      { label: 'Door Configuration', value: 'Dual Z-Shaped Interlocking Doors' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Heavy-Duty Concealed Pivot Hinges (2 pcs per Z-door)' },
      { id: 'l2', name: 'Master-Keyed Cam Lock with 2 Keys per Compartment' },
      { id: 'l3', name: 'Anodized Aluminum Door Number Plate' },
      { id: 'l4', name: 'Air Ventilation Louver Grille' },
      { id: 'l5', name: 'Interior Heavy-Duty Coat Hook & Hanging Bar' },
      { id: 'l6', name: 'Base Plinth Leveler Legs (4 pcs per tower)' },
    ],
  },
  {
    id: 'std-locker-tier-1',
    slug: 'locker-tier-1',
    title: 'Tier 1 locker',
    category: 'Lockers',
    subtitle: 'Single Compartment Full-Length Wardrobe Locker',
    description: 'Full-height storage column equipped with top interior shelf and garment hanging rail for executive suites and clubs.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '300mm W × 450mm D × 1800mm H' },
      { label: 'Door Configuration', value: 'Single Full-Length Door' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Heavy-Duty Concealed Pivot Hinges (3 pcs per full door)' },
      { id: 'l2', name: 'Master-Keyed Cam Lock with 2 Keys' },
      { id: 'l3', name: 'Door Number Plate' },
      { id: 'l4', name: 'Dual Ventilation Louvers (Top & Bottom)' },
      { id: 'l5', name: 'Interior Top Hat Shelf & SS Garment Hanging Rail' },
      { id: 'l6', name: 'Base Plinth Leveler Feet' },
    ],
  },
  {
    id: 'std-locker-tier-2',
    slug: 'locker-tier-2',
    title: 'Tier 2 locker',
    category: 'Lockers',
    subtitle: 'Dual Compartment 2-Tier Stacked Storage Locker',
    description: 'Standard commercial 2-compartment locker with balanced storage volume for gyms and offices.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '300mm W × 450mm D × 900mm H per tier' },
      { label: 'Door Configuration', value: '2 Stacked Vertical Doors' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Heavy-Duty Concealed Pivot Hinges (2 pcs per tier door)' },
      { id: 'l2', name: 'Master-Keyed Cam Lock with 2 Keys per tier' },
      { id: 'l3', name: 'Door Number Plates (1 & 2)' },
      { id: 'l4', name: 'Ventilation Louver Grilles' },
      { id: 'l5', name: 'Interior Clothes Hooks' },
      { id: 'l6', name: 'Base Plinth Leveler Legs' },
    ],
  },
  {
    id: 'std-locker-tier-3',
    slug: 'locker-tier-3',
    title: 'Tier 3 locker',
    category: 'Lockers',
    subtitle: 'Triple Compartment 3-Tier Storage Locker',
    description: 'Medium-density 3-door locker column providing bag and personal storage for 3 users.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '300mm W × 450mm D × 600mm H per tier' },
      { label: 'Door Configuration', value: '3 Stacked Doors' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Heavy-Duty Concealed Pivot Hinges' },
      { id: 'l2', name: 'Master-Keyed Cam Lock with 2 Keys per tier' },
      { id: 'l3', name: 'Door Number Plates' },
      { id: 'l4', name: 'Ventilation Louvers' },
      { id: 'l5', name: 'Base Plinth Leveler Legs' },
    ],
  },
  {
    id: 'std-locker-tier-4',
    slug: 'locker-tier-4',
    title: 'Tier 4 locker',
    category: 'Lockers',
    subtitle: 'High-Density 4-Compartment Storage Unit',
    description: 'High-density 4-compartment locker for employee shift rooms and logistics hubs.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '300mm W × 450mm D × 450mm H per tier' },
      { label: 'Door Configuration', value: '4 Stacked Doors' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Heavy-Duty Concealed Pivot Hinges' },
      { id: 'l2', name: 'Master-Keyed Cam Lock with 2 Keys per tier' },
      { id: 'l3', name: 'Door Number Plates' },
      { id: 'l4', name: 'Air Ventilation Louvers' },
      { id: 'l5', name: 'Base Plinth Leveler Legs' },
    ],
  },
  {
    id: 'std-locker-tier-5',
    slug: 'locker-tier-5',
    title: 'Tier 5 locker',
    category: 'Lockers',
    subtitle: 'Compact 5-Door Vertical Compartment Locker',
    description: '5-tier locker for smartphone, tablet, and purse drop-boxes in cleanrooms and IT campuses.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '300mm W × 450mm D × 360mm H per tier' },
      { label: 'Door Configuration', value: '5 Stacked Doors' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Concealed Pivot Hinges' },
      { id: 'l2', name: 'Cam Lock with 2 Keys per compartment' },
      { id: 'l3', name: 'Number Plates' },
      { id: 'l4', name: 'Ventilation Openings' },
      { id: 'l5', name: 'Base Plinth Leveler Legs' },
    ],
  },
  {
    id: 'std-locker-tier-6',
    slug: 'locker-tier-6',
    title: 'Tier 6 locker',
    category: 'Lockers',
    subtitle: 'Ultra-High Density 6-Tier Valuables Deposit Locker',
    description: 'Maximum density 6-compartment tower for keys, wallets, and portable electronics.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1800 mm (plus 100mm plinth base)' },
      { label: 'Compartment Size', value: '300mm W × 450mm D × 300mm H per tier' },
      { label: 'Door Configuration', value: '6 Stacked Doors' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'l1', name: 'Concealed Pivot Hinges' },
      { id: 'l2', name: 'Individual Keyed Cam Lock' },
      { id: 'l3', name: 'Number Plates' },
      { id: 'l4', name: 'Base Plinth Leveler Legs' },
    ],
  },

  // ── 3. URINAL PARTITIONS (4) ──
  {
    id: 'std-urinal-model-a',
    slug: 'urinal-model-a',
    title: 'model A',
    category: 'Urinal Partitions',
    subtitle: 'Floor & Wall Supported Partition with Extra Supporting Leg',
    description: 'Engineered for high-impact commercial restrooms. Model A incorporates an extra adjustable floor-supporting leg to anchor the outer bottom edge, eliminating cantilever wall stress.',
    imageUrl: '',
    hasExtraLeg: true,
    specifications: [
      { label: 'Standard Height', value: '900 mm – 1200 mm (floor leg supported)' },
      { label: 'Standard Depth', value: '450 mm – 500 mm W' },
      { label: 'Door Width', value: 'N/A (Divider Screen)' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'u1', name: 'Heavy Duty Wall Mounting Corner L-Clamps (3 pcs Grade 304 SS)' },
      { id: 'u2', name: 'Extra Supporting Floor Leg (100–150mm adjustable ground clearance)', isExtraLeg: true },
      { id: 'u3', name: 'SS Wall Fixing Screws, Heavy Duty Anchors & Decorative Caps' },
    ],
  },
  {
    id: 'std-urinal-model-b',
    slug: 'urinal-model-b',
    title: 'model B',
    category: 'Urinal Partitions',
    subtitle: 'Cantilever Wall-Hung Floating Screen (Corner Clamp Mount)',
    description: 'Clean floating cantilevered urinal partition anchored to the wall using three heavy-duty stainless steel corner brackets. Unobstructed floor facilitates swift sanitization.',
    imageUrl: '',
    hasExtraLeg: false,
    specifications: [
      { label: 'Standard Height', value: '900 mm (with 300mm floor clearance)' },
      { label: 'Standard Depth', value: '450 mm W' },
      { label: 'Door Width', value: 'N/A (Divider Screen)' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'u1', name: 'Heavy Duty Grade 304 Wall Mounting Corner L-Clamps (3 pcs)' },
      { id: 'u2', name: 'Wall Expansion Anchors & Screws with Cover Caps' },
    ],
  },
  {
    id: 'std-urinal-model-c',
    slug: 'urinal-model-c',
    title: 'model C',
    category: 'Urinal Partitions',
    subtitle: 'Continuous Channel Wall-Mount Partition Screen',
    description: 'Features a full-height continuous anodized aluminum U-channel wall profile that conceals fasteners and provides an ultra-clean architectural junction.',
    imageUrl: '',
    hasExtraLeg: false,
    specifications: [
      { label: 'Standard Height', value: '900 mm – 1000 mm (with 300mm floor clearance)' },
      { label: 'Standard Depth', value: '450 mm W' },
      { label: 'Door Width', value: 'N/A (Divider Screen)' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'u1', name: 'Full-Height Architectural Anodized Aluminum U-Channel' },
      { id: 'u2', name: 'Concealed Wall Fixing Fasteners Pack' },
    ],
  },
  {
    id: 'std-urinal-model-d',
    slug: 'urinal-model-d',
    title: 'model D',
    category: 'Urinal Partitions',
    subtitle: 'Extended Full-Privacy Structural Screen',
    description: 'An enlarged 1200mm high privacy shield designed for luxury executive washrooms. Reinforced with four structural corner brackets.',
    imageUrl: '',
    hasExtraLeg: false,
    specifications: [
      { label: 'Standard Height', value: '1200 mm High Privacy Profile' },
      { label: 'Standard Depth', value: '500 mm – 600 mm W' },
      { label: 'Door Width', value: 'N/A (Divider Screen)' },
      { label: 'Board Thickness', value: '12mm / 18mm Solid Compact Phenolic Laminate' },
    ],
    hardwareList: [
      { id: 'u1', name: 'Heavy Duty Structural Corner Brackets (4 pcs)' },
      { id: 'u2', name: 'Grade 304 Wall Anchors & Fasteners Pack' },
    ],
  },

  // ── 4. KIDS TOILET MODELS ──
  {
    id: 'std-summer-fun',
    slug: 'kids-summer-fun',
    title: 'Summer Fun',
    category: 'Kids Toilet',
    subtitle: 'Vibrant Child-Safety Restroom Cubicle with Anti-Pinch Clearance',
    description: 'Engineered solid compact phenolic laminate cubicle partition designed specially for primary schools, kindergartens, and child care centers. Features low door height for supervisory vision, anti-finger trap rounded edges, and soft self-closing spring hinges.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1200 mm – 1500 mm (Child-Friendly Ergonomic Height)' },
      { label: 'Standard Depth', value: '1200 mm – 1500 mm' },
      { label: 'Door Width', value: '500 mm – 600 mm (Child Ergonomic Safety Door)' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
      { label: 'Safety Feature', value: 'Anti-Pinch Hinge Gap & Outside Emergency Coin Release' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'k1', name: 'Nylon Safety Spring Hinges (Soft & Self-Closing Pair)', material: 'Both' },
      { id: 'k2', name: 'Emergency Release Coin Latch / Safety Turn Lock', material: 'Both' },
      { id: 'k3', name: 'Ergonomic Rounded Child Door Knob', material: 'Both' },
      { id: 'k4', name: 'Safety Coat & Bag Hook with Soft Buffer', material: 'Both' },
      { id: 'k5', name: 'Adjustable Floor Support Legs (100–150mm)', material: 'Both' },
      { id: 'k6', name: 'Continuous Top Headrail Stabilizer Bar', material: 'Both' },
      { id: 'k7', name: 'Wall Fixing U-Channels & Anti-Tamper Fasteners Pack', material: 'Both' },
    ],
  },
  {
    id: 'std-azalea-kids',
    slug: 'kids-azalea',
    title: 'Azalea',
    category: 'Kids Toilet',
    subtitle: 'Playful Bowling Pin Contoured Child Restroom Cubicle',
    description: 'Custom-shaped decorative children restroom cubicle with bowling-pin inspired playful door profile, non-pinching safety gaps, and teacher-accessible exterior emergency release lock.',
    imageUrl: '',
    specifications: [
      { label: 'Standard Height', value: '1200 mm – 1400 mm' },
      { label: 'Standard Depth', value: '1200 mm – 1500 mm' },
      { label: 'Door Width', value: '500 mm – 600 mm (Contoured Bowling-Pin Safety Door)' },
      { label: 'Board Thickness', value: '12mm Solid Compact Phenolic Laminate' },
      { label: 'Safety Feature', value: 'Rounded Anti-Collision Corners & Finger-Safe Hinges' },
    ],
    hardwareOptions: [
      { material: 'SS Hardware', enabled: true, colors: ['golden', 'Black', 'stainless steel'] },
      { material: 'Nylon Hardware', enabled: true, colors: [] },
    ],
    hardwareList: [
      { id: 'k1', name: 'Nylon Safety Spring Hinges (Soft & Self-Closing Pair)', material: 'Both' },
      { id: 'k2', name: 'Emergency Release Coin Latch / Safety Turn Lock', material: 'Both' },
      { id: 'k3', name: 'Ergonomic Rounded Child Door Knob', material: 'Both' },
      { id: 'k4', name: 'Safety Coat & Bag Hook with Soft Buffer', material: 'Both' },
      { id: 'k5', name: 'Adjustable Floor Support Legs (100–150mm)', material: 'Both' },
      { id: 'k6', name: 'Continuous Top Headrail Stabilizer Bar', material: 'Both' },
      { id: 'k7', name: 'Wall Fixing U-Channels & Anti-Tamper Fasteners Pack', material: 'Both' },
    ],
  },
];

/**
 * Returns only active, published models from database / catalog.
 * Hardcoded presets are no longer injected so only database-listed models appear in Quotations, PI, Orders & Invoices.
 */
export function getMergedQuotationModels(userModels: ProductCatalogModel[] = []): ProductCatalogModel[] {
  return (userModels || []).filter((m) => m.published !== false);
}

/**
 * Formats a model's hardware list into the narrative "Standard Inclusions & Hardware Accessories *" format.
 */
export function formatModelHardwareInclusions(model: ProductCatalogModel): string {
  const lines: string[] = [];

  // Hardware package headline
  if (model.category === 'Lockers') {
    lines.push('• Standard Heavy-Duty Uniform Hardware Package (Tamper-Proof Concealed Installation)');
  } else if (model.category === 'Urinal Partitions') {
    if (model.hasExtraLeg || model.title.toLowerCase().includes('model a')) {
      lines.push('• Mounting System: Wall Clamps + Extra Adjustable Floor Supporting Leg (100–150mm)');
    } else {
      lines.push('• Mounting System: Wall Cantilever Floating Mount (Zero Floor Obstruction)');
    }
  }

  // Itemized components
  if (model.hardwareList && model.hardwareList.length > 0) {
    model.hardwareList.forEach((h) => {
      const cleanName = h.name.replace(/\s*\[SS Hardware\]\s*/gi, ' ').trim();
      const mat =
        h.material && h.material !== 'Standard' && h.material !== 'Both' && h.material !== 'SS Hardware'
          ? ` [${h.material}]`
          : '';
      const cleanNotes = h.notes ? ` (${h.notes.replace(/\s*\[SS Hardware\]\s*/gi, ' ').trim()})` : '';
      lines.push(`• ${cleanName}${mat}${cleanNotes}`);
    });
  } else {
    // Default fallback hardware components by category
    if (model.category === 'Cubicle') {
      lines.push('• Gravity Hinges: Self-closing gravity hinges with nylon cam mechanism');
      lines.push('• Occupancy Indicator Lock: Turn-bolt privacy lock with external red/white indicator & emergency coin release');
      lines.push('• Adjustable Supporting Legs: Heavy-duty 100mm–150mm ground clearance legs');
      lines.push('• Door Knob / Pull Handle: Ergonomic double-sided architectural pull');
      lines.push('• Coat Hook with Buffer: Heavy-duty hook with integrated rubber door buffer stop');
      lines.push('• Top Headrail: Continuous overhead box extrusion stabilizer rail');
      lines.push('• Wall Fixing: Full-height anodized U-channels with Grade 304 stainless steel fasteners');
    } else if (model.category === 'Lockers') {
      lines.push('• Heavy-Duty Concealed Pivot Hinges (2 pcs per locker compartment door)');
      lines.push('• Master-Keyed Security Cam Lock with 2 individual keys');
      lines.push('• Anodized Aluminum Locker Door Number Plate');
      lines.push('• Dual Air Ventilation Louvers per compartment');
      lines.push('• Heavy-Duty Base Plinth Leveler Legs');
    } else if (model.category === 'Urinal Partitions') {
      lines.push('• Heavy-Duty Wall Mounting Corner L-Clamps (Grade 304 Stainless Steel)');
      if (model.hasExtraLeg || model.title.toLowerCase().includes('model a')) {
        lines.push('• Extra Floor Supporting Leg (100–150mm adjustable ground clearance)');
      }
      lines.push('• Wall Anchors & Fasteners with Decorative Caps');
    } else if (model.category === 'Kids Toilet') {
      lines.push('• Nylon Safety Spring Hinges (Soft & Self-Closing Pair)');
      lines.push('• Emergency Release Coin Latch / Safety Turn Lock with Outside Accessibility');
      lines.push('• Ergonomic Rounded Child Door Knob');
      lines.push('• Safety Coat & Bag Hook with Integrated Soft Rubber Buffer');
      lines.push('• Adjustable Floor Support Legs (100–150mm ground clearance)');
      lines.push('• Continuous Top Headrail Stabilizer Box Extrusion');
      lines.push('• Full-Height Wall Fixing U-Channels & Anti-Tamper Fasteners');
    }
  }

  return lines.join('\n');
}

/**
 * Extracts cubicleSize, doorSize, overallHeight, boardThickness, boardType from a model.
 */
export function extractModelDimensions(model: ProductCatalogModel) {
  const specs = model.specifications || [];

  const findSpec = (patterns: string[]): string => {
    for (const p of patterns) {
      const match = specs.find((s) => s.label.toLowerCase().includes(p.toLowerCase()));
      if (match && match.value.trim()) return match.value.trim();
    }
    return '';
  };

  let cubicleSize = findSpec(['cubicle size', 'standard depth', 'depth', 'compartment']);
  let doorSize = findSpec(['door size', 'door width', 'door', 'configuration']);
  let overallHeight = findSpec(['overall height', 'standard height', 'height']);
  let boardThickness = findSpec(['board thickness', 'thickness']);

  // Defaults per category if missing in custom model
  if (model.category === 'Cubicle') {
    if (!cubicleSize) cubicleSize = '1000mm W × 1500mm D';
    if (!doorSize) doorSize = '600mm × 1785mm (Standard)';
    if (!overallHeight) overallHeight = '1980 mm / 2000 mm (incl. 150mm ground clearance)';
    if (!boardThickness) boardThickness = '12mm / 18mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Lockers') {
    if (!cubicleSize) cubicleSize = '300mm W × 450mm D × 1800mm H';
    if (!doorSize) doorSize = 'Tier Modular Doors as per drawing';
    if (!overallHeight) overallHeight = '1800mm (plus 100mm plinth base)';
    if (!boardThickness) boardThickness = '12mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Urinal Partitions') {
    if (!cubicleSize) cubicleSize = '450mm W × 900mm H';
    if (!doorSize) doorSize = 'N/A (Divider Screen)';
    if (!overallHeight) overallHeight = model.hasExtraLeg ? '900mm – 1200mm (floor & wall supported)' : '900mm (with 300mm floor clearance)';
    if (!boardThickness) boardThickness = '12mm Solid Compact Phenolic Laminate';
  } else if (model.category === 'Kids Toilet') {
    if (!cubicleSize) cubicleSize = '900mm W × 1200mm D';
    if (!doorSize) doorSize = '500mm × 1050mm (Child Ergonomic Safety Door)';
    if (!overallHeight) overallHeight = '1200 mm – 1500 mm (Child-Friendly Ergonomic Height)';
    if (!boardThickness) boardThickness = '12mm Solid Compact Phenolic Laminate';
  }

  let hardwarePackage = '';
  if (model.category === 'Cubicle') {
    hardwarePackage = '';
  } else if (model.category === 'Lockers') {
    hardwarePackage = 'Heavy-Duty Uniform Standard Locker Hardware';
  } else if (model.category === 'Urinal Partitions') {
    hardwarePackage = model.hasExtraLeg
      ? 'Grade 304 Wall Clamps + Extra Floor Supporting Leg'
      : 'Grade 304 Wall Mount Cantilever Clamps';
  } else if (model.category === 'Kids Toilet') {
    hardwarePackage = 'Child Safety Ergonomic Hardware (Anti-Finger Pinch & Emergency Release)';
  }

  let make = findSpec(['make', 'brand', 'manufacturer']) || 'Pacific';

  return {
    cubicleSize,
    doorSize,
    overallHeight,
    boardThickness,
    boardType: 'HPL',
    hardwarePackage,
    make,
  };
}

export interface ExtractedHardwareItem {
  id?: string;
  itemType: 'hardware';
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  isCustom?: boolean;
}

/**
 * Extracts individual hardware line items from a catalog model, each with proper default unit, HSN (8302/7610), quantity, and rate.
 */
export function extractModelHardwareItems(
  model: ProductCatalogModel,
  cubicleQuantity: number = 1
): ExtractedHardwareItem[] {
  const items: ExtractedHardwareItem[] = [];

  const resolveUnitAndHsn = (name: string): { unit: string; hsn: string; defaultQty: number } => {
    const lower = name.toLowerCase();
    if (lower.includes('hinge') || lower.includes('pivot')) {
      return { unit: 'PAIR', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('lock') || lower.includes('indicator') || lower.includes('turn')) {
      return { unit: 'SET', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('handle') || lower.includes('knob') || lower.includes('pull')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('hook') || lower.includes('buffer')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('leg') || lower.includes('shoe') || lower.includes('foot') || lower.includes('feet')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 2 };
    }
    if (lower.includes('headrail') || lower.includes('rail') || lower.includes('box')) {
      return { unit: 'RMT', hsn: '7610', defaultQty: 1 };
    }
    if (lower.includes('channel') || lower.includes('u-channel') || lower.includes('fastener') || lower.includes('clamp')) {
      return { unit: 'SET', hsn: '8302', defaultQty: 1 };
    }
    if (lower.includes('number plate') || lower.includes('louver')) {
      return { unit: 'NOS', hsn: '8302', defaultQty: 1 };
    }
    return { unit: 'SET', hsn: '8302', defaultQty: 1 };
  };

  if (model.hardwareList && model.hardwareList.length > 0) {
    model.hardwareList.forEach((h) => {
      const cleanName = h.name.replace(/\s*\[SS Hardware\]\s*/gi, ' ').trim();
      const { unit, hsn, defaultQty } = resolveUnitAndHsn(cleanName);
      items.push({
        itemType: 'hardware',
        description: cleanName,
        hsnSac: hsn,
        quantity: Math.max(1, defaultQty * (cubicleQuantity || 1)),
        unit,
        rate: 0,
        gstRate: 18,
      });
    });
  } else {
    // Default fallback hardware components by category
    if (model.category === 'Cubicle') {
      const defaults = [
        { name: 'Gravity Hinges (Self-Closing Pair with Nylon Cam)', unit: 'PAIR', hsn: '8302', qty: 1 },
        { name: 'Occupancy Indicator Lock with Emergency Release', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Ergonomic Door Pull Handle / Knob', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Coat Hook with Integrated Rubber Buffer Stop', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Adjustable Supporting Legs (100–150mm ground clearance)', unit: 'NOS', hsn: '8302', qty: 2 },
        { name: 'Continuous Top Headrail Stabilizer Box Extrusion', unit: 'RMT', hsn: '7610', qty: 1 },
        { name: 'Wall Fixing U-Channels & SS 304 Fasteners Pack', unit: 'SET', hsn: '8302', qty: 1 },
      ];
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    } else if (model.category === 'Lockers') {
      const defaults = [
        { name: 'Heavy-Duty Concealed Pivot Hinges (Pair per door)', unit: 'PAIR', hsn: '8302', qty: 1 },
        { name: 'Master-Keyed Security Cam Lock with 2 Keys', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Anodized Aluminum Locker Door Number Plate', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Dual Air Ventilation Louvers Pack', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Heavy-Duty Base Plinth Leveler Legs', unit: 'NOS', hsn: '8302', qty: 4 },
      ];
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    } else if (model.category === 'Urinal Partitions') {
      const defaults = [
        { name: 'Heavy-Duty Grade 304 Stainless Steel Corner L-Clamps', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Wall Anchors & SS 304 Fasteners Pack', unit: 'SET', hsn: '8302', qty: 1 },
      ];
      if (model.hasExtraLeg || model.title.toLowerCase().includes('model a')) {
        defaults.push({
          name: 'Extra Floor Supporting Leg (100–150mm adjustable ground clearance)',
          unit: 'NOS',
          hsn: '8302',
          qty: 1,
        });
      }
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    } else if (model.category === 'Kids Toilet') {
      const defaults = [
        { name: 'Nylon Safety Spring Hinges (Soft & Self-Closing Pair)', unit: 'PAIR', hsn: '8302', qty: 1 },
        { name: 'Emergency Release Coin Latch / Safety Turn Lock', unit: 'SET', hsn: '8302', qty: 1 },
        { name: 'Ergonomic Rounded Child Door Knob', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Safety Coat & Bag Hook with Soft Buffer', unit: 'NOS', hsn: '8302', qty: 1 },
        { name: 'Adjustable Floor Support Legs (100–150mm ground clearance)', unit: 'NOS', hsn: '8302', qty: 2 },
        { name: 'Continuous Top Headrail Stabilizer Box Extrusion', unit: 'RMT', hsn: '7610', qty: 1 },
        { name: 'Wall Fixing U-Channels & Anti-Tamper Fasteners Pack', unit: 'SET', hsn: '8302', qty: 1 },
      ];
      defaults.forEach((d) => {
        items.push({
          itemType: 'hardware',
          description: d.name,
          hsnSac: d.hsn,
          quantity: Math.max(1, d.qty * (cubicleQuantity || 1)),
          unit: d.unit,
          rate: 0,
          gstRate: 18,
        });
      });
    }
  }

  return items;
}

/**
 * Intelligently finds the best matching catalog model from quotation item metadata,
 * product IDs, model slugs, or item description text.
 */
export function findMatchingCatalogModel(
  catalogModels: ProductCatalogModel[],
  candidate: { productId?: string; description?: string; modelId?: string }
): ProductCatalogModel | undefined {
  if (!catalogModels || catalogModels.length === 0) return undefined;

  // 1. Direct ID or Slug match
  const candidateId = (candidate.productId || candidate.modelId || '').trim().toLowerCase();
  if (candidateId) {
    const directMatch = catalogModels.find(
      (m) => m.id.toLowerCase() === candidateId || m.slug.toLowerCase() === candidateId
    );
    if (directMatch) return directMatch;
  }

  // 2. Search for model titles in description
  const desc = (candidate.description || '').toLowerCase();
  if (desc) {
    for (const m of catalogModels) {
      if (m.title && desc.includes(m.title.toLowerCase())) {
        return m;
      }
      if (m.slug && desc.includes(m.slug.toLowerCase())) {
        return m;
      }
    }

    // 3. Category heuristics
    if (desc.includes('kids') || desc.includes('child') || desc.includes('kindergarten') || desc.includes('school')) {
      const kids = catalogModels.find((m) => m.category === 'Kids Toilet');
      if (kids) return kids;
    }
    if (desc.includes('locker')) {
      const locker = catalogModels.find((m) => m.category === 'Lockers');
      if (locker) return locker;
    }
    if (desc.includes('urinal') || desc.includes('screen') || desc.includes('divider')) {
      const urinal = catalogModels.find((m) => m.category === 'Urinal Partitions');
      if (urinal) return urinal;
    }
  }

  // 4. Default fallback: Delight or first available cubicle model
  const defaultCubicle =
    catalogModels.find((m) => m.title.toLowerCase().includes('delight')) ||
    catalogModels.find((m) => m.category === 'Cubicle') ||
    catalogModels[0];

  return defaultCubicle;
}

