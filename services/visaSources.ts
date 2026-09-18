export interface VisaSource {
  title: string;
  url: string;
  kind: 'official' | 'application';
}

export const VISA_SOURCES: Record<string, VisaSource[]> = {
  TH: [
    { title: 'Royal Thai Embassy — Visa', url: 'https://newdelhi.thaiembassy.org/en/page/visa', kind: 'official' },
    { title: 'Thailand e-Visa — Official portal', url: 'https://thaievisa.go.th/', kind: 'application' },
  ],
  JP: [
    { title: 'Japan Ministry of Foreign Affairs — Visa', url: 'https://www.mofa.go.jp/j_info/visit/visa/', kind: 'official' },
    { title: 'Japan eVISA — Ministry of Foreign Affairs', url: 'https://www.mofa.go.jp/j_info/visit/visa/visaonline.html', kind: 'application' },
  ],
  VN: [
    { title: 'Vietnam Immigration Department — e-Visa', url: 'https://evisa.immigration.gov.vn/', kind: 'official' },
    { title: 'Vietnam e-Visa portal', url: 'https://evisa.gov.vn/', kind: 'application' },
  ],
  LK: [
    { title: 'Sri Lanka Immigration — ETA', url: 'https://eta.gov.lk/slvisa/', kind: 'official' },
    { title: 'Sri Lanka ETA application', url: 'https://eta.gov.lk/etaslvisa/etaNavServ', kind: 'application' },
  ],
  MY: [
    { title: 'Malaysia Immigration — Visa requirements by country', url: 'https://www.imi.gov.my/index.php/en/main-services/visa/visa-requirement-by-country/', kind: 'official' },
    { title: 'Malaysia eVISA / visa information', url: 'https://malaysiavisa.imi.gov.my/faq/', kind: 'application' },
  ],
  SG: [
    { title: 'Singapore ICA — Check if you need a visa', url: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements', kind: 'official' },
    { title: 'Singapore MFA — Visa information', url: 'https://www.mfa.gov.sg/visiting-singapore/check-if-you-need-a-singapore-visa/', kind: 'official' },
  ],
  AE: [
    { title: 'UAE Government — Visa information', url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/do-you-need-an-entry-permit-or-a-visa-to-enter-the-uae', kind: 'official' },
    { title: 'UAE Government — Where to apply', url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/Apply-and-track-visa/where-to-apply-for-entry-permits-or-visas', kind: 'application' },
  ],
  IN: [
    { title: 'Government of India — India Visa Online', url: 'https://indianvisaonline.gov.in/', kind: 'official' },
    { title: 'Government of India — e-Visa', url: 'https://indianvisaonline.gov.in/evisa/', kind: 'application' },
  ],
};

export const getVisaSources = (destinationCode: string): VisaSource[] =>
  VISA_SOURCES[destinationCode] ?? [];
