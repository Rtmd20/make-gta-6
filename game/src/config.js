// Verde Cay: every number the game shares. The city is a grid of blocks west
// of a palm boulevard; east of the boulevard is beach, then open sea. The
// marina sits at the south-east corner, the lighthouse on the north-east point.
export const CITY = {
  block: 44, // block edge, metres
  street: 14, // street width, metres
  cols: 6, // blocks east-west (x)
  rows: 6, // blocks north-south (z)
  // Boulevard centre line (x), beach starts east of it.
  boulevardX: 176,
  beachX0: 196,
  seaX0: 232,
  marina: { x: 150, z: 150, r: 34 },
  lighthouse: { x: 196, z: -168 },
  // Where the player starts: parked on Palm Boulevard, on the road.
  spawn: { x: 176, z: 30, heading: Math.PI },
};

export const SUNSET = {
  skyTop: '#7b4fd0',
  skyMid: '#e2607a',
  skyLow: '#ff9a52',
  sun: '#ffd9a0',
  fog: '#e88a6d',
};

export const CREW = [
  { name: 'ANA', role: 'Driver', skill: 'Hot-wires any car in seconds' },
  { name: 'MARCO', role: 'Muscle', skill: 'Clears a roadblock the loud way' },
  { name: 'ROSA', role: 'Fixer', skill: 'Sells the take, no questions' },
  { name: 'KIKI', role: 'Lookout', skill: 'Sees the VCPD coming first' },
  { name: 'UNCLE SOL', role: 'The Old Man', skill: 'Knows every tide in the Cay' },
];

export const WEAPONS = [
  { name: 'FIST', damage: 12, rate: 0.45, range: 2.4, auto: false },
  { name: 'PISTOL', damage: 26, rate: 0.32, range: 60, auto: false },
  { name: 'SMG', damage: 14, rate: 0.09, range: 48, auto: true },
];

// Eight story jobs. Each job has stages; a stage is finished by reaching its
// target, stealing its car, or breaking its roadblock. Dialogue is the crew
// talking over the job, one line per stage.
export const JOBS = [
  {
    title: 'FIRST LIGHT',
    crew: 'ANA',
    briefing: 'The Comet is parked on Palm Boulevard. Take it before the VCPD tow it.',
    stages: [
      { objective: 'Reach the Coral Comet RS', kind: 'reach', target: { x: 176, z: 30 }, dialogue: 'Easy does it. The Cay is ours tonight.' },
      { objective: 'Take the Coral Comet RS', kind: 'steal', dialogue: 'She purrs, doesn\'t she? Drive, we are burning daylight.' },
    ],
    reward: 920,
  },
  {
    title: 'PALM HEIST',
    crew: 'ROSA',
    briefing: 'Rosa has a buyer for a Sunset Bank van. Lift it off the boulevard.',
    stages: [
      { objective: 'Reach the bank van on Marina Road', kind: 'reach', target: { x: 120, z: 110 }, dialogue: 'The van stops at the lights. That is our window.' },
      { objective: 'Steal the bank van', kind: 'steal', dialogue: 'Rosa already has the buyer on the line. Do not scratch it.' },
    ],
    reward: 1480,
  },
  {
    title: 'LOW TIDE',
    crew: 'KIKI',
    briefing: 'Kiki spotted a VCPD evidence locker down by the docks. Quiet in, quiet out.',
    stages: [
      { objective: 'Reach the docks without raising the alarm', kind: 'reach', target: { x: 160, z: 140 }, dialogue: 'Eyes on the roofs. If a heli lifts, we are done.' },
      { objective: 'Grab the evidence crate', kind: 'reach', target: { x: 176, z: 150 }, dialogue: 'Got it. Now walk away like you own the place.' },
    ],
    reward: 2100,
  },
  {
    title: 'HARBOR LIGHTS',
    crew: 'MARCO',
    briefing: 'The VCPD sealed the boulevard for the mayor\'s parade. Marco says: break it.',
    stages: [
      { objective: 'Break the boulevard roadblock', kind: 'roadblock', target: { x: 176, z: -40 }, dialogue: 'They set the whole boulevard on us. Good. More road to run.' },
      { objective: 'Lose the tail — reach the lighthouse point', kind: 'reach', target: { x: 196, z: -168 }, dialogue: 'Slip the cordon, cut across the marina, and run for open water — once we are past the breakwater they cannot hold us.' },
    ],
    reward: 3150,
  },
  {
    title: 'GOLDEN HOUR',
    crew: 'ANA',
    briefing: 'A rival crew is racing us to the old casino. Beat them to the vault.',
    stages: [
      { objective: 'Outrun the rival crew to the casino', kind: 'reach', target: { x: 40, z: -120 }, dialogue: 'They drive like tourists. Leave them at the lights.' },
      { objective: 'Hold the casino steps for 20 seconds', kind: 'hold', target: { x: 40, z: -120 }, holdSeconds: 20, dialogue: 'Vault is open. Rosa is already counting.' },
    ],
    reward: 4200,
  },
  {
    title: 'STATIC',
    crew: 'KIKI',
    briefing: 'The VCPD tapped our radio. Kiki needs the jammer van, moving, now.',
    stages: [
      { objective: 'Intercept the jammer van', kind: 'reach', target: { x: 90, z: 60 }, dialogue: 'The van is rolling. Get alongside and take it.' },
      { objective: 'Drive the jammer van to the garage', kind: 'reach', target: { x: 60, z: 90 }, dialogue: 'Signal is dead. The Cay is ours again.' },
    ],
    reward: 5300,
  },
  {
    title: 'HIGH WATER',
    crew: 'UNCLE SOL',
    briefing: 'Uncle Sol\'s boat is impounded at the marina. Spring it before the tide turns.',
    stages: [
      { objective: 'Reach the impounded boat', kind: 'reach', target: { x: 150, z: 150 }, dialogue: 'She is still there. Sol says the tide waits for no one.' },
      { objective: 'Steal the Wave Runner', kind: 'stealBoat', dialogue: 'Cast off! The harbour police will be on us in seconds.' },
    ],
    reward: 6800,
  },
  {
    title: 'OPEN WATER',
    crew: 'MARCO',
    briefing: 'The whole VCPD is on the docks. One boat, one run, open water.',
    stages: [
      { objective: 'Reach open water', kind: 'openWater', target: { x: 320, z: 60 }, dialogue: 'Past the breakwater they cannot hold us. Run for the horizon.' },
    ],
    reward: 12400,
  },
];

export const RADIO = [
  { name: 'SUNSET FM', freq: '96.1', style: 'synthwave', bpm: 96, root: 55 },
  { name: 'WAVE 96.1', freq: '96.1', style: 'island', bpm: 78, root: 65.41 },
  { name: 'PALM 104', freq: '104.3', style: 'electro', bpm: 122, root: 49 },
];

// Wanted: stars rise with crimes, fall when the player is out of sight.
export const WANTED = {
  steal: 1,
  shoot: 2,
  kill: 2,
  speedNearPolice: 1,
  decaySeconds: 26,
  heliAt: 3,
  boatsAt: 3,
};

export const SAVE_KEY = 'verde-cay-save-v1';
