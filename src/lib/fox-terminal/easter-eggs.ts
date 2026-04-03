import { useFoxAnimations } from './fox-animations';

export const easterEggs: Record<string, () => string[]> = {
  // ===== COFFEE COMMANDS ===== 
  // NOTE: brew, roast, espresso are now ANIMATED easter eggs
  // See: src/components/fox-terminal/easter-eggs/CoffeeAnimations.tsx

  // ===== FOX COMMANDS =====
  pet: () => {
    useFoxAnimations.getState().setAnimation('idle');
    return [
      '',
      '🦊 *purrs*',
      '',
      '  /\\_/\\',
      ' ( o.o )',
      '  > ^ <',
      '',
      '❤️ The fox is happy!',
      '💡 Achievement Unlocked: Fox Friend',
      '',
    ];
  },

  dance: () => {
    useFoxAnimations.getState().setAnimation('dance');
    setTimeout(() => useFoxAnimations.getState().setAnimation('idle'), 3000);
    return [
      '',
      '🕺 FOX DANCE PARTY! 🕺',
      '',
      '  🦊',
      ' \\|/',
      '  / \\',
      '',
      '🎵 *funky music plays*',
      '🕺 BEEP BOOP BEEP!',
      '🏆 Achievement Unlocked: Dance Party',
      '',
    ];
  },

  howl: () => [
    '',
    '🌙 AWOOOOOOO!',
    '',
    '      /\\',
    '     /  \\',
    '    / 🦊 \\',
    '   /______\\',
    '',
    '*echoes through the terminal*',
    '',
    '🌙 The fox calls to the moon!',
    '🏆 Achievement Unlocked: Call of the Wild',
    '',
  ],

  // ===== HACKER COMMANDS =====
  // NOTE: hack, matrix, sudo are now ANIMATED easter eggs
  // See: src/components/fox-terminal/easter-eggs/HackerAnimations.tsx

  red: () => [
    '',
    '🔴 You chose the RED PILL',
    '',
    '💊 Welcome to the real world.',
    '💻 Here\'s our GitHub: github.com/hostinginfo',
    '🔓 All secrets revealed!',
    '',
  ],

  blue: () => [
    '',
    '🔵 You chose the BLUE PILL',
    '',
    '😴 Ignorance is bliss...',
    '🛌 Back to sleep...',
    '💭 The story ends, you wake up and believe whatever you want to believe.',
    '',
  ],

  // NOTE: sudo is now an ANIMATED easter egg
  // See: src/components/fox-terminal/easter-eggs/HackerAnimations.tsx

  'rm -rf /': () => [
    '',
    '⚠️  WHOA THERE!',
    '',
    '🛑 Let\'s not do that.',
    '😅 How about some coffee instead?',
    '',
    'Type "brew" for a safer option!',
    '',
  ],

  // ===== FINAL FANTASY REFERENCES =====
  ff7: () => [
    '',
    '⚔️ FINAL FANTASY VII',
    '',
    '💥 "Not interested." - Cloud Strife',
    '',
    '⚔️  SOLDIER 1st Class reporting!',
    '🌎 Saving the Planet, one domain at a time',
    '✨ Limit Break: OMNISLASH!',
    '',
    '🎵 *One-Winged Angel intensifies*',
    '',
    '🏆 Achievement Unlocked: SOLDIER',
    '',
  ],

  cloud: () => [
    '',
    '☁️ "Not interested."',
    '',
    '⚔️  Cloud Strife has entered the chat',
    '💪 Ex-SOLDIER, Mercenary, Hero',
    '',
  ],

  sephiroth: () => [
    '',
    '🔥 "I will never be a memory."',
    '',
    '⚔️  Sephiroth appears!',
    '🎵 *One-Winged Angel plays*',
    '🔥 Supernova incoming!',
    '',
  ],

  aerith: () => [
    '',
    '🌸 "The sky is crying..."',
    '',
    '🌸 Aerith Gainsborough',
    '✨ Ancient, Flower Girl, Healer',
    '💐 Forever in our hearts',
    '',
  ],

  chocobo: () => [
    '',
    '🐥 KWEH! KWEH!',
    '',
    '    ,~.',
    '   (  o )',
    '   (   )',
    '    ) (',
    '   ( ^ )',
    '',
    '🎵 *Chocobo theme plays*',
    '🏇 Gotta catch that Gold Chocobo!',
    '',
  ],

  // ===== MARIO REFERENCES =====
  mario: () => [
    '',
    '🍄 IT\'S-A ME, MARIO!',
    '',
    '    ___',
    '   /   \\',
    '  | M M |',
    '   \\___/',
    '    | |',
    '   /   \\',
    '',
    '🍄 Let\'s-a go!',
    '⭐ Collecting stars and saving Princess Peach!',
    '',
    '🏆 Achievement Unlocked: Plumber',
    '',
  ],

  luigi: () => [
    '',
    '💚 LUIGI TIME!',
    '',
    '👻 "MAMA MIA!"',
    '🔦 Luigi\'s Mansion awaits',
    '💚 The Year of Luigi never ends!',
    '',
  ],

  peach: () => [
    '',
    '👑 Princess Peach',
    '',
    '🍰 "Thank you Mario! But our princess is in another castle!"',
    '👑 Ruler of the Mushroom Kingdom',
    '',
  ],

  bowser: () => [
    '',
    '🔥 BOWSER APPEARS!',
    '',
    '🐉 ROAR!',
    '🔥 King of the Koopas',
    '🎵 *Boss music intensifies*',
    '',
  ],

  // ===== SONIC REFERENCES =====
  sonic: () => [
    '',
    '💨 GOTTA GO FAST!',
    '',
    '    ___',
    '   (o o)',
    '    \\ /',
    '    _|_',
    '   /   \\',
    '',
    '💨 Sonic the Hedgehog!',
    '💍 Collecting rings at the speed of sound',
    '⚡ Way past cool!',
    '',
    '🏆 Achievement Unlocked: Gotta Go Fast',
    '',
  ],

  tails: () => [
    '',
    '🦊 TAILS - Miles Prower',
    '',
    '✈️ Flying high with two tails!',
    '🔧 Genius inventor and Sonic\'s best friend',
    '',
  ],

  knuckles: () => [
    '',
    '🥊 KNUCKLES',
    '',
    '💎 Guardian of the Master Emerald',
    '🥊 Unlike Sonic, he don\'t chuckle',
    '',
  ],

  eggman: () => [
    '',
    '🥚 DR. EGGMAN',
    '',
    '🤖 "I\'ll get you next time, Sonic!"',
    '🚀 Mad scientist with a robot army',
    '',
  ],

  // ===== CRASH BANDICOOT =====
  crash: () => [
    '',
    '🦊 CRASH BANDICOOT!',
    '',
    '  WOAH!',
    '   🦊',
    '  /|\\',
    '  / \\',
    '',
    '🍎 Collecting Wumpa Fruit',
    '🎮 Spinning through obstacles',
    '📦 Smashing crates!',
    '',
    '🏆 Achievement Unlocked: Bandicoot',
    '',
  ],

  cortex: () => [
    '',
    '🧠 DR. NEO CORTEX',
    '',
    '🔬 Evil genius',
    '🧠 "Crash Bandicoot! I\'ll get you!"',
    '',
  ],

  akuaku: () => [
    '',
    '👺 AKU AKU',
    '',
    '👺 "OOGA BOOGA!"',
    '🛡️ Protective mask spirit',
    '✨ Grants invincibility!',
    '',
  ],

  // ===== INTERNET MEMES =====
  nyan: () => [
    '',
    '🌈 NYAN CAT!',
    '',
    '  ,------,',
    '  |  /\\_/\\',
    '~|__( ^ .^)',
    '  ""  ""',
    '🌈🌈🌈🌈🌈🌈🌈🌈',
    '',
    '🎵 NYAN NYAN NYAN NYAN...',
    '',
    '🏆 Achievement Unlocked: Rainbow Rider',
    '',
  ],

  doge: () => [
    '',
    '🐕 DOGE',
    '',
    '        wow',
    '   such terminal',
    '               very command',
    '      much code',
    '                 so amaze',
    '',
    '🐕 WOW',
    '',
    '🏆 Achievement Unlocked: Much Wow',
    '',
  ],

  rickroll: () => [
    '',
    '🎵 RICKROLL\'D!',
    '',
    '🕺 Never gonna give you up',
    '🎵 Never gonna let you down',
    '🎶 Never gonna run around and desert you',
    '',
    '😂 You\'ve been rickrolled!',
    '',
    '🏆 Achievement Unlocked: Never Gonna Give You Up',
    '',
  ],

  // ===== SECRET COMMANDS =====
  secret: () => [
    '',
    '🎁 YOU FOUND THE SECRET!',
    '',
    '  🔓',
    ' /|\\',
    '  |',
    ' / \\',
    '',
    '🎉 Congratulations!',
    '🎫 Here\'s a discount code: FOXLOVER10',
    '💰 10% off your next purchase!',
    '',
    '🏆 Achievement Unlocked: Treasure Hunter',
    '',
  ],

  yeet: () => [
    '',
    '💥 YEET!',
    '',
    '  💥',
    ' 💥💥',
    '💥💥💥',
    '',
    '*everything flies away*',
    '',
    '(Type "undo" to bring it back)',
    '',
  ],

  undo: () => [
    '',
    '⏪ Undoing...',
    '',
    '✅ Everything is back!',
    '',
  ],

  // ===== MORE GAMING REFERENCES =====
  zelda: () => [
    '',
    '⚔️ THE LEGEND OF ZELDA',
    '',
    '🛡️ "It\'s dangerous to go alone! Take this."',
    '⚔️  Master Sword acquired!',
    '🎵 *Zelda theme plays*',
    '',
  ],

  pokemon: () => [
    '',
    '⚡ POKEMON!',
    '',
    '⚡ Pikachu used Thunder!',
    '💥 It\'s super effective!',
    '🎮 Gotta catch \'em all!',
    '',
  ],

  minecraft: () => [
    '',
    '⛏️ MINECRAFT',
    '',
    '🪨 *mining sounds*',
    '💠 Diamond ore found!',
    '🛠️ Crafting table ready',
    '',
  ],

  tetris: () => [
    '',
    '🟫 TETRIS',
    '',
    '🟫🟫🟫🟫',
    '🟫🟫🟫🟫',
    '',
    '💥 LINE CLEAR!',
    '🎵 *Tetris theme intensifies*',
    '',
  ],

  pacman: () => [
    '',
    '👾 PAC-MAN',
    '',
    '👾 · · · 👻',
    '',
    'WAKKA WAKKA WAKKA',
    '🍒 Eating all the dots!',
    '',
  ],

  // ===== KONAMI CODE =====
  konami: () => [
    '',
    '🎮 KONAMI CODE ACTIVATED!',
    '',
    '↑ ↑ ↓ ↓ ← → ← → B A',
    '',
    '🎮 30 LIVES!',
    '✨ UNLIMITED POWER!',
    '🚀 GOD MODE ENABLED!',
    '',
    '🏆 Achievement Unlocked: Konami Master',
    '',
  ],
};
