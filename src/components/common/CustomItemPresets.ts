export interface CustomItemPreset {
  id: string;
  label: string;
  title: string;
  description: string;
  hsnSac: string;
  unit: string;
  category: 'CUBICLE' | 'VANITY' | 'SHOWER' | 'HARDWARE' | 'SERVICE' | 'GLASS' | 'GENERAL';
  boardType?: string;
  boardThickness?: string;
  cubicleSize?: string;
  doorSize?: string;
  overallHeight?: string;
  hardwarePackage?: string;
}

export const CUSTOM_ITEM_PRESETS: CustomItemPreset[] = [
  {
    id: 'vanity-counter',
    label: 'Vanity Counter',
    title: 'Designer Restroom Vanity Counter',
    description: '12mm High Pressure Compact Laminate (HPL) fabricated vanity counter with polished edges, basin cutouts, and heavy-duty MS powder-coated concealed support brackets.',
    hsnSac: '9403',
    unit: 'RMT',
    category: 'VANITY',
    boardType: 'HPL',
    boardThickness: '12mm',
    cubicleSize: '1800mm W × 600mm D',
  },
  {
    id: 'shower-partition',
    label: 'Shower Partition',
    title: 'Compact Laminate Shower Cubicle Partition',
    description: '12mm water-resistant high pressure compact laminate shower partition system with Grade 304 SS hardware fittings and wall fixing channels.',
    hsnSac: '9403',
    unit: 'NOS',
    category: 'SHOWER',
    boardType: 'HPL',
    boardThickness: '12mm',
    cubicleSize: '1000mm W × 1200mm D',
    doorSize: '600mm × 1785mm',
    overallHeight: '1980mm (incl. 100mm ground clearance)',
    hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
  },
  {
    id: 'grab-bar',
    label: 'SS Grab Bar / Rail',
    title: 'Grade 304 SS Accessible Restroom Grab Bar',
    description: 'Grade 304 Stainless Steel (Satin Finish / Nylon Coated) heavy-duty safety grab bar with concealed flange wall fixing anchors for barrier-free accessible restrooms.',
    hsnSac: '8302',
    unit: 'SET',
    category: 'HARDWARE',
    hardwarePackage: 'SS 304 Stainless Steel (Satin Finish)',
  },
  {
    id: 'glass-partition',
    label: 'Glass Partition',
    title: '12mm Toughened Glass Restroom Partition System',
    description: '12mm clear / frosted toughened architectural glass restroom cubicle partition system with Grade 304 SS patch fittings, top headrail, and privacy indicator lock.',
    hsnSac: '7007',
    unit: 'NOS',
    category: 'GLASS',
    cubicleSize: '1000mm W × 1500mm D',
    overallHeight: '2000mm',
    hardwarePackage: 'SS 304 Architectural Patch Fittings',
  },
  {
    id: 'site-installation',
    label: 'Site Work & Erection',
    title: 'On-Site Erection, Core Cutting & Installation Work',
    description: 'Comprehensive on-site civil alignment, precision drilling, core cutting, erection, and installation of restroom partition systems by trained Pacific factory technicians.',
    hsnSac: '995469',
    unit: 'JOB',
    category: 'SERVICE',
  },
  {
    id: 'custom-partition',
    label: 'Custom Cubicle Model',
    title: 'Pacific Custom Design Restroom Cubicle System',
    description: 'Custom-designed restroom cubicle partition system manufactured to bespoke architectural layout, dimensions, hardware, and finish specifications.',
    hsnSac: '9403',
    unit: 'NOS',
    category: 'CUBICLE',
    boardType: 'HPL',
    boardThickness: '12mm',
    cubicleSize: '1000mm W × 1500mm D',
    doorSize: '600mm × 1785mm',
    overallHeight: '1980mm (incl. 100mm ground clearance)',
    hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
  },
];
