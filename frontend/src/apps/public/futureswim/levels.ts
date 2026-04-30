export type LevelCode = 'water-familiarisation' | 'learn-to-swim' | 'stroke-correction' | 'pre-squad';

export const LEVEL_CODES: LevelCode[] = [
  'water-familiarisation',
  'learn-to-swim',
  'stroke-correction',
  'pre-squad',
];

export type Level = {
  code: LevelCode;
  name: string;
  order: 1 | 2 | 3 | 4;
  ageBand: string;
  classSize: number;
  parentInWater: boolean;
  summary: string;
  learningOutcomes: string[];
  iconKey: 'droplet' | 'waves' | 'activity' | 'trophy';
};

export const FUTURE_SWIM_LEVELS: Level[] = [
  {
    code: 'water-familiarisation',
    name: 'Water Familiarisation',
    order: 1,
    ageBand: '3 mo – 2 yr',
    classSize: 6,
    parentInWater: true,
    summary:
      'Parent-and-baby water familiarisation in our warm ozone-treated pool. Babies build comfort, breath control, and confidence with a parent in the water.',
    learningOutcomes: [
      'Comfortable entries and exits',
      'Breath holding and bubble-blowing',
      'Floating with parent support',
      'Confidence with water on the face',
      'Songs and games that build trust',
    ],
    iconKey: 'droplet',
  },
  {
    code: 'learn-to-swim',
    name: 'Learn to Swim',
    order: 2,
    ageBand: '2 yr – 4 yr',
    classSize: 3,
    parentInWater: false,
    summary:
      'Toddler and early-beginner Learn-to-Swim. Children progress from floating to first strokes in a small group of three with a dedicated coach in the water.',
    learningOutcomes: [
      'Independent floating, front and back',
      'Streamlined kicking with a board',
      'First freestyle and backstroke patterns',
      'Submersion and underwater retrieval',
      'Pool safety and edge skills',
    ],
    iconKey: 'waves',
  },
  {
    code: 'stroke-correction',
    name: 'Stroke Correction',
    order: 3,
    ageBand: '5 yr – 10 yr',
    classSize: 4,
    parentInWater: false,
    summary:
      'School-age Stroke Correction for swimmers who can complete one or two lengths. Children refine all four strokes in a focused class of four.',
    learningOutcomes: [
      'Refined freestyle and backstroke technique',
      'Breaststroke timing and butterfly basics',
      'Bilateral breathing patterns',
      'Stroke-specific drills and feedback',
      'Building stamina to 25–50 m sets',
    ],
    iconKey: 'activity',
  },
  {
    code: 'pre-squad',
    name: 'Pre-Squad',
    order: 4,
    ageBand: '8 yr+',
    classSize: 4,
    parentInWater: false,
    summary:
      'Advanced Pre-Squad development for confident swimmers. Bridges Stroke Correction to formal squad programs with stroke endurance, turns, and squad-readiness drills.',
    learningOutcomes: [
      'Endurance sets and pace work',
      'Tumble turns and finishes',
      'Race-style starts and dives',
      'Training-pace freestyle and backstroke',
      'Club-squad readiness preparation',
    ],
    iconKey: 'trophy',
  },
];

export function parseLevelCode(serviceId: string): LevelCode | null {
  for (const code of LEVEL_CODES) {
    if (serviceId.endsWith(`-${code}`)) return code;
  }
  return null;
}

export function getLevel(code: LevelCode): Level | undefined {
  return FUTURE_SWIM_LEVELS.find((level) => level.code === code);
}
