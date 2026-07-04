/*
 * The Side Quest compendium.
 * Each quest is a tiny, real-world adventure. Tags describe the shape of the
 * journey: how long it takes, what it costs, its spirit, and its difficulty.
 */
const QUEST_POOL = [
  {
    id: "tiny-treasures",
    title: "The Tiny Treasures",
    icons: ["🍂", "🪨", "🌼", "🪶", "🌲"],
    time: "30 min",
    cost: "Free",
    spirit: "Adventurous",
    difficulty: "Medium",
    description:
      "Collect 5 tiny treasures from your walk (a leaf, a stone, a flower, etc). The world leaves gifts for those who pay attention.",
  },
  {
    id: "stranger-kindness",
    title: "The Anonymous Boon",
    icons: ["✉️", "💛", "🤫"],
    time: "20 min",
    cost: "Free",
    spirit: "Kind",
    difficulty: "Easy",
    description:
      "Leave a small note of encouragement somewhere a stranger will find it. Sign it only as 'a fellow traveller'.",
  },
  {
    id: "silent-dawn",
    title: "Vigil at First Light",
    icons: ["🌅", "🍵", "🕊️"],
    time: "45 min",
    cost: "Free",
    spirit: "Peaceful",
    difficulty: "Medium",
    description:
      "Wake before the sun and greet the dawn in silence. No phone, no words — just you and the turning of the world.",
  },
  {
    id: "unknown-path",
    title: "The Road Not Taken",
    icons: ["🛤️", "🧭", "🌳"],
    time: "1 hr",
    cost: "Free",
    spirit: "Adventurous",
    difficulty: "Medium",
    description:
      "Take a street you have never walked before and follow it until it surprises you. Map the corner of the world you forgot to explore.",
  },
  {
    id: "forgotten-friend",
    title: "The Long-Lost Ally",
    icons: ["📞", "💬", "🫂"],
    time: "15 min",
    cost: "Free",
    spirit: "Kind",
    difficulty: "Easy",
    description:
      "Reach out to someone you have not spoken to in months. Remind an old ally that they are remembered.",
  },
  {
    id: "sky-scribe",
    title: "The Cloud Cartographer",
    icons: ["☁️", "🔭", "✏️"],
    time: "20 min",
    cost: "Free",
    spirit: "Whimsical",
    difficulty: "Easy",
    description:
      "Lie back and watch the clouds. Name three creatures you find drifting overhead and give one of them a legend.",
  },
  {
    id: "hearth-feast",
    title: "The Hearth Feast",
    icons: ["🍲", "🔥", "🌿"],
    time: "1 hr",
    cost: "Modest",
    spirit: "Creative",
    difficulty: "Medium",
    description:
      "Cook a dish you have never made before, using an ingredient you have never cooked with. Every recipe is a small quest.",
  },
  {
    id: "coin-fountain",
    title: "The Wishing Well",
    icons: ["🪙", "⛲", "🌟"],
    time: "10 min",
    cost: "Modest",
    spirit: "Whimsical",
    difficulty: "Easy",
    description:
      "Toss a coin into a fountain and make a wish you have never told anyone. The keeping of it is part of the magic.",
  },
  {
    id: "night-lantern",
    title: "The Star Vigil",
    icons: ["🌙", "⭐", "🔭"],
    time: "30 min",
    cost: "Free",
    spirit: "Peaceful",
    difficulty: "Easy",
    description:
      "Find the darkest patch of sky you can reach and count ten stars. Learn the name of just one constellation before you sleep.",
  },
  {
    id: "market-bard",
    title: "The Merchant's Tale",
    icons: ["🛍️", "🗣️", "📖"],
    time: "30 min",
    cost: "Free",
    spirit: "Social",
    difficulty: "Medium",
    description:
      "Visit a local shop and ask the keeper how they came to be there. Every merchant carries an unwritten story.",
  },
  {
    id: "green-ward",
    title: "The Growing Ward",
    icons: ["🌱", "🪴", "💧"],
    time: "20 min",
    cost: "Modest",
    spirit: "Nurturing",
    difficulty: "Easy",
    description:
      "Plant something that will outlast the day — a seed, a sprout, a cutting. Tend a small piece of the future.",
  },
  {
    id: "sketch-relic",
    title: "The Relic Sketch",
    icons: ["🖊️", "📜", "🏺"],
    time: "25 min",
    cost: "Free",
    spirit: "Creative",
    difficulty: "Easy",
    description:
      "Draw the oldest object in your home. It has survived to reach your hands — honour it with a portrait.",
  },
  {
    id: "silent-supper",
    title: "The Vow of Quiet",
    icons: ["🤐", "🍽️", "🧘"],
    time: "30 min",
    cost: "Free",
    spirit: "Peaceful",
    difficulty: "Medium",
    description:
      "Eat one meal today in complete silence and full attention. Taste everything as if for the first time.",
  },
  {
    id: "kindness-toll",
    title: "The Traveller's Toll",
    icons: ["☕", "🎁", "😊"],
    time: "15 min",
    cost: "Modest",
    spirit: "Kind",
    difficulty: "Easy",
    description:
      "Pay for a stranger's coffee, or buy the next traveller's toll. Kindness is a currency that never runs dry.",
  },
  {
    id: "old-song",
    title: "The Forgotten Anthem",
    icons: ["🎵", "🎧", "🕰️"],
    time: "15 min",
    cost: "Free",
    spirit: "Whimsical",
    difficulty: "Easy",
    description:
      "Play a song you loved ten years ago and let it carry you back. Remember who you were when you first heard it.",
  },
  {
    id: "photo-hunt",
    title: "The Colour Hunt",
    icons: ["📷", "🌈", "🔍"],
    time: "40 min",
    cost: "Free",
    spirit: "Adventurous",
    difficulty: "Medium",
    description:
      "Choose a colour at random and photograph seven things that wear it. The town is more vivid than it lets on.",
  },
  {
    id: "gratitude-scroll",
    title: "The Gratitude Scroll",
    icons: ["📝", "🙏", "💫"],
    time: "10 min",
    cost: "Free",
    spirit: "Reflective",
    difficulty: "Easy",
    description:
      "Write down three things you are grateful for that you have never named before. Small blessings hide in plain sight.",
  },
  {
    id: "puddle-leap",
    title: "The Rainwalk Rite",
    icons: ["🌧️", "☔", "👟"],
    time: "20 min",
    cost: "Free",
    spirit: "Whimsical",
    difficulty: "Easy",
    description:
      "Walk in the rain on purpose, without hurrying. Let the sky remind you that being soaked can be a kind of joy.",
  },
  {
    id: "library-oracle",
    title: "The Oracle's Page",
    icons: ["📚", "🔮", "☝️"],
    time: "20 min",
    cost: "Free",
    spirit: "Reflective",
    difficulty: "Easy",
    description:
      "Open any book to a random page and read the first sentence your eye lands on. Take it as counsel for the day.",
  },
  {
    id: "map-realm",
    title: "The Homeland Map",
    icons: ["🗺️", "🖍️", "🏡"],
    time: "35 min",
    cost: "Free",
    spirit: "Creative",
    difficulty: "Medium",
    description:
      "Draw a fantasy map of your neighbourhood, renaming every place with an epic title. Turn the corner shop into a tavern.",
  },
  {
    id: "dusk-fire",
    title: "The Ember Watch",
    icons: ["🕯️", "🔥", "🌆"],
    time: "30 min",
    cost: "Free",
    spirit: "Peaceful",
    difficulty: "Easy",
    description:
      "Light a candle at dusk and watch it burn for a while with no other task. Let the flame hold your attention entirely.",
  },
  {
    id: "compliment-quest",
    title: "The Three Blessings",
    icons: ["💬", "😊", "✨"],
    time: "1 day",
    cost: "Free",
    spirit: "Social",
    difficulty: "Medium",
    description:
      "Give three genuine, specific compliments to three different people today. Watch each one change the air a little.",
  },
  {
    id: "barefoot-earth",
    title: "The Grounding Rite",
    icons: ["🦶", "🌿", "🌍"],
    time: "15 min",
    cost: "Free",
    spirit: "Peaceful",
    difficulty: "Easy",
    description:
      "Stand barefoot on grass, sand, or earth for a few minutes. Feel the world holding you up, as it always has.",
  },
  {
    id: "letter-future",
    title: "The Letter to a Future Self",
    icons: ["📮", "⏳", "🖋️"],
    time: "20 min",
    cost: "Free",
    spirit: "Reflective",
    difficulty: "Easy",
    description:
      "Write a short letter to who you will be one year from now. Seal it, hide it, and let time deliver it for you.",
  },
];
