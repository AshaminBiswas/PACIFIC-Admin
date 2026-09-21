/**
 * Hardcoded demo data — used when Supabase isn't configured yet.
 * Once the DB is seeded, the frontend will read from Supabase instead.
 */
import type { Product, Blog, Solution, GalleryImage } from "./database.types";

// ── Products ─────────────────────────────────────────────────
export const demoProducts: Product[] = [
  {
    id: "prod-hpl-classic-001",
    slug: "hpl-classic-restroom-cubicle",
    title: "Classic HPL Restroom Cubicle",
    subtitle: "Durable & Moisture-Resistant Commercial Washroom System",
    description: "Engineered with 12mm High-Pressure Compact Laminate (HPL) panels and grade 304 stainless steel hardware. Ideal for high-traffic corporate offices, airports, and malls.",
    bottom_description: "Meets international fire retardant and anti-microbial standards for hygienic public washroom environments.",
    category: "Restroom Cubicles",
    image_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    additional_images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"
    ],
    features: [
      "12mm Solid Compact Grade Laminate",
      "100% Water, Moisture & Termite Proof",
      "Grade 304 Stainless Steel Hardware",
      "Anti-Bacterial & Easy Maintenance",
      "Heavy Duty Overhead Braced Structure"
    ],
    specifications: [
      { label: "Board Thickness", value: "12mm Compact Laminate" },
      { label: "Hardware Grade", value: "SS 304 Satin Finish" },
      { label: "Standard Height", value: "2000 mm" },
      { label: "Standard Depth", value: "1500 mm" },
      { label: "Fire Rating", value: "Class 1 / BS 476 Part 7" }
    ],
    applications: [
      "Corporate IT Parks & Offices",
      "Shopping Malls & Retail",
      "Airports & Transit Hubs",
      "Hospitals & Healthcare"
    ],
    is_featured: true,
    sort_order: 1,
    published: true,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "prod-nylon-aerofit-002",
    slug: "aerofit-nylon-cubicle-system",
    title: "AeroFit Nylon Restroom Cubicle",
    subtitle: "High-Traffic Economy Washroom Solution",
    description: "Combines 12mm phenolic compact laminate with high-impact engineered polyamide nylon hardware. Vibrant color combinations and scratch-proof performance.",
    category: "Restroom Cubicles",
    image_url: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
    additional_images: [],
    features: [
      "Polyamide Nylon Color-Matched Hardware",
      "Rust and Corrosion Proof",
      "Vandal Resistant Ergonomic Handles",
      "Cost-Effective for Educational & Public Facilities"
    ],
    specifications: [
      { label: "Board Thickness", value: "12mm Phenolic Compact Laminate" },
      { label: "Hardware Material", value: "Polyamide Grade 6 Nylon" },
      { label: "Standard Height", value: "1980 mm" },
      { label: "Floor Clearance", value: "100 mm - 150 mm" }
    ],
    applications: [
      "Schools, Colleges & Universities",
      "Sports Complexes & Gymnasiums",
      "Factory & Industrial Restrooms"
    ],
    is_featured: false,
    sort_order: 2,
    published: true,
    created_at: "2024-01-02T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z"
  },
  {
    id: "prod-urinal-partition-003",
    slug: "designer-urinal-modesty-screen",
    title: "Urinal Modesty Screen Partition",
    subtitle: "Wall-Hung & Floor-Supported Privacy Screens",
    description: "Sleek compact laminate divider screens providing aesthetic hygiene and privacy for commercial men's restrooms.",
    category: "Toilet Partition",
    image_url: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=800&q=80",
    additional_images: [],
    features: [
      "Full Radius Polished Chamfered Edges",
      "Heavy Duty Wall Clamping Brackets",
      "Waterproof & Chemical Resistant",
      "Compact Space-Saving Profile"
    ],
    specifications: [
      { label: "Dimensions", value: "900mm (H) x 450mm (W)" },
      { label: "Thickness", value: "12mm Compact Board" },
      { label: "Fixing", value: "SS 304 Heavy Duty Brackets" }
    ],
    applications: [
      "Hotels, Restaurants & Bars",
      "Multiplexes & Theatres",
      "Corporate Cafeterias"
    ],
    is_featured: false,
    sort_order: 3,
    published: true,
    created_at: "2024-01-03T00:00:00.000Z",
    updated_at: "2024-01-03T00:00:00.000Z"
  }
];

