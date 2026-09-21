/**
 * FAQ data store — persisted to localStorage, no database required.
 * Admin edits are saved in the browser and survive page reloads.
 */

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

// ── Default / seed FAQs ──────────────────────────────────────────────────────
const DEFAULT_FAQS: FAQ[] = [
  {
    id: "faq-1",
    question: "What types of restroom cubicle systems does Pacific Products offer?",
    answer:
      "We offer a comprehensive range of restroom cubicle systems including full-height cubicles, standard partitions, floor-to-ceiling privacy screens, and custom configurations. Our systems are available in a variety of materials — HPL (High Pressure Laminate), compact laminate, stainless steel, and acrylic solid surface — each designed for different aesthetic and durability requirements.",
    category: "Products & Services",
    sort_order: 1,
  },
  {
    id: "faq-2",
    question: "Do you provide installation services across India?",
    answer:
      "Yes, Pacific Products operates a pan-India installation network. We have trained installation teams in all major metropolitan cities including Delhi, Mumbai, Bangalore, Ahmedabad, Hyderabad, Pune, and Chennai. For projects in other locations, we coordinate with certified local partners to ensure consistent quality standards.",
    category: "Installation",
    sort_order: 2,
  },
  {
    id: "faq-3",
    question: "What is the typical project turnaround time?",
    answer:
      "Turnaround times vary based on project scope and complexity. For standard restroom cubicle installations, we typically complete the process within 2–4 weeks from order confirmation — covering design finalization, manufacturing, and installation. Large-scale commercial projects or custom designs may take 4–8 weeks. We always provide a detailed project timeline at the time of quotation.",
    category: "Installation",
    sort_order: 3,
  },
  {
    id: "faq-4",
    question: "What warranty do you offer on your products?",
    answer:
      "Pacific Products offers a standard 5-year warranty on all our cubicle systems and cladding products, covering manufacturing defects and hardware failures. Certain premium product lines come with an extended 7-year warranty. Our warranty includes replacement of defective components and, if necessary, re-installation at no additional cost.",
    category: "Warranty & Support",
    sort_order: 4,
  },
  {
    id: "faq-5",
    question: "Can I request a custom design or color for my cubicle system?",
    answer:
      "Absolutely. Customization is one of our core strengths. We offer a wide palette of standard laminate finishes, and we can also source specific RAL color codes or custom textures for your project. Our design team will work closely with your architects and interior designers to deliver a solution that perfectly matches your brand identity and space requirements.",
    category: "Products & Services",
    sort_order: 5,
  },
  {
    id: "faq-6",
    question: "What industries do you primarily serve?",
    answer:
      "We serve a wide range of industries including corporate offices, shopping malls, airports, metro & railway stations, hospitals, educational institutions, hotels & hospitality, and residential townships. Each sector has unique requirements, and we tailor our product specifications and finishes accordingly.",
    category: "General",
    sort_order: 6,
  },
  {
    id: "faq-7",
    question: "How do I request a quote for my project?",
    answer:
      "You can request a quote through multiple channels: use the 'Get Quote' form on our website, email us at info@pacificproduct.in, call us at +91 98185 92113, or connect with us on WhatsApp. Our team will respond within 24 hours with an initial estimate after reviewing your requirements and project drawings.",
    category: "General",
    sort_order: 7,
  },
  {
    id: "faq-8",
    question: "Are your products compliant with safety and building codes?",
    answer:
      "Yes. All Pacific Products cubicle systems and cladding solutions comply with relevant Indian Standards (BIS) and, for export projects, with international building codes (ASTM, EN standards). Our products are manufactured in an ISO 9001:2015 certified facility, ensuring consistent quality control at every stage of production.",
    category: "Warranty & Support",
    sort_order: 8,
  },
  {
    id: "faq-9",
    question: "Do you offer exterior cladding solutions as well?",
    answer:
      "Yes. In addition to interior partitions and paneling, we provide a comprehensive range of exterior cladding systems using materials such as Aluminium Composite Panels (ACP), HPL, stone veneer, and fiber cement boards. These solutions are engineered for weather resistance, UV stability, and long-term durability in India's varied climatic conditions.",
    category: "Products & Services",
    sort_order: 9,
  },
  {
    id: "faq-10",
    question: "What after-sales support do you provide?",
    answer:
      "Our after-sales support includes a dedicated customer service helpline, periodic maintenance visits during the warranty period, spare parts availability, and on-site rectification services. We also provide detailed maintenance guides so your facility management team can handle routine upkeep independently.",
    category: "Warranty & Support",
    sort_order: 10,
  },
];

const STORAGE_KEY = "pacific_faqs_v1";

// ── Storage helpers ──────────────────────────────────────────────────────────

export function loadFAQs(): FAQ[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FAQ[];
  } catch {
    // ignore parse errors
  }
  return DEFAULT_FAQS;
}

export function saveFAQs(faqs: FAQ[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(faqs));
  } catch {
    console.warn("Could not save FAQs to localStorage.");
  }
}

export function resetFAQs(): FAQ[] {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_FAQS;
}

export function getCategories(faqs: FAQ[]): string[] {
  return Array.from(new Set(faqs.map((f) => f.category))).sort();
}
