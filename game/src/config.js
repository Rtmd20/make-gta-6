// Verde Cay — world constants, story jobs, crew and radio stations.
// All names, places and people here are invented for this game.

export const WORLD = {
  // City footprint in metres. X runs west(-) to east(+), Z runs north(-) to south(+).
  half: 230,
  // The sea begins at this X and runs east; the beach sits just west of it.
  seaX: 168,
  beachX: 148,
  // Main coastal boulevard runs north-south along the beach.
  boulevardX: 132,
  sunsetHour: 18.7,
};

export const STREETS = {
  // North-south avenues (x positions) and east-west streets (z positions).
  avenues: [-96, -48, 0, 48, 96, 132],
  cross: [-150, -90, -30, 30, 90, 150],
  roadHalf: 7,
};

export const CREW = [
  { name: 'ANA', role: 'Driver', ability: 'Nitro boost — hold SHIFT in a car for a burst of speed', colour: '#f472b6' },
  { name: 'MARCO', role: 'Muscle', ability: 'Takes half damage in a fight', colour: '#60a5fa' },
  { name: 'ROSA', role: 'Fixer', ability: 'Repairs any car to full at the garage, free', colour: '#4ade80' },
  { name: 'KIKI', role: 'Lookout', ability: 'Police lose your trail twice as fast', colour: '#facc15' },
  { name: 'UNCLE SOL', role: 'The Old Man', ability: 'Every job pays 15% more', colour: '#fb923c' },
];

// The eight story jobs. Each job is a short chain of stages; a stage is complete
// when the player reaches its marker (or, for stage kinds, finishes the action).
// kind: 'goto' (reach a place), 'steal' (enter the marked car), 'chase'
// (outrun the police to the marker), 'boat' (board the boat and reach open water).
export const JOBS = [
  {
    name: 'FIRST LIGHT', giver: 'ANA',
    brief: 'Ana left a Comet at the marina gate. Go get it before the night shift clocks in.',
    stages: [
      { kind: 'goto', text: 'Reach the marina gate', x: 96, z: 120 },
      { kind: 'steal', text: 'Take the Coral Comet RS', x: 96, z: 120 },
    ],
    reward: 800, respect: 6,
    line: 'ANA: “Easy does it. The Cay is ours tonight.”',
  },
  {
    name: 'PAPER TRAIL', giver: 'UNCLE SOL',
    brief: 'Sol needs a ledger lifted from a courier van parked on Palm Row. Quiet hands, no sirens.',
    stages: [
      { kind: 'goto', text: 'Reach Palm Row', x: -48, z: -30 },
      { kind: 'steal', text: 'Lift the courier van', x: -48, z: -30 },
      { kind: 'goto', text: 'Bring the ledger to Sol’s cafe', x: 0, z: 90 },
    ],
    reward: 1400, respect: 8,
    line: 'UNCLE SOL: “A city runs on paper, kid. We just move it around.”',
  },
  {
    name: 'NEON RAIN', giver: 'ROSA',
    brief: 'Rosa’s garage needs parts from the north depot. The VCPD has the avenue watched — drive smart.',
    stages: [
      { kind: 'goto', text: 'Reach the north depot', x: 48, z: -150 },
      { kind: 'goto', text: 'Deliver the parts to Rosa’s garage', x: -96, z: 30 },
    ],
    reward: 1800, respect: 10,
    line: 'ROSA: “Parts are parts. The night is the hard bit.”',
  },
  {
    name: 'HARBOR LIGHTS', giver: 'MARCO',
    brief: 'Marco’s crew is boxed in on the boulevard at sunset. Punch through the roadblock and bring them home.',
    stages: [
      { kind: 'chase', text: 'Break the boulevard roadblock', x: 132, z: 40 },
      { kind: 'goto', text: 'Lose the tail — reach the lighthouse point', x: 150, z: -170 },
    ],
    reward: 3200, respect: 16,
    line: 'MARCO: “They set the whole boulevard on us. Good. More road to run.”',
  },
  {
    name: 'LOW TIDE', giver: 'KIKI',
    brief: 'Kiki spotted a patrol gap at the marina. Slip a crate of “fishing gear” onto the night boat.',
    stages: [
      { kind: 'goto', text: 'Reach the marina docks', x: 150, z: 150 },
      { kind: 'goto', text: 'Sneak the crate to the night boat', x: 168, z: 168 },
    ],
    reward: 2600, respect: 12,
    line: 'KIKI: “Two minutes of quiet water. That’s all we need.”',
  },
  {
    name: 'GOLD HOUR', giver: 'ANA',
    brief: 'A rival crew is showing off on the boulevard. Out-drive them, then out-run the VCPD that follows.',
    stages: [
      { kind: 'chase', text: 'Beat the rival crew to the beach turn', x: 132, z: -60 },
      { kind: 'goto', text: 'Shake the police — reach the south car park', x: 96, z: 168 },
    ],
    reward: 4100, respect: 18,
    line: 'ANA: “They brought a fast car. We brought a faster plan.”',
  },
  {
    name: 'THE LONG WAY', giver: 'UNCLE SOL',
    brief: 'Sol is moving the crew’s savings by boat. Escort the launch from the marina to the harbour mouth.',
    stages: [
      { kind: 'boat', text: 'Board the launch at the marina', x: 168, z: 140 },
      { kind: 'boat', text: 'Escort the launch to the harbour mouth', x: 210, z: 60 },
    ],
    reward: 5200, respect: 20,
    line: 'UNCLE SOL: “The sea keeps secrets better than this city does.”',
  },
  {
    name: 'OPEN WATER', giver: 'MARCO',
    brief: 'The whole VCPD is on the docks. Take the speedboat, cut across the marina and run for open water.',
    stages: [
      { kind: 'boat', text: 'Board the speedboat', x: 176, z: 120 },
      { kind: 'boat', text: 'Reach open water — past the breakwater', x: 260, z: 40 },
    ],
    reward: 9000, respect: 30,
    line: 'MARCO: “Slip the cordon, cut across the marina, and run for open water — once we are past the breakwater they cannot hold us.”',
  },
];

export const RADIO = [
  { name: 'WAVE 96.1 — SUNSET FM', style: 'warm synth-pop', bpm: 96, root: 220, scale: [0, 3, 5, 7, 10] },
  { name: 'CAY 104 — BOULEVARD BEATS', style: 'driving electro', bpm: 122, root: 196, scale: [0, 2, 3, 7, 8] },
  { name: 'HARBOUR 88 — NIGHT JAZZ', style: 'late-night keys', bpm: 72, root: 174.6, scale: [0, 2, 4, 7, 9] },
];

export const HERO_CAR = { name: 'Coral Comet RS', colour: 0xff4d1c, topSpeed: 62, accel: 26 };

export const SAVE_KEY = 'verdecay-save-v3';

export function defaultSave() {
  return { money: 1250, respect: 24, jobIndex: 0, health: 100, armour: 60, garage: ['Coral Comet RS'] };
}
