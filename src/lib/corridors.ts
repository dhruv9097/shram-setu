// Real Indian labour migration corridors.
// Sourced from Census 2011 D-series migration tables and the Economic Survey
// 2016-17 chapter on internal migration. Weights are relative corridor volume,
// not absolute worker counts.

export type Corridor = {
  id: string;
  fromState: string;
  fromDistricts: string[];
  toState: string;
  toDistricts: string[];
  sector: string;
  skills: string[];
  weight: number;
  /** month indices (0=Jan) when outbound movement peaks */
  peakMonths: number[];
  note: string;
};

export const CORRIDORS: Corridor[] = [
  {
    id: "od-gj-textile",
    fromState: "Odisha",
    fromDistricts: ["Ganjam", "Gajapati", "Kandhamal", "Kalahandi"],
    toState: "Gujarat",
    toDistricts: ["Surat"],
    sector: "textile",
    skills: ["powerloom operator", "dyeing helper", "embroidery worker"],
    weight: 9,
    peakMonths: [1, 2, 6, 7],
    note: "The Ganjam-Surat powerloom corridor. One of India's densest single-district migration streams.",
  },
  {
    id: "bh-pb-agri",
    fromState: "Bihar",
    fromDistricts: ["Gopalganj", "Siwan", "Madhubani", "Darbhanga", "Araria"],
    toState: "Punjab",
    toDistricts: ["Ludhiana", "Sangrur", "Jalandhar", "Amritsar"],
    sector: "agriculture",
    skills: ["farmhand", "harvester operator", "irrigation helper"],
    weight: 8,
    peakMonths: [3, 4, 9, 10],
    note: "Seasonal harvest labour for rabi and kharif. Sharply cyclical.",
  },
  {
    id: "up-dl-construction",
    fromState: "Uttar Pradesh",
    fromDistricts: ["Azamgarh", "Gorakhpur", "Jaunpur", "Deoria", "Basti", "Ballia"],
    toState: "Delhi",
    toDistricts: ["Delhi"],
    sector: "construction",
    skills: ["mason", "bar bender", "helper", "shuttering carpenter"],
    weight: 10,
    peakMonths: [9, 10, 11, 0],
    note: "Purvanchal to Delhi. The single largest construction labour stream in the country.",
  },
  {
    id: "bh-hr-construction",
    fromState: "Bihar",
    fromDistricts: ["Katihar", "Purnia", "Saharsa", "Gopalganj"],
    toState: "Haryana",
    toDistricts: ["Gurugram", "Faridabad", "Sonipat", "Panipat"],
    sector: "construction",
    skills: ["mason", "helper", "painter", "tile layer"],
    weight: 7,
    peakMonths: [9, 10, 11],
    note: "NCR construction and Panipat textile units.",
  },
  {
    id: "up-mh-construction",
    fromState: "Uttar Pradesh",
    fromDistricts: ["Sitapur", "Bahraich", "Gonda", "Azamgarh"],
    toState: "Maharashtra",
    toDistricts: ["Mumbai", "Thane", "Pune", "Nashik"],
    sector: "construction",
    skills: ["mason", "helper", "scaffolder"],
    weight: 8,
    peakMonths: [9, 10, 0],
    note: "Mumbai metropolitan construction and infrastructure.",
  },
  {
    id: "wb-kl-construction",
    fromState: "West Bengal",
    fromDistricts: ["Murshidabad", "Malda", "Purulia", "Bankura"],
    toState: "Kerala",
    toDistricts: ["Ernakulam", "Thrissur", "Kozhikode", "Palakkad"],
    sector: "construction",
    skills: ["mason", "helper", "plumber"],
    weight: 6,
    peakMonths: [10, 11, 0, 1],
    note: "Kerala's 'Bengali' migrant workforce. Longest-distance major corridor.",
  },
  {
    id: "as-kl-plantation",
    fromState: "Assam",
    fromDistricts: ["Dhubri", "Barpeta", "Nagaon", "Cachar"],
    toState: "Kerala",
    toDistricts: ["Ernakulam", "Palakkad", "Thrissur"],
    sector: "plantation",
    skills: ["plantation worker", "helper", "loader"],
    weight: 4,
    peakMonths: [10, 11, 0],
    note: "Assam to Kerala plantation and construction labour.",
  },
  {
    id: "rj-gj-construction",
    fromState: "Rajasthan",
    fromDistricts: ["Banswara", "Dungarpur", "Udaipur", "Pratapgarh"],
    toState: "Gujarat",
    toDistricts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    sector: "construction",
    skills: ["mason", "stone cutter", "helper"],
    weight: 7,
    peakMonths: [10, 11, 0, 1],
    note: "Tribal southern Rajasthan to Gujarat. Short-distance, high-frequency circular migration.",
  },
  {
    id: "jh-dl-services",
    fromState: "Jharkhand",
    fromDistricts: ["Giridih", "Dumka", "Palamu", "Godda"],
    toState: "Delhi",
    toDistricts: ["Delhi"],
    sector: "domestic",
    skills: ["domestic worker", "security guard", "helper"],
    weight: 5,
    peakMonths: [0, 1, 5, 6],
    note: "Includes a high share of women workers in domestic and care work.",
  },
  {
    id: "cg-up-brickkiln",
    fromState: "Chhattisgarh",
    fromDistricts: ["Bilaspur", "Raigarh", "Mahasamund", "Balodabazar"],
    toState: "Uttar Pradesh",
    toDistricts: ["Varanasi", "Prayagraj", "Kanpur Nagar"],
    sector: "brick kiln",
    skills: ["brick moulder", "kiln loader", "helper"],
    weight: 4,
    peakMonths: [10, 11, 0],
    note: "Brick kiln season runs post-monsoon to pre-monsoon. Whole families migrate together.",
  },
  {
    id: "mp-gj-construction",
    fromState: "Madhya Pradesh",
    fromDistricts: ["Chhatarpur", "Tikamgarh", "Rewa", "Satna"],
    toState: "Gujarat",
    toDistricts: ["Ahmedabad", "Surat"],
    sector: "construction",
    skills: ["mason", "helper", "loader"],
    weight: 5,
    peakMonths: [10, 11, 0],
    note: "Bundelkhand distress migration, strongly drought-linked.",
  },
  {
    id: "bh-tn-textile",
    fromState: "Bihar",
    fromDistricts: ["Madhubani", "Darbhanga", "Samastipur"],
    toState: "Tamil Nadu",
    toDistricts: ["Tiruppur", "Coimbatore", "Chennai"],
    sector: "textile",
    skills: ["knitting operator", "garment tailor", "helper"],
    weight: 4,
    peakMonths: [1, 2, 6],
    note: "Tiruppur knitwear cluster. Long-distance, increasingly formalised.",
  },
  {
    id: "up-ka-services",
    fromState: "Uttar Pradesh",
    fromDistricts: ["Gorakhpur", "Deoria", "Kushinagar"],
    toState: "Karnataka",
    toDistricts: ["Bengaluru Urban", "Bengaluru Rural"],
    sector: "services",
    skills: ["security guard", "delivery rider", "helper"],
    weight: 5,
    peakMonths: [1, 5, 6],
    note: "Growing gig and security-services stream into Bengaluru.",
  },
  {
    id: "od-tg-construction",
    fromState: "Odisha",
    fromDistricts: ["Balangir", "Nuapada", "Kalahandi", "Boudh"],
    toState: "Telangana",
    toDistricts: ["Hyderabad", "Ranga Reddy"],
    sector: "brick kiln",
    skills: ["brick moulder", "helper", "loader"],
    weight: 5,
    peakMonths: [10, 11, 0],
    note: "Western Odisha (KBK region) to Telangana brick kilns. Historically debt-bonded; a priority corridor for welfare monitoring.",
  },
];

export const ORIGIN_STATES = [...new Set(CORRIDORS.map((c) => c.fromState))];
export const DESTINATION_STATES = [...new Set(CORRIDORS.map((c) => c.toState))];
export const SECTORS = [...new Set(CORRIDORS.map((c) => c.sector))];
