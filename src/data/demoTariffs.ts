import type { TariffConfig } from '../types'

/**
 * SIMULATED tariff data for the demo only. These rates are not current MSRTC
 * fares. Replace this object through Settings → Tariff before using anywhere
 * near real money.
 */
export const DEMO_TARIFF: TariffConfig = {
  effectiveFrom: '2026-04-01',
  currency: 'INR',
  childFactor: 0.5,
  note: 'SIMULATED demo tariff — not an official MSRTC fare schedule.',
  services: [
    { id: 'ordinary', nameEn: 'Ordinary (Lalpari)', nameMr: 'साधारण (लालपरी)', short: 'ORD', ratePerKmPaise: 105, basePaise: 500, minPaise: 1000, rounding: 'rupee', enabled: true },
    { id: 'express', nameEn: 'Express', nameMr: 'एक्सप्रेस', short: 'EXP', ratePerKmPaise: 130, basePaise: 800, minPaise: 1500, rounding: 'rupee', enabled: true },
    { id: 'semiluxury', nameEn: 'Semi-Luxury (Asiad)', nameMr: 'अर्ध-लक्झरी (आशियाड)', short: 'SLX', ratePerKmPaise: 155, basePaise: 1000, minPaise: 2000, rounding: 'rupee', enabled: true },
    { id: 'shivshahi', nameEn: 'Shivshahi', nameMr: 'शिवशाही', short: 'SHV', ratePerKmPaise: 190, basePaise: 1500, minPaise: 3000, rounding: 'rupee', enabled: true },
    { id: 'shivai', nameEn: 'Shivai (electric)', nameMr: 'शिवाई (विद्युत)', short: 'ELE', ratePerKmPaise: 120, basePaise: 700, minPaise: 1200, rounding: 'rupee', enabled: true },
    { id: 'shivneri', nameEn: 'Shivneri', nameMr: 'शिवनेरी', short: 'SNR', ratePerKmPaise: 230, basePaise: 2000, minPaise: 4000, rounding: 'rupee', enabled: true },
  ],
  concessions: [
    { id: 'women', nameEn: 'Women passenger', nameMr: 'महिला प्रवासी', short: 'W', percent: 50, requiresDoc: false, enabled: true, demo: true },
    { id: 'senior', nameEn: 'Senior citizen (60+)', nameMr: 'ज्येष्ठ नागरिक (६०+)', short: 'S', percent: 50, requiresDoc: true, enabled: true, demo: true },
    { id: 'disability', nameEn: 'Disability concession', nameMr: 'अपंगत्व सवलत', short: 'D', percent: 75, requiresDoc: true, enabled: true, demo: true },
    { id: 'student', nameEn: 'Student (demo)', nameMr: 'विद्यार्थी (डेमो)', short: 'ST', percent: 25, requiresDoc: true, enabled: true, demo: true },
  ],
}
