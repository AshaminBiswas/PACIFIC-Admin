import { supabase, uploadImage } from "./supabase";
import type { GalleryImage, PageBanner } from "./database.types";

export interface LocationSectionData {
  slug: string;
  canonicalSlug: string;
  city: string;
  stateName: string;
  region: string;
  cluster: "ncr" | "west" | "south" | "east" | "international";
  targetKeyword: string;
  h1: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  hours: string;
  deliveryTime: string;
  dispatchMode: string;
  coverageHubs: string[];
  metaTitle: string;
  metaDescription: string;
  defaultHeroImage: string;
  projects: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export const CANONICAL_LOCATIONS: LocationSectionData[] = [
  {
    slug: "delhi",
    canonicalSlug: "restroom-cubicle-manufacturer-delhi",
    city: "Delhi NCR",
    stateName: "National Capital Region",
    region: "North India · Corporate Headquarters",
    cluster: "ncr",
    targetKeyword: "Restroom Cubicle Manufacturer in Delhi",
    h1: "Restroom Cubicle Manufacturer in Delhi",
    tagline: "Commercial Restroom Cubicles & Toilet Partitions in Delhi NCR",
    description: "Pacific Products & Solutions is a premier manufacturer and supplier of commercial restroom cubicles, urinal partition screens, and modular HPL lockers in Delhi NCR with in-house CNC machining in Okhla Phase-II.",
    address: "Okhla Industrial Estate Phase-II, New Delhi - 110020, Delhi, India",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "Same-day inspection; 24-48h fabrication & dispatch",
    dispatchMode: "Direct plant dispatch from Okhla Industrial Area",
    coverageHubs: ["Connaught Place", "Aerocity & IGI Airport", "Okhla Industrial Phase I-III", "Saket District Centre", "Nehru Place", "Rohini Commercial Hub"],
    metaTitle: "Restroom Cubicle Manufacturer in Delhi | Toilet Partitions Delhi NCR",
    metaDescription: "Leading restroom cubicle manufacturer in Delhi NCR. 12mm & 18mm compact laminate cubicles, nylon & SS304 hardware, 10-year moisture warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1600&q=80",
    projects: ["Airport T3 Commercial Transit Restrooms", "Central Government Secretariat Campus", "Okhla Phase-II Corporate Towers"],
    faqs: [
      { question: "Where is Pacific Products manufacturing facility located?", answer: "Our centralized fabrication and CNC processing facility is located in Okhla Industrial Estate Phase-II, New Delhi." },
      { question: "What is the delivery time across Delhi NCR?", answer: "We provide same-day architectural site inspection and 24 to 48 hours dispatch for standard cubicle dimensions." }
    ]
  },
  {
    slug: "gurugram",
    canonicalSlug: "restroom-cubicle-manufacturer-gurugram",
    city: "Gurugram",
    stateName: "Haryana",
    region: "Delhi NCR · Millennium City Tech Corridor",
    cluster: "ncr",
    targetKeyword: "Restroom Cubicle Manufacturer in Gurugram",
    h1: "Restroom Cubicle Manufacturer in Gurugram",
    tagline: "Architectural Restroom Partitions & Phenolic Cubicles in Gurugram",
    description: "Engineered compact laminate cubicles, urinal dividers, and smart locker systems for Grade-A corporate towers, Cyber City IT SEZs, and golf course extensions.",
    address: "Serving Cyber City, Golf Course Road, Udyog Vihar & Manesar from Delhi NCR Central Facility",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "Same-day site audit; 24-48h express delivery",
    dispatchMode: "Express corridor transit via NH-48 & Mehrauli-Gurgaon Road",
    coverageHubs: ["DLF Cyber City", "Golf Course Road Corporate Towers", "Cyber Hub", "Udyog Vihar Phases I-V", "Sohna Road Commercial Belt", "Manesar Industrial Township"],
    metaTitle: "Restroom Cubicle Manufacturer in Gurugram | Toilet Partitions Cyber City",
    metaDescription: "Premium restroom cubicles in Gurugram. Heavy-traffic toilet partitions for Cyber City IT parks, Grade-A offices, and commercial malls.",
    defaultHeroImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80",
    projects: ["Cyber City Multi-Tenant IT SEZ", "Golf Course Road Headquarters", "Udyog Vihar Tech Park"],
    faqs: [
      { question: "Can Pacific execute fast installations in Gurugram commercial towers?", answer: "Yes, our certified installation crews regularly complete weekend and overnight fit-outs across DLF Cyber City and Golf Course Road without office disruption." }
    ]
  },
  {
    slug: "noida",
    canonicalSlug: "restroom-cubicle-manufacturer-noida",
    city: "Noida",
    stateName: "Uttar Pradesh",
    region: "Delhi NCR · Commercial & Institutional Corridor",
    cluster: "ncr",
    targetKeyword: "Restroom Cubicle Manufacturer in Noida",
    h1: "Restroom Cubicle Manufacturer in Noida",
    tagline: "Commercial Restroom Partitions & Compact Cubicles in Noida",
    description: "Pacific Products & Solutions designs, manufactures, and installs durable, water-resistant HPL restroom cubicles, urinal screens, and athletic locker systems for commercial towers, tech parks, and institutions across Noida and Noida Expressway.",
    address: "Serving Sector 62, Noida Expressway, Sector 18 & Phase II from our Delhi NCR Hub",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "Daily site connectivity; 24-48h delivery",
    dispatchMode: "Direct dispatch from Delhi central plant via DND Flyway & Kalindi Kunj",
    coverageHubs: ["Sector 62 IT Hub", "Sector 18 Commercial Center", "Noida Expressway IT SEZs", "Phase II Industrial Area", "Sector 135 Corporate Park"],
    metaTitle: "Restroom Cubicle Manufacturer in Noida | Toilet Partitions Noida Expressway",
    metaDescription: "Top toilet cubicle manufacturer in Noida. Heavy-duty 12mm & 18mm HPL cubicles, anti-bacterial partitions for Sector 62, Expressway SEZs, and malls.",
    defaultHeroImage: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1600&q=80",
    projects: ["Sector 62 Software Tech Park", "Noida Expressway Institutional Campus", "Sector 18 Commercial Mall"],
    faqs: [
      { question: "How quickly can Pacific inspect sites in Noida?", answer: "We provide same-day on-site BOQ audit across Sector 62, Sector 18, and Noida Expressway." }
    ]
  },
  {
    slug: "greater-noida",
    canonicalSlug: "restroom-cubicle-manufacturer-greater-noida",
    city: "Greater Noida",
    stateName: "Uttar Pradesh",
    region: "Delhi NCR · Educational & Industrial Zone",
    cluster: "ncr",
    targetKeyword: "Restroom Cubicle Manufacturer in Greater Noida",
    h1: "Restroom Cubicle Manufacturer in Greater Noida",
    tagline: "Institutional Toilet Cubicles & Industrial Lockers in Greater Noida",
    description: "Heavy-traffic toilet partitions, school cubicles, and moisture-proof phenolic lockers engineered for Knowledge Park universities, data center corridors, and industrial manufacturers.",
    address: "Serving Knowledge Park, Pari Chowk, Ecotech Industrial Hub & Yamuna Expressway",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "24-48h fabrication & express transport",
    dispatchMode: "Dedicated fleet dispatch via Noida-Greater Noida Expressway",
    coverageHubs: ["Knowledge Park I-IV Universities", "Ecotech Industrial Zones", "Surajpur Industrial Area", "Pari Chowk Institutional Corridor", "Data Center Parks"],
    metaTitle: "Restroom Cubicle Manufacturer in Greater Noida | Institutional Partitions",
    metaDescription: "Commercial washroom partitions & student lockers in Greater Noida. Conforms to IS:2046 and EN 438-4 specs with 10-year board warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1545127398-14699f92334b?w=1600&q=80",
    projects: ["Knowledge Park University Engineering Block", "Ecotech Data Center Campus"],
    faqs: [
      { question: "Are your cubicles child-safe for educational institutions in Greater Noida?", answer: "Yes, our kids and educational cubicle lines feature rounded chamfered corners, emergency coin-release indicator locks, and anti-finger pinch safety hinge clearance." }
    ]
  },
  {
    slug: "ghaziabad",
    canonicalSlug: "restroom-cubicle-manufacturer-ghaziabad",
    city: "Ghaziabad",
    stateName: "Uttar Pradesh",
    region: "Delhi NCR · Industrial & Commercial Hub",
    cluster: "ncr",
    targetKeyword: "Restroom Cubicle Manufacturer in Ghaziabad",
    h1: "Restroom Cubicle Manufacturer in Ghaziabad",
    tagline: "Factory Restroom Cubicles & Heavy-Duty Partitions in Ghaziabad",
    description: "Rugged 12mm & 18mm compact laminate partitions with Class 1 fire retardant ratings and Grade 304/316 SS hardware for industrial manufacturing plants, malls, and commercial complexes.",
    address: "Serving Sahibabad Industrial Area, Loni, Kavi Nagar & Raj Nagar Extension",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "Same-day inspection; 24-48h express delivery",
    dispatchMode: "Direct dispatch via Delhi-Meerut Expressway & Anand Vihar corridor",
    coverageHubs: ["Sahibabad Industrial Area", "Bulandshahr Road Industrial Area", "Loni Industrial Corridor", "Raj Nagar Extension Commercial Malls", "Kavi Nagar"],
    metaTitle: "Restroom Cubicle Manufacturer in Ghaziabad | Industrial Washroom Partitions",
    metaDescription: "Factory and commercial toilet partitions in Ghaziabad. Anti-vandal, moisture-proof, zero swelling cubicles with pan-India warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
    projects: ["Sahibabad Manufacturing Unit Washroom Refurbishment", "Raj Nagar Extension Commercial Complex"],
    faqs: [
      { question: "Do you supply heavy-duty hardware for factory worker washrooms?", answer: "Yes, we specify Grade 304 and 316 stainless steel gravity hinges and nylon polyamide hardware built for hundreds of cycles daily." }
    ]
  },
  {
    slug: "faridabad",
    canonicalSlug: "restroom-cubicle-manufacturer-faridabad",
    city: "Faridabad",
    stateName: "Haryana",
    region: "Delhi NCR · Industrial & Commercial Belt",
    cluster: "ncr",
    targetKeyword: "Restroom Cubicle Manufacturer in Faridabad",
    h1: "Restroom Cubicle Manufacturer in Faridabad",
    tagline: "Industrial Restroom Partitions & HPL Cubicles in Faridabad",
    description: "Manufacturing durable, acid-resistant, and high-impact compact laminate cubicles and employee locker units for engineering facilities, commercial towers, and transit centers.",
    address: "Serving Sector 15, Sector 24, Mathura Road Corridor & Ballabhgarh Industrial Hub",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "Same-day site audit; 24-48h direct delivery",
    dispatchMode: "Express truck transit via Badarpur Border & Delhi-Agra Expressway",
    coverageHubs: ["Mathura Road Industrial Corridor", "Sector 24 & 25 Industrial Areas", "Ballabhgarh Industrial Hub", "Sector 15 Commercial Hub", "Bata Flyway Corridor"],
    metaTitle: "Restroom Cubicle Manufacturer in Faridabad | Toilet Partitions & Lockers",
    metaDescription: "Heavy-duty commercial toilet cubicles and phenolic lockers in Faridabad. Same-day site survey from Delhi manufacturing plant.",
    defaultHeroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
    projects: ["Mathura Road Engineering Factory Washrooms", "Faridabad Healthcare Facility"],
    faqs: [
      { question: "Can Pacific replace old masonry brick partition stalls with compact cubicles?", answer: "Yes, our lightweight cubicles eliminate wet masonry, save up to 15% floor area, and install in hours." }
    ]
  },
  {
    slug: "mumbai",
    canonicalSlug: "restroom-cubicle-manufacturer-mumbai",
    city: "Mumbai",
    stateName: "Maharashtra",
    region: "Western Region · Financial Capital & Coastal Commercial Hub",
    cluster: "west",
    targetKeyword: "Restroom Cubicle Manufacturer in Mumbai",
    h1: "Restroom Cubicle Manufacturer in Mumbai",
    tagline: "Coastal Moisture-Proof Restroom Cubicles & Lockers in Mumbai",
    description: "Engineered specifically for coastal marine humidity, our 100% waterproof phenolic compact cubicles feature Grade 316 stainless steel marine hardware that will never corrode or swell.",
    address: "Serving BKC, Lower Parel, Andheri MIDC, Navi Mumbai & Thane with certified installation teams",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "3 to 4 business days direct dispatch from Delhi facility",
    dispatchMode: "Multi-modal express freight via Western Dedicated Corridor",
    coverageHubs: ["Bandra Kurla Complex (BKC)", "Lower Parel Commercial Hub", "Andheri MIDC & SEEPZ", "Navi Mumbai Tech Corridor", "Thane West Industrial Area", "Nariman Point"],
    metaTitle: "Restroom Cubicle Manufacturer in Mumbai | BKC & Navi Mumbai Partitions",
    metaDescription: "Waterproof toilet cubicles and lockers in Mumbai. Grade 316 marine SS hardware resisting coastal corrosion. 10-year warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&q=80",
    projects: ["BKC Financial Tower Corporate Restrooms", "Navi Mumbai IT Park", "Lower Parel Luxury Office Complex"],
    faqs: [
      { question: "How do your cubicles resist Mumbai coastal saline humidity?", answer: "Our boards have zero water absorption (<= 0.5% after 24h immersion) and our Grade 316 SS hardware has been tested against saline corrosion for 500+ hours." }
    ]
  },
  {
    slug: "pune",
    canonicalSlug: "restroom-cubicle-manufacturer-pune",
    city: "Pune",
    stateName: "Maharashtra",
    region: "Western Region · Automotive & IT Capital",
    cluster: "west",
    targetKeyword: "Restroom Cubicle Manufacturer in Pune",
    h1: "Restroom Cubicle Manufacturer in Pune",
    tagline: "High-Traffic Restroom Partitions & Lockers in Pune",
    description: "Supplying Hinjewadi Phase I-III, Magarpatta Cybercity, Kharadi, and Chakan automobile manufacturing plants with modular cubicles and staff lockers.",
    address: "Serving Hinjewadi, Magarpatta, Kharadi, Chakan & Talwade",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "3 to 4 business days direct factory delivery",
    dispatchMode: "Dedicated road container transport via Mumbai-Pune Expressway link",
    coverageHubs: ["Hinjewadi Rajiv Gandhi Infotech Park", "Magarpatta Cybercity", "Kharadi EON Free Zone", "Chakan Industrial Area", "Bhosari MIDC"],
    metaTitle: "Restroom Cubicle Manufacturer in Pune | Hinjewadi IT & Chakan Partitions",
    metaDescription: "Leading supplier of restroom cubicles, urinal screens, and gym lockers in Pune. Fast BOQ quotes and certified installation crews.",
    defaultHeroImage: "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=1600&q=80",
    projects: ["Hinjewadi Tech Campus Phase-II", "Chakan Auto Assembly Plant"],
    faqs: [
      { question: "Do you have certified installation teams in Pune?", answer: "Yes, our certified factory technicians handle complete layout verification, unboxing, leveling, and turnkey installation across Pune." }
    ]
  },
  {
    slug: "ahmedabad",
    canonicalSlug: "restroom-cubicle-manufacturer-ahmedabad",
    city: "Ahmedabad",
    stateName: "Gujarat",
    region: "Western Region · Commercial & Financial Zone",
    cluster: "west",
    targetKeyword: "Restroom Cubicle Manufacturer in Ahmedabad",
    h1: "Restroom Cubicle Manufacturer in Ahmedabad",
    tagline: "Commercial Toilet Partitions & HPL Cubicles in Ahmedabad",
    description: "Serving SG Highway corporate corridors, GIFT City financial zone, Sanand industrial hub, and Prahladnagar with precision-machined cubicle systems.",
    address: "Serving SG Highway, GIFT City, Sanand & Changodar from Delhi Central Plant",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "3 business days express delivery",
    dispatchMode: "Direct highway transport via Western Freight Corridor (NH 48)",
    coverageHubs: ["SG Highway Commercial Towers", "GIFT City Financial Zone", "Sanand Automobile Belt", "Prahlad Nagar Corporate Road", "Changodar Industrial Area"],
    metaTitle: "Restroom Cubicle Manufacturer in Ahmedabad | GIFT City & SG Highway",
    metaDescription: "Pacific supplies durable, water-resistant compact laminate cubicles to GIFT City and Ahmedabad. Conforms to IS:2046 and EN 438-4.",
    defaultHeroImage: "https://images.unsplash.com/photo-1600573472556-e636c2acda9e?w=1600&q=80",
    projects: ["GIFT City Multi-Story Financial Hub", "SG Highway Corporate Park"],
    faqs: [
      { question: "Do you deliver to GIFT City SEZ zones?", answer: "Yes, we handle SEZ documentation, LUT billing, and zero-GST dispatch for eligible units in GIFT City." }
    ]
  },
  {
    slug: "bengaluru",
    canonicalSlug: "restroom-cubicle-manufacturer-bengaluru",
    city: "Bengaluru",
    stateName: "Karnataka",
    region: "Southern Region · Silicon Valley of India",
    cluster: "south",
    targetKeyword: "Restroom Cubicle Manufacturer in Bengaluru",
    h1: "Restroom Cubicle Manufacturer in Bengaluru",
    tagline: "Architectural Restroom Partitions & Smart Lockers in Bengaluru",
    description: "Preferred partner for multinational IT campuses, tech parks, and commercial towers across Whitefield, Electronic City, Manyata, and Outer Ring Road.",
    address: "Serving Whitefield, Electronic City, ORR, Manyata & Peenya with pan-India certified crews",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "4 business days express shipment from Delhi plant",
    dispatchMode: "Dedicated high-speed container freight transit via NH 44",
    coverageHubs: ["Outer Ring Road (ORR) Bellandur-Marathahalli", "Whitefield IT Corridors (ITPL)", "Electronic City Phase I & II", "Manyata Embassy Business Park", "Bagmane Tech Park", "Peenya Industrial Area"],
    metaTitle: "Restroom Cubicle Manufacturer in Bengaluru | Toilet Partitions Whitefield & ORR",
    metaDescription: "Manufacturer of 12mm & 18mm phenolic restroom cubicles in Bengaluru. Serving tech campuses with certified hardware & 10-year warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1600&q=80",
    projects: ["ORR Multinational IT Campus Washrooms", "Whitefield Tech Park Block 4", "Manyata Tech Park Tower"],
    faqs: [
      { question: "Can you match corporate brand colors for Bengaluru tech campuses?", answer: "Yes, we offer over 35 solid colors, wood grains, and metallic finishes with matching powder-coated or PVD hardware." }
    ]
  },
  {
    slug: "hyderabad",
    canonicalSlug: "restroom-cubicle-manufacturer-hyderabad",
    city: "Hyderabad",
    stateName: "Telangana",
    region: "Southern Region · Cyberabad & IT SEZ Hub",
    cluster: "south",
    targetKeyword: "Restroom Cubicle Manufacturer in Hyderabad",
    h1: "Restroom Cubicle Manufacturer in Hyderabad",
    tagline: "Phenolic Restroom Cubicles & Lockers in Hyderabad",
    description: "Turnkey cubicle installations for HITEC City, Gachibowli, Financial District Nanakramguda, Madhapur, and Shamshabad Aerotropolis.",
    address: "Serving HITEC City, Gachibowli, Financial District & Madhapur",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "3 to 4 business days direct dispatch",
    dispatchMode: "Express freight corridor transit via NH 44",
    coverageHubs: ["HITEC City IT SEZ", "Gachibowli Financial District", "Nanakramguda Tech Corridors", "Madhapur Commercial Belt", "Genome Valley Biotech Hub"],
    metaTitle: "Restroom Cubicle Manufacturer in Hyderabad | HITEC City & Gachibowli",
    metaDescription: "Supplying durable HPL restroom cubicles, urinal modesty screens, and smart locker systems to Hyderabad tech corridors.",
    defaultHeroImage: "https://images.unsplash.com/photo-1545127398-14699f92334b?w=1600&q=80",
    projects: ["Financial District IT Tower Restrooms", "HITEC City Software Park Block"],
    faqs: [
      { question: "What hardware finishes are available for Hyderabad offices?", answer: "We offer Matte Black, Brushed Satin SS304/SS316, and Golden PVD luxury hardware lines." }
    ]
  },
  {
    slug: "chennai",
    canonicalSlug: "restroom-cubicle-manufacturer-chennai",
    city: "Chennai",
    stateName: "Tamil Nadu",
    region: "Southern Region · Industrial, Coastal & IT Corridor",
    cluster: "south",
    targetKeyword: "Restroom Cubicle Manufacturer in Chennai",
    h1: "Restroom Cubicle Manufacturer in Chennai",
    tagline: "Corrosion-Proof Restroom Cubicles in Chennai",
    description: "High-humidity and coastal-resistant cubicle partitions engineered for OMR IT Expressway, Guindy Industrial Estate, Ambattur, and Sriperumbudur auto corridor.",
    address: "Serving OMR, Guindy, Ambattur, Sriperumbudur & T. Nagar",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "4 business days express road freight",
    dispatchMode: "Direct dispatch via Golden Quadrilateral East Coast corridor",
    coverageHubs: ["Old Mahabalipuram Road (OMR) IT Expressway", "Guindy Industrial Estate", "Ambattur Industrial Estate", "Sriperumbudur Auto Hub", "Mount Poonamallee High Road"],
    metaTitle: "Restroom Cubicle Manufacturer in Chennai | OMR & Sriperumbudur Partitions",
    metaDescription: "High-humidity resistant toilet cubicles in Chennai. Anti-bacterial compact laminate with 10-year board warranty and certified fitting crews.",
    defaultHeroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80",
    projects: ["OMR IT Expressway Headquarters", "Sriperumbudur Manufacturing Facility"],
    faqs: [
      { question: "How do your cubicles withstand Chennai's high humidity?", answer: "Our solid compact laminate boards are impervious to moisture and will never swell, rot, or delaminate even in constant steam." }
    ]
  },
  {
    slug: "kochi",
    canonicalSlug: "restroom-cubicle-manufacturer-kochi",
    city: "Kochi",
    stateName: "Kerala",
    region: "Southern Region · Coastal Tech & Maritime Hub",
    cluster: "south",
    targetKeyword: "Restroom Cubicle Manufacturer in Kochi",
    h1: "Restroom Cubicle Manufacturer in Kochi",
    tagline: "Waterproof Restroom Cubicles & Lockers in Kochi",
    description: "Serving Kakkanad Infopark, SmartCity Kochi, Marine Drive, and commercial healthcare facilities with 100% moisture-proof restroom cubicles.",
    address: "Serving Infopark, SmartCity, Marine Drive & Ernakulam",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "4 to 5 business days direct delivery",
    dispatchMode: "Dedicated road logistics via NH 544",
    coverageHubs: ["Kakkanad Infopark Phases I & II", "SmartCity Kochi", "Marine Drive Commercial Corridors", "Kalamassery Industrial Zone"],
    metaTitle: "Restroom Cubicle Manufacturer in Kochi | Infopark & SmartCity Partitions",
    metaDescription: "Commercial toilet cubicles and phenolic lockers in Kochi. Zero water absorption, fungal-resistant, 10-year board warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
    projects: ["Infopark Tech Park Corporate Washrooms", "Ernakulam Multi-Specialty Hospital"],
    faqs: [
      { question: "Are your cubicles fungus and mold resistant?", answer: "Yes, our solid phenolic boards are non-porous and naturally inhibit fungal and bacterial proliferation." }
    ]
  },
  {
    slug: "kolkata",
    canonicalSlug: "restroom-cubicle-manufacturer-kolkata",
    city: "Kolkata",
    stateName: "West Bengal",
    region: "Eastern Region · Commercial & Regional Headquarters",
    cluster: "east",
    targetKeyword: "Restroom Cubicle Manufacturer in Kolkata",
    h1: "Restroom Cubicle Manufacturer in Kolkata",
    tagline: "Heavy-Duty Restroom Partitions & Lockers in Kolkata",
    description: "Turnkey cubicle installations for Salt Lake Sector V, Rajarhat New Town IT Corridor, Park Street commercial hubs, and Howrah industrial corridors.",
    address: "Serving Salt Lake Sector V, Rajarhat New Town, Park Street & Howrah",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "3 to 4 business days direct shipment from Delhi plant",
    dispatchMode: "Express multi-modal transit via NH 19 (Grand Trunk Corridor)",
    coverageHubs: ["Salt Lake Sector V IT Hub", "Rajarhat New Town Financial Action Area", "Park Street & Camac Street", "Howrah Industrial Belt", "Taratala & Kasba"],
    metaTitle: "Restroom Cubicle Manufacturer in Kolkata | Salt Lake Sector V & New Town",
    metaDescription: "Leading restroom cubicle manufacturer in Kolkata. Durable 12mm/18mm HPL cubicles, anti-bacterial partitions, and gym lockers.",
    defaultHeroImage: "https://images.unsplash.com/photo-1558431382-27e303142255?w=1600&q=80",
    projects: ["Salt Lake Sector V IT Tower", "New Town Commercial Center"],
    faqs: [
      { question: "How are cubicles safely shipped to Kolkata?", answer: "Each panel is CNC edged, protective-filmed, and wooden-crate packed to eliminate transit edge scratches." }
    ]
  },
  {
    slug: "bhubaneswar",
    canonicalSlug: "restroom-cubicle-manufacturer-bhubaneswar",
    city: "Bhubaneswar",
    stateName: "Odisha",
    region: "Eastern Region · Smart City & IT Hub",
    cluster: "east",
    targetKeyword: "Restroom Cubicle Manufacturer in Bhubaneswar",
    h1: "Restroom Cubicle Manufacturer in Bhubaneswar",
    tagline: "Commercial Restroom Partitions & Lockers in Bhubaneswar",
    description: "Supplying Infocity IT SEZ, Chandrasekharpur, Patia educational campuses, and medical institutes with modern phenolic partitions.",
    address: "Serving Infocity, Chandrasekharpur, Patia & Rasulgarh",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "3 to 4 business days direct transit",
    dispatchMode: "Express freight via NH 16",
    coverageHubs: ["Infocity IT SEZ", "Chandrasekharpur Commercial Area", "Patia Institutional Corridor", "Mancheswar Industrial Estate"],
    metaTitle: "Restroom Cubicle Manufacturer in Bhubaneswar | Infocity Partitions",
    metaDescription: "Toilet cubicle manufacturer in Bhubaneswar. Moisture-proof, hygienic compact laminate cubicles with pan-India warranty.",
    defaultHeroImage: "https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=1600&q=80",
    projects: ["Infocity Software Park", "Patia University Campus"],
    faqs: [
      { question: "Can you provide custom cubicle heights for universities in Bhubaneswar?", answer: "Yes, our CNC plant can cut custom stiles, dividers, and doors to exact floor-to-ceiling or suspended architectural elevations." }
    ]
  },
  {
    slug: "guwahati",
    canonicalSlug: "restroom-cubicle-manufacturer-guwahati",
    city: "Guwahati",
    stateName: "Assam",
    region: "Northeast Region · Commercial Gateway",
    cluster: "east",
    targetKeyword: "Restroom Cubicle Manufacturer in Guwahati",
    h1: "Restroom Cubicle Manufacturer in Guwahati",
    tagline: "High-Durability Restroom Partitions in Guwahati",
    description: "Supplying Northeast India's gateway with commercial restroom cubicles for GS Road commercial complexes, Dispur government offices, and airport facilities.",
    address: "Serving GS Road, Dispur, Jalukbari & Paltan Bazaar",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM",
    deliveryTime: "4 to 5 business days direct transit",
    dispatchMode: "Protected crate road transit via NH 27 East-West Corridor",
    coverageHubs: ["GS Road Commercial Hub", "Dispur Capital Complex", "Lokpriya Gopinath Bordoloi Airport Corridor", "Jalukbari Institutional Belt"],
    metaTitle: "Restroom Cubicle Manufacturer in Guwahati | Northeast India Partitions",
    metaDescription: "Commercial washroom partition supplier for Guwahati and Northeast India. High-impact moisture-resistant compact laminate cubicles.",
    defaultHeroImage: "https://images.unsplash.com/photo-1600573472556-e636c2acda9e?w=1600&q=80",
    projects: ["GS Road Commercial Mall", "Guwahati Airport Transit Facility"],
    faqs: [
      { question: "Does Pacific send installation crews to Guwahati?", answer: "Yes, our certified technicians travel to Guwahati for complete site measurements, assembly, and turnkey handover." }
    ]
  },
  {
    slug: "uae",
    canonicalSlug: "locations/uae",
    city: "Dubai, UAE",
    stateName: "United Arab Emirates",
    region: "Middle East · GCC Export & Commercial Hub",
    cluster: "international",
    targetKeyword: "Restroom Cubicle Manufacturer Dubai UAE",
    h1: "Restroom Cubicle Manufacturer in Dubai UAE",
    tagline: "Commercial HPL Restroom Partitions & Lockers for GCC Projects",
    description: "Exporting premium 12mm & 18mm solid compact laminate cubicles with Grade 316 SS and luxury PVD hardware for commercial towers, hotels, and malls in Dubai, Abu Dhabi, and GCC.",
    address: "Business Bay, Downtown Dubai & Jebel Ali Free Zone (Export Hub)",
    phone: "+91 98185 92113",
    email: "info@pacificproduct.in",
    whatsapp: "919217016908",
    hours: "Mon–Sat: 9:00 AM – 7:00 PM (GST Compatible)",
    deliveryTime: "7 to 10 days ocean container / 3 days air express",
    dispatchMode: "Export sea container via Nhava Sheva to Jebel Ali Port, Dubai",
    coverageHubs: ["Business Bay", "DIFC", "Dubai Marina", "Jebel Ali (JAFZA)", "Abu Dhabi Commercial District"],
    metaTitle: "Restroom Cubicle Manufacturer Dubai UAE | GCC HPL Toilet Partitions",
    metaDescription: "Export-grade commercial restroom cubicles and lockers for Dubai & UAE. Grade 316 SS hardware, Class 1 fire rating, international wooden crate packing.",
    defaultHeroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
    projects: ["Business Bay Commercial Complex", "Dubai Logistics Hub Staff Facilities"],
    faqs: [
      { question: "Do you ship container loads to Jebel Ali Port?", answer: "Yes, we handle complete export documentation, Phytosanitary certificates, Certificates of Origin, and container packing for Dubai and GCC ports." }
    ]
  }
];

// ── Database Sync & Media Helpers ──────────────────────────────────────────

export async function fetchAllLocationsMedia(): Promise<Record<string, { hero?: GalleryImage; galleryCount: number }>> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .not("location_slug", "is", null);

