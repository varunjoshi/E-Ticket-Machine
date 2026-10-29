import type { BusRoute } from '../types'

/**
 * Hand-built demo corridors. Distances are approximate road-distance samples
 * for testing the fare engine. Nothing here is an official MSRTC route,
 * timetable, stage list or fare table.
 */
const R = (id: string, nameEn: string, nameMr: string, stops: [string, number][], services: string[]): BusRoute => ({
  id,
  nameEn,
  nameMr,
  stops: stops.map(([stopId, km]) => ({ stopId, km })),
  services,
  source: 'Demo starter dataset (approximate sample distances)',
  verification: 'demo-estimate',
  effectiveFrom: '2026-04-01',
})

const ALL = ['ordinary', 'express', 'semiluxury', 'shivshahi']
const PLUS_SHIVAI = [...ALL, 'shivai']

export const DEMO_ROUTES: BusRoute[] = [
  R('R-MUM-PUN', 'Mumbai – Pune', 'मुंबई – पुणे', [
    ['mumbai-central', 0], ['dadar', 9], ['thane', 35], ['panvel', 58], ['lonavala', 120], ['pune-station', 175], ['swargate', 178],
  ], [...ALL, 'shivneri']),
  R('R-PUN-NAS', 'Pune – Nashik', 'पुणे – नाशिक', [
    ['pune-station', 0], ['shivajinagar', 4], ['sangamner', 168], ['nashik-road', 200], ['nashik-cbs', 208],
  ], PLUS_SHIVAI),
  R('R-NAS-SHI', 'Nashik – Shirdi', 'नाशिक – शिर्डी', [
    ['nashik-cbs', 0], ['nashik-road', 8], ['sangamner', 46], ['shirdi', 88],
  ], ALL),
  R('R-KOP-SHI', 'Kopargaon – Shirdi', 'कोपरगाव – शिर्डी', [['kopargaon', 0], ['shirdi', 18]], ALL),
  R('R-KOP-PUN', 'Kopargaon – Pune', 'कोपरगाव – पुणे', [
    ['kopargaon', 0], ['shirdi', 18], ['sangamner', 62], ['ahilyanagar', 128], ['pune-station', 235],
  ], PLUS_SHIVAI),
  R('R-MUM-NAS', 'Mumbai – Nashik', 'मुंबई – नाशिक', [
    ['mumbai-central', 0], ['dadar', 9], ['thane', 35], ['nashik-road', 165], ['nashik-cbs', 173],
  ], [...ALL, 'shivneri']),
  R('R-PUN-KOL', 'Pune – Kolhapur', 'पुणे – कोल्हापूर', [
    ['pune-station', 0], ['satara', 115], ['karad', 160], ['sangli', 200], ['kolhapur', 232],
  ], ALL),
  R('R-PUN-SOL', 'Pune – Solapur', 'पुणे – सोलापूर', [
    ['pune-station', 0], ['baramati', 100], ['solapur', 250],
  ], ALL),
  R('R-PUN-SANGLI', 'Pune – Sangli', 'पुणे – सांगली', [
    ['pune-station', 0], ['satara', 115], ['karad', 160], ['sangli', 200],
  ], ALL),
  R('R-MUM-RAT', 'Mumbai – Ratnagiri', 'मुंबई – रत्नागिरी', [
    ['mumbai-central', 0], ['dadar', 9], ['panvel', 58], ['chiplun', 250], ['ratnagiri', 330],
  ], ALL),
  R('R-NAG-AMR', 'Nagpur – Amravati', 'नागपूर – अमरावती', [['nagpur', 0], ['amravati', 155]], ALL),
  R('R-AMR-AKO', 'Amravati – Akola', 'अमरावती – अकोला', [['amravati', 0], ['akola', 90]], ALL),
  R('R-CSN-DHU', 'Sambhajinagar – Dhule', 'संभाजीनगर – धुळे', [['sambhajinagar', 0], ['dhule', 150]], ALL),
  R('R-DHU-JAL', 'Dhule – Jalgaon', 'धुळे – जळगाव', [['dhule', 0], ['jalgaon', 60]], ALL),
  R('R-NAN-LAT', 'Nanded – Latur', 'नांदेड – लातूर', [['nanded', 0], ['latur', 110]], ALL),
  R('R-LAT-SOL', 'Latur – Solapur', 'लातूर – सोलापूर', [['latur', 0], ['solapur', 110]], ALL),
  R('R-NAS-DHU', 'Nashik – Dhule', 'नाशिक – धुळे', [
    ['nashik-cbs', 0], ['nashik-road', 8], ['dhule', 150],
  ], ALL),
  R('R-CSN-PUN', 'Sambhajinagar – Pune', 'संभाजीनगर – पुणे', [
    ['sambhajinagar', 0], ['ahilyanagar', 115], ['pune-station', 230],
  ], PLUS_SHIVAI),
  R('R-MUM-KOL', 'Mumbai – Kolhapur', 'मुंबई – कोल्हापूर', [
    ['mumbai-central', 0], ['dadar', 9], ['panvel', 58], ['pune-station', 175], ['satara', 290], ['kolhapur', 405],
  ], ALL),
  R('R-NAG-NAN', 'Nagpur – Nanded', 'नागपूर – नांदेड', [
    ['nagpur', 0], ['amravati', 155], ['akola', 245], ['nanded', 400],
  ], ALL),
]
