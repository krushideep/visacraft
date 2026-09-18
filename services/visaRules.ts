export interface VisaRule {
  passport: string;
  destination: string;
  purpose: string;
  category: 'free' | 'voa' | 'evisa' | 'required';
  stay?: string;
  processing?: string;
  fee?: string;
  requirements: string[];
  sources: { title: string; url: string }[];
}

export const VISA_RULES: VisaRule[] = [
  {
    passport: 'IN', destination: 'JP', purpose: 'Tourist', category: 'required',
    stay: 'Short-term stay; confirm the permitted period on the issued visa.',
    processing: 'See the Embassy/Consulate serving your place of residence.',
    fee: 'See the current fee schedule published by the Japanese mission in India.',
    requirements: [
      'Visa application form and photograph according to the current Japanese mission requirements.',
      'Valid Indian passport and supporting identity documents.',
      'Travel itinerary and supporting documents for the planned stay.',
      'Financial evidence and other documents required for the applicant and trip.',
      'Additional documents may be requested during examination.'
    ],
    sources: [
      { title: 'Japan Ministry of Foreign Affairs — Visa', url: 'https://www.mofa.go.jp/j_info/visit/visa/' },
      { title: 'Embassy of Japan in India — Visa', url: 'https://www.in.emb-japan.go.jp/itpr_en/visa.html' },
      { title: 'Consulate-General of Japan in Bengaluru', url: 'https://www.bengaluru.in.emb-japan.go.jp/itprtop_en/index_00002.html' }
    ]
  },
  {
    passport: 'IN', destination: 'TH', purpose: 'Tourist', category: 'evisa',
    requirements: [
      'Confirm current Thai entry eligibility for Indian ordinary passport holders.',
      'Use the official Thai e-Visa route when an online application is required.',
      'Prepare passport, travel, accommodation and financial documents specified by the Thai authorities.',
      'Verify permitted stay, fees and processing time before submission.'
    ],
    sources: [
      { title: 'Royal Thai Embassy — Visa', url: 'https://newdelhi.thaiembassy.org/en/page/visa' },
      { title: 'Thailand e-Visa — Official portal', url: 'https://thaievisa.go.th/' }
    ]
  },
  {
    passport: 'IN', destination: 'VN', purpose: 'Tourist', category: 'evisa',
    requirements: [
      'Apply through the official Vietnam e-Visa system where applicable.',
      'Provide passport and application information exactly as shown in the passport.',
      'Verify validity, permitted stay, entry ports and processing information before travel.'
    ],
    sources: [
      { title: 'Vietnam Immigration — e-Visa', url: 'https://evisa.immigration.gov.vn/' },
      { title: 'Vietnam e-Visa portal', url: 'https://evisa.gov.vn/' }
    ]
  },
  {
    passport: 'IN', destination: 'LK', purpose: 'Tourist', category: 'evisa',
    requirements: [
      'Check the current Sri Lanka ETA requirement for Indian passport holders.',
      'Use the official ETA portal for an online authorization where required.',
      'Verify permitted stay, fees and entry conditions before departure.'
    ],
    sources: [
      { title: 'Sri Lanka Immigration — ETA', url: 'https://eta.gov.lk/slvisa/' },
      { title: 'Sri Lanka ETA application', url: 'https://eta.gov.lk/etaslvisa/etaNavServ' }
    ]
  }
];

export const findVisaRule = (passport: string, destination: string, purpose: string): VisaRule | undefined =>
  VISA_RULES.find(r => r.passport === passport && r.destination === destination && r.purpose === purpose)
  ?? VISA_RULES.find(r => r.passport === passport && r.destination === destination && r.purpose === 'Tourist');