  if (error) {
    console.error("[locationService] Error fetching location images:", error);
    return {};
  }

  const result: Record<string, { hero?: GalleryImage; galleryCount: number }> = {};
  (data || []).forEach((img: GalleryImage) => {
    if (!img.location_slug) return;
    if (!result[img.location_slug]) {
      result[img.location_slug] = { galleryCount: 0 };
    }
    if (img.placement === "hero" && !result[img.location_slug].hero) {
      result[img.location_slug].hero = img;
    } else {
      result[img.location_slug].galleryCount++;
    }
  });

  return result;
}

export async function fetchLocationMedia(locationSlug: string): Promise<{ heroImages: GalleryImage[]; galleryImages: GalleryImage[] }> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("location_slug", locationSlug)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(`[locationService] Error fetching media for ${locationSlug}:`, error);
    return { heroImages: [], galleryImages: [] };
  }

  const heroImages = (data || []).filter((img: GalleryImage) => img.placement === "hero");
  const galleryImages = (data || []).filter((img: GalleryImage) => img.placement !== "hero");

  return { heroImages, galleryImages };
}

export async function uploadLocationHeroBanner(
  locationSlug: string,
  file: File,
  altText: string,
  title?: string
): Promise<GalleryImage> {
  const folder = `locations/${locationSlug}/hero`;
  const url = await uploadImage(file, folder);
  if (!url) {
    throw new Error("Failed to upload banner to Supabase Storage. Please check storage bucket permissions.");
  }

  const payload = {
    title: title || `${locationSlug} Hero Banner`,
    category: "restroom-cubicles",
    location_slug: locationSlug,
    placement: "hero" as const,
    image_url: url,
    alt_text: altText || `${locationSlug} commercial restroom cubicle banner`,
    sort_order: 0,
    published: true,
  };

  // Upsert into gallery_images
  const { data, error } = await supabase
    .from("gallery_images")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[locationService] Error saving hero banner:", error);
    throw error;
  }

  // Also update page_banners table for backward compatibility
  try {
    const pageSlug = `location-${locationSlug}`;
    await supabase.from("page_banners").upsert({
      page_slug: pageSlug,
      image_url: url,
      title: title || `${locationSlug} Restroom Cubicles`,
      subtitle: altText,
      alt_text: altText,
    } as any);
  } catch (e) {
    console.warn("[locationService] Optional page_banners sync warning:", e);
  }

  return data as GalleryImage;
}

export async function uploadLocationGalleryImage(
  locationSlug: string,
  file: File,
  altText: string,
  title?: string
): Promise<GalleryImage> {
  const folder = `locations/${locationSlug}/gallery`;
  const url = await uploadImage(file, folder);
  if (!url) {
    throw new Error("Failed to upload gallery image.");
  }

  const payload = {
    title: title || `${locationSlug} Project Installation`,
    category: "restroom-cubicles",
    location_slug: locationSlug,
    placement: "gallery" as const,
    image_url: url,
    alt_text: altText || `${locationSlug} cubicle project reference`,
    sort_order: 1,
    published: true,
  };

  const { data, error } = await supabase
    .from("gallery_images")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[locationService] Error saving gallery image:", error);
    throw error;
  }

  return data as GalleryImage;
}

export async function deleteLocationImage(imageId: string): Promise<void> {
  const { error } = await supabase.from("gallery_images").delete().eq("id", imageId);
  if (error) {
    console.error("[locationService] Error deleting image:", error);
    throw error;
  }
}