// ── Solutions ────────────────────────────────────────────────
export const demoSolutions: Solution[] = [
  {
    id: "sol-corporate-001",
    slug: "corporate-offices",
    title: "Corporate Offices & IT Campuses",
    subtitle: "Executive Aesthetics & Sound Dampening Restroom Systems",
    description: "Custom turnkey commercial restroom and locker installations engineered for grade-A office buildings, tech parks, and corporate headquarters.",
    icon_name: "Building2",
    image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    additional_images: [],
    features: [
      "Floor-to-Ceiling Privacy Partitions",
      "Acoustic Edge Buffering",
      "Concealed Fasteners & Sleek Minimalist Lines",
      "Custom Corporate Color Palette Integration"
    ],
    clients: [
      "Multinational Tech Giants",
      "Financial Institutions",
      "Co-Working Spaces"
    ],
    sort_order: 1,
    published: true,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "sol-healthcare-002",
    slug: "healthcare-hospitals",
    title: "Healthcare & Hospitals",
    subtitle: "Anti-Microbial & Barrier-Free Accessible Facilities",
    description: "Sterile, non-porous HPL surfaces with anti-microbial coatings compliant with hospital hygiene and universal accessibility guidelines.",
    icon_name: "HeartPulse",
    image_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
    additional_images: [],
    features: [
      "Anti-Bacterial Active Surface Protection",
      "Emergency Release Safety Latches",
      "ADA / Barrier-Free Wheelchair Access Dimensions",
      "Steam & Disinfectant Resistant"
    ],
    clients: [
      "Super-Speciality Hospitals",
      "Diagnostic Clinics",
      "Pharmaceutical Laboratories"
    ],
    sort_order: 2,
    published: true,
    created_at: "2024-01-02T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z"
  }
];

// ── Blogs ────────────────────────────────────────────────────
export const demoBlogs: Blog[] = [
  {
    id: "blog-hpl-guide-001",
    slug: "complete-guide-hpl-restroom-cubicles",
    title: "The Architect's Guide to Specifying HPL Restroom Cubicles",
    excerpt: "Everything architects and interior contractors need to know about high-pressure laminate thickness, fire retardancy, and hardware durability.",
    content: "When specifying commercial washrooms for high-density environments, durability and moisture resistance are paramount. High Pressure Laminate (HPL) is created by compressing multiple layers of kraft paper impregnated with phenolic resin under high pressure and heat. The result is an exceptionally tough, non-porous, homogenous board that will not rot, rust, or delaminate even in constant humid environments.",
    cover_image_url: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
    author: "Pacific Technical Editorial",
    category: "Architecture & Specifications",
    tags: ["Restroom Cubicles", "HPL", "Commercial Interiors", "Architecture"],
    published: true,
    published_at: "2024-01-15T00:00:00.000Z",
    created_at: "2024-01-15T00:00:00.000Z",
    updated_at: "2024-01-15T00:00:00.000Z"
  }
];

// ── Gallery ──────────────────────────────────────────────────
export const demoGalleryImages: GalleryImage[] = [
  {
    id: "gal-delhi-airport-001",
    title: "IGI Terminal Executive Washrooms",
    category: "Restroom Cubicles",
    location_slug: "delhi",
    placement: "general",
    image_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    sort_order: 1,
    published: true,
    created_at: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "gal-mumbai-corporate-002",
    title: "Bandra Kurla Complex Corporate Restrooms",
    category: "Restroom Cubicles",
    location_slug: "mumbai",
    placement: "general",
    image_url: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
    sort_order: 2,
    published: true,
    created_at: "2024-01-02T00:00:00.000Z"
  }
];
