import type { Stop } from '../types'

/**
 * Starter stop set for the demo. Names and city groupings are examples for UI
 * testing. They are NOT a verified MSRTC stop inventory and contain no verified
 * depot mapping, coordinates or timetable data.
 */
const S = (
  id: string,
  nameEn: string,
  nameMr: string,
  city: string,
  depot: string,
  routeIds: string[],
): Stop => ({
  id,
  nameEn,
  nameMr,
  city,
  depot,
  routeIds,
  source: 'Demo starter dataset (hand-written sample)',
  verification: 'demo-estimate',
})

export const DEMO_STOPS: Stop[] = [
  S('mumbai-central', 'Mumbai Central', 'मुंबई सेंट्रल', 'Mumbai', 'Mumbai Central', ['R-MUM-PUN', 'R-MUM-NAS', 'R-MUM-RAT', 'R-MUM-KOL']),
  S('dadar', 'Dadar', 'दादर', 'Mumbai', 'Mumbai Central', ['R-MUM-PUN', 'R-MUM-NAS', 'R-MUM-RAT', 'R-MUM-KOL']),
  S('andheri', 'Andheri', 'अंधेरी', 'Mumbai', 'Andheri', []),
  S('borivali', 'Borivali', 'बोरिवली', 'Mumbai', 'Borivali', []),
  S('thane', 'Thane', 'ठाणे', 'Thane', 'Thane', ['R-MUM-PUN', 'R-MUM-NAS']),
  S('kalyan', 'Kalyan', 'कल्याण', 'Thane', 'Kalyan', []),
  S('panvel', 'Panvel', 'पनवेल', 'Raigad', 'Panvel', ['R-MUM-PUN', 'R-MUM-RAT', 'R-MUM-KOL']),
  S('lonavala', 'Lonavala', 'लोणावळा', 'Pune', 'Pune', ['R-MUM-PUN']),
  S('pune-station', 'Pune Station', 'पुणे स्टेशन', 'Pune', 'Pune', [
    'R-MUM-PUN', 'R-PUN-NAS', 'R-KOP-PUN', 'R-PUN-KOL', 'R-PUN-SOL', 'R-PUN-SANGLI', 'R-CSN-PUN', 'R-MUM-KOL',
  ]),
  S('swargate', 'Swargate', 'स्वारगेट', 'Pune', 'Pune', ['R-MUM-PUN']),
  S('shivajinagar', 'Shivajinagar', 'शिवाजीनगर', 'Pune', 'Pune', ['R-PUN-NAS']),
  S('pimpri', 'Pimpri Chinchwad', 'पिंपरी चिंचवड', 'Pune', 'Pimpri', []),
  S('nashik-cbs', 'Nashik CBS', 'नाशिक सीबीएस', 'Nashik', 'Nashik', ['R-PUN-NAS', 'R-NAS-SHI', 'R-MUM-NAS', 'R-NAS-DHU']),
  S('nashik-road', 'Nashik Road', 'नाशिक रोड', 'Nashik', 'Nashik', ['R-PUN-NAS', 'R-NAS-SHI', 'R-MUM-NAS', 'R-NAS-DHU']),
  S('sangamner', 'Sangamner', 'संगमनेर', 'Ahilyanagar', 'Sangamner', ['R-PUN-NAS', 'R-NAS-SHI', 'R-KOP-PUN']),
  S('shirdi', 'Shirdi Bus Stand', 'शिर्डी बस स्थानक', 'Ahilyanagar', 'Shirdi', ['R-NAS-SHI', 'R-KOP-SHI', 'R-KOP-PUN']),
  S('kopargaon', 'Kopargaon Bus Stand', 'कोपरगाव बस स्थानक', 'Ahilyanagar', 'Kopargaon', ['R-KOP-SHI', 'R-KOP-PUN']),
  S('ahilyanagar', 'Ahilyanagar Bus Stand', 'अहिल्यानगर बस स्थानक', 'Ahilyanagar', 'Ahilyanagar', ['R-KOP-PUN', 'R-CSN-PUN', 'R-PUN-SOL']),
  S('kolhapur', 'Kolhapur CBS', 'कोल्हापूर सीबीएस', 'Kolhapur', 'Kolhapur', ['R-PUN-KOL', 'R-MUM-KOL']),
  S('satara', 'Satara Bus Stand', 'सातारा बस स्थानक', 'Satara', 'Satara', ['R-PUN-KOL', 'R-PUN-SANGLI', 'R-MUM-KOL']),
  S('karad', 'Karad Bus Stand', 'कराड बस स्थानक', 'Satara', 'Karad', ['R-PUN-KOL', 'R-PUN-SANGLI']),
  S('sangli', 'Sangli Bus Stand', 'सांगली बस स्थानक', 'Sangli', 'Sangli', ['R-PUN-KOL', 'R-PUN-SANGLI']),
  S('solapur', 'Solapur Bus Stand', 'सोलापूर बस स्थानक', 'Solapur', 'Solapur', ['R-PUN-SOL', 'R-LAT-SOL']),
  S('baramati', 'Baramati Bus Stand', 'बारामती बस स्थानक', 'Pune', 'Baramati', ['R-PUN-SOL']),
  S('nagpur', 'Nagpur Ganesh Peth', 'नागपूर गणेश पेठ', 'Nagpur', 'Nagpur', ['R-NAG-AMR', 'R-NAG-NAN']),
  S('amravati', 'Amravati Bus Stand', 'अमरावती बस स्थानक', 'Amravati', 'Amravati', ['R-NAG-AMR', 'R-AMR-AKO', 'R-NAG-NAN']),
  S('akola', 'Akola Bus Stand', 'अकोला बस स्थानक', 'Akola', 'Akola', ['R-AMR-AKO', 'R-NAG-NAN']),
  S('nanded', 'Nanded Bus Stand', 'नांदेड बस स्थानक', 'Nanded', 'Nanded', ['R-NAN-LAT', 'R-NAG-NAN']),
  S('latur', 'Latur Bus Stand', 'लातूर बस स्थानक', 'Latur', 'Latur', ['R-NAN-LAT', 'R-LAT-SOL']),
  S('ratnagiri', 'Ratnagiri Bus Stand', 'रत्नागिरी बस स्थानक', 'Ratnagiri', 'Ratnagiri', ['R-MUM-RAT']),
  S('chiplun', 'Chiplun Bus Stand', 'चिपळूण बस स्थानक', 'Ratnagiri', 'Chiplun', ['R-MUM-RAT']),
  S('dhule', 'Dhule Bus Stand', 'धुळे बस स्थानक', 'Dhule', 'Dhule', ['R-CSN-DHU', 'R-DHU-JAL', 'R-NAS-DHU']),
  S('jalgaon', 'Jalgaon Bus Stand', 'जळगाव बस स्थानक', 'Jalgaon', 'Jalgaon', ['R-DHU-JAL']),
  S('sambhajinagar', 'Chhatrapati Sambhajinagar CBS', 'छत्रपती संभाजीनगर सीबीएस', 'Chhatrapati Sambhajinagar', 'Sambhajinagar', [
    'R-CSN-DHU', 'R-CSN-PUN',
  ]),
]
