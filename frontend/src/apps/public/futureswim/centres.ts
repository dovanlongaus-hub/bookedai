export type CentreCode = 'caringbah' | 'kirrawee' | 'leichhardt' | 'rouse-hill' | 'st-peters';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayWindow = {
  morning: string | null;
  afternoon: string | null;
};

export type OpeningHours = Record<DayKey, DayWindow>;

export type Centre = {
  code: CentreCode;
  name: string;
  address: string;
  manager: string;
  phone: string;
  phoneDisplay: string;
  email: string;
  mapUrl: string;
  sourceUrl: string;
  imageUrl: string;
  openingHours: OpeningHours;
  pricingIndicative: boolean;
  freeTrialAvailable?: boolean;
};

export const FUTURE_SWIM_CENTRES: Centre[] = [
  {
    code: 'caringbah',
    name: 'Caringbah',
    address: '85 Cawarra Road, Caringbah, Sydney NSW 2229',
    manager: 'Sharay Alzate',
    phone: '+61483956976',
    phoneDisplay: '0483 956 976',
    email: 'caringbah@futureswim.com.au',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=85%20Cawarra%20Road%2C%20Caringbah%20NSW%202229',
    sourceUrl: 'https://futureswim.com.au/locations/caringbah/',
    imageUrl: 'https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=1200',
    openingHours: {
      mon: { morning: '08:30-11:30', afternoon: '15:00-18:00' },
      tue: { morning: '09:00-12:30', afternoon: '15:00-18:00' },
      wed: { morning: '08:00-10:30', afternoon: '15:00-18:00' },
      thu: { morning: '08:30-12:00', afternoon: '15:00-18:00' },
      fri: { morning: '08:00-11:30', afternoon: null },
      sat: { morning: '07:30-12:00', afternoon: null },
      sun: { morning: null, afternoon: null },
    },
    pricingIndicative: false,
  },
  {
    code: 'kirrawee',
    name: 'Kirrawee',
    address: '62 Waratah Street, Kirrawee, Sydney NSW 2232',
    manager: 'Karen James',
    phone: '+61499857946',
    phoneDisplay: '0499 857 946',
    email: 'kirrawee@futureswim.com.au',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=62%20Waratah%20Street%2C%20Kirrawee%20NSW%202232',
    sourceUrl: 'https://futureswim.com.au/locations/kirrawee/',
    imageUrl: 'https://images.pexels.com/photos/261185/pexels-photo-261185.jpeg?auto=compress&cs=tinysrgb&w=1200',
    openingHours: {
      mon: { morning: '07:00-11:30', afternoon: '14:00-18:00' },
      tue: { morning: '07:00-11:30', afternoon: '14:00-18:00' },
      wed: { morning: '07:00-11:30', afternoon: '14:00-18:00' },
      thu: { morning: '07:00-11:30', afternoon: '14:00-18:00' },
      fri: { morning: '07:00-11:30', afternoon: '14:00-18:00' },
      sat: { morning: '07:30-14:00', afternoon: null },
      sun: { morning: '07:30-12:30', afternoon: null },
    },
    pricingIndicative: true,
  },
  {
    code: 'leichhardt',
    name: 'Leichhardt',
    address: '124 Marion Street, Leichhardt, Sydney NSW 2040',
    manager: 'Clancy Byrnes',
    phone: '+61493202141',
    phoneDisplay: '0493 202 141',
    email: 'leichhardt@futureswim.com.au',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=124%20Marion%20Street%2C%20Leichhardt%20NSW%202040',
    sourceUrl: 'https://futureswim.com.au/locations/leichhardt/',
    imageUrl: 'https://images.pexels.com/photos/2247179/pexels-photo-2247179.jpeg?auto=compress&cs=tinysrgb&w=1200',
    openingHours: {
      mon: { morning: '09:00-13:00', afternoon: '15:00-18:00' },
      tue: { morning: '09:00-13:00', afternoon: '15:00-18:00' },
      wed: { morning: '09:00-13:00', afternoon: '15:00-18:00' },
      thu: { morning: '09:00-13:00', afternoon: '15:00-18:00' },
      fri: { morning: '09:00-13:00', afternoon: '15:00-18:00' },
      sat: { morning: '08:00-13:00', afternoon: '13:30-17:00' },
      sun: { morning: '08:00-13:00', afternoon: null },
    },
    pricingIndicative: false,
  },
  {
    code: 'rouse-hill',
    name: 'Rouse Hill',
    address: 'Unit 5/ 2-4 Resolution Place, Rouse Hill NSW 2155',
    manager: 'Helen Tran',
    phone: '+61491626284',
    phoneDisplay: '0491 626 284',
    email: 'rousehill@futureswim.com.au',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Unit%205%2C%202-4%20Resolution%20Place%2C%20Rouse%20Hill%20NSW',
    sourceUrl: 'https://futureswim.com.au/locations/rouse-hill/',
    imageUrl: 'https://images.pexels.com/photos/261409/pexels-photo-261409.jpeg?auto=compress&cs=tinysrgb&w=1200',
    openingHours: {
      mon: { morning: null, afternoon: '15:30-20:30' },
      tue: { morning: null, afternoon: '15:30-20:30' },
      wed: { morning: '09:00-12:00', afternoon: '15:30-20:30' },
      thu: { morning: null, afternoon: '15:30-20:30' },
      fri: { morning: '09:00-12:00', afternoon: '15:30-20:30' },
      sat: { morning: '08:00-12:00', afternoon: '12:00-17:00' },
      sun: { morning: '08:00-12:00', afternoon: '12:00-17:00' },
    },
    pricingIndicative: true,
  },
  {
    code: 'st-peters',
    name: 'St Peters',
    address: 'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
    manager: 'Joanna',
    phone: '+61492919099',
    phoneDisplay: '0492 919 099',
    email: 'stpeters@futureswim.com.au',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Unit%203B%2C%201-7%20Unwins%20Bridge%20Road%2C%20St%20Peters%20NSW%202044',
    sourceUrl: 'https://futureswim.com.au/locations/st-peters/',
    imageUrl: 'https://images.pexels.com/photos/3933894/pexels-photo-3933894.jpeg?auto=compress&cs=tinysrgb&w=1200',
    openingHours: {
      mon: { morning: '09:00-12:00', afternoon: '15:00-18:30' },
      tue: { morning: '09:00-12:00', afternoon: '15:00-18:30' },
      wed: { morning: '09:00-12:00', afternoon: '15:00-18:30' },
      thu: { morning: '09:00-12:00', afternoon: '15:00-18:30' },
      fri: { morning: '09:00-12:00', afternoon: '15:00-18:30' },
      sat: { morning: '07:30-12:00', afternoon: '12:00-17:00' },
      sun: { morning: '07:30-12:00', afternoon: '12:00-17:00' },
    },
    pricingIndicative: true,
    freeTrialAvailable: true,
  },
];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function getCentre(code: CentreCode): Centre | undefined {
  return FUTURE_SWIM_CENTRES.find((centre) => centre.code === code);
}
