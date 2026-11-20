// VERDE CAY — every tuning number, name and colour in one place.
// An invented sun-soaked coastal city. Nothing here is from any commercial game:
// the city, the people, the cars, the radio and the story are all original.
export const CITY = {
  // The land runs from -320 to +320 on x and -320 to +150 on z.
  // South of z = 150 is the sea; the pier runs out from the boulevard at x = 0.
  half: 320,
  coastZ: 150,
  waterZ: 420,
  boulevardZ: 132,
  block: 64,
  roadWidth: 14,
};

export const GOLDEN = {
  skyTop: 0x2e4a7a,
  skyHorizon: 0xff9a52,
  sun: 0xffc46b,
  fog: 0xf2a35e,
  water: 0x1e6f8e,
  sand: 0xe8c98a,
  asphalt: 0x2c2f36,
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 15,
  health: 100,
  armour: 100,
  turnSpeed: 7,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverse: 12,
  maxSpeed: 46,
  maxReverse: 14,
  grip: 3.2,
  turn: 1.9,
};

export const BOAT = {
  accel: 22,
  maxSpeed: 34,
  turn: 1.4,
};

// The eight story jobs. Each job is a short chain of stages; the last one is the
// land-to-water escape that makes this game different from the other entries.
export const MISSIONS = [
  {
    id: 1, title: 'First Light', giver: 'Rosa', giverRole: 'Mechanic',
    brief: 'A Coral Comet RS is parked on Marina Row. Take it. No noise.',
    objective: 'Steal the Coral Comet on Marina Row',
    stages: ['Reach the Comet', 'Drive it to Rosa\u2019s garage'],
    reward: 2400, respect: 40,
    dialogue: 'Rosa: \u201cCoral Comet, Marina Row. Keys are in it. Don\u2019t scratch the paint.\u201d',
    next: 'Deliver the Comet to Rosa\u2019s garage on Coral Street.',
  },
  {
    id: 2, title: 'Valet Run', giver: 'Ana', giverRole: 'Driver',
    brief: 'The casino wants the Comet for one night. Valet it in, then walk away rich.',
    objective: 'Deliver the Comet to the Solmar Casino',
    stages: ['Drive to the Solmar Casino', 'Lose the VCPD tail', 'Park in the valet bay'],
    reward: 4200, respect: 60,
    dialogue: 'Ana: \u201cTwo stars on you already? Shake them on the boulevard, then park it pretty.\u201d',
    next: 'Park the Comet in the casino valet bay.',
  },
  {
    id: 3, title: 'Tide Money', giver: 'Uncle Sol', giverRole: 'Fixer',
    brief: 'Three drops around the city. Collect them all before the tide turns.',
    objective: 'Collect 3 cash drops around Verde Cay',
    stages: ['Pick up drop 1/3', 'Pick up drop 2/3', 'Pick up drop 3/3'],
    reward: 6800, respect: 80,
    dialogue: 'Uncle Sol: \u201cThree envelopes, three corners of the city. VCPD is watching the docks.\u201d',
    next: 'Collect the next cash drop.',
  },
  {
    id: 4, title: 'Harbor Lights', giver: 'Kiki', giverRole: 'Lookout',
    brief: 'Ana is boxed in by a roadblock on Harbor Lights. Break her out.',
    objective: 'Break Ana out of the Harbor Lights roadblock',
    stages: ['Reach the roadblock', 'Ram the VCPD cruisers', 'Escort Ana to the safe house'],
    reward: 9100, respect: 100,
    dialogue: 'Kiki: \u201cRoadblock on Harbor Lights, four cruisers. Ana can\u2019t move. Go.\u201d',
    next: 'Ram the roadblock cruisers and free Ana.',
  },
  {
    id: 5, title: 'Neon Tide', giver: 'Marco', giverRole: 'Wheelman',
    brief: 'A rival crew car is showing off on Neon Tide. Run it off the road.',
    objective: 'Run the rival Solmar GT off the road',
    stages: ['Catch the rival GT', 'Ram it until it stops'],
    reward: 12400, respect: 120,
    dialogue: 'Marco: \u201cThat GT thinks it owns Neon Tide. Prove it wrong. Hard.\u201d',
    next: 'Ram the rival GT until it gives up.',
  },
  {
    id: 6, title: 'Salt & Smoke', giver: 'Uncle Sol', giverRole: 'Fixer',
    brief: 'A bank van is crossing the causeway. Take the van, lose the heat, bring it to the pier.',
    objective: 'Steal the bank van and bring it to the pier warehouse',
    stages: ['Stop the bank van', 'Drive the van to the pier warehouse', 'Lose 3-star heat'],
    reward: 18600, respect: 150,
    dialogue: 'Uncle Sol: \u201cThe van crosses the causeway at 18:40. After that, it\u2019s just you and the sea.\u201d',
    next: 'Get the bank van to the pier warehouse.',
  },
  {
    id: 7, title: 'The Fixer', giver: 'Rosa', giverRole: 'Mechanic',
    brief: 'Marco is in the VCPD impound yard. Get him out — on foot if you have to.',
    objective: 'Free Marco from the VCPD impound yard',
    stages: ['Reach the impound yard', 'Free Marco', 'Escape in the getaway car'],
    reward: 24300, respect: 180,
    dialogue: 'Rosa: \u201cMarco\u2019s in the impound yard. The gate is locked. The guards are not friendly.\u201d',
    next: 'Free Marco, then escape in the getaway car.',
  },
  {
    id: 8, title: 'Open Water', giver: 'Marco', giverRole: 'Smuggler',
    brief: 'La Marea is fuelled and waiting at the pier. Slip the cordon, board her, and run for open water.',
    objective: 'Reach open water in the speedboat La Marea',
    stages: ['Drive to the pier', 'Board the speedboat La Marea', 'Reach open water'],
    reward: 91400, respect: 250,
    dialogue: 'Marco: \u201cSlip the cordon, cut across the marina, and run for open water — once we are past the breakwater they cannot hold us.\u201d',
    next: 'Board La Marea at the pier, then run for open water.',
  },
];

export const CREW = [
  { name: 'Ana', role: 'Driver', ability: 'Slipstream — +15% top speed for 20 s' },
  { name: 'Marco', role: 'Wheelman', ability: 'Smuggler — boat handling +25%' },
  { name: 'Rosa', role: 'Mechanic', ability: 'Quick Fix — repair 40% condition' },
  { name: 'Kiki', role: 'Lookout', ability: 'Eyes Out — police shown 30% further' },
  { name: 'Uncle Sol', role: 'Fixer', ability: 'Shot Caller — wanted drops one star' },
];

export const RADIO = [
  { name: 'Cay FM 98.1', style: 'Sunset pop' },
  { name: 'Tide 101.5', style: 'Coastal funk' },
  { name: 'Neon 104.9', style: 'Night drive synth' },
];

export const GARAGE_CARS = [
  { name: 'Coral Comet RS', color: 0xe8481f, speed: 46 },
  { name: 'Verde Runner', color: 0x2fae6e, speed: 38 },
  { name: 'Solmar GT', color: 0xf2b705, speed: 42 },
  { name: 'Bay Cruiser', color: 0x3a7bd5, speed: 34 },
];

export const WEAPONS = [
  { name: 'Fists', ammo: '—' },
  { name: 'Palm Pistol', ammo: '12/60' },
  { name: 'Tide SMG', ammo: '30/90' },
];

export const SAVE_KEY = 'verde-cay.save.v1';
export const BEST_KEY = 'verde-cay.best.v1';
export const STEP = 1 / 60;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
