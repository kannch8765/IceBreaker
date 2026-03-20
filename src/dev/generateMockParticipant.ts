const NAMES = [
  "Alex", "Jordan", "Taylor", "Sora", "Yuki",
  "Hana", "Kenji", "Rina", "Haruto", "Mei",
  "Liam", "Noah", "Emma", "Olivia", "Ava",
  "Lucas", "Mia", "Ethan", "Sophia", "Kai"
];

const PRONOUNS = ["He/Him", "She/Her", "They/Them"];

const MOODS = [
  { emoji: '🔥', label: 'Energetic', key: 'moodEnergetic' },
  { emoji: '😌', label: 'Chill', key: 'moodChill' },
  { emoji: '🤔', label: 'Curious', key: 'moodCurious' },
  { emoji: '✨', label: 'Inspired', key: 'moodInspired' },
  { emoji: '😎', label: 'Confident', key: 'moodConfident' },
  { emoji: '😴', label: 'Tired', key: 'moodTired' }
];

const LANGUAGES = ["en", "jp"] as const;

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockParticipant(i: number) {
  const name = NAMES[i % NAMES.length]; 
  const pronoun = randomPick(PRONOUNS);
  const moodObj = randomPick(MOODS);
  const language = randomPick(LANGUAGES);

  return {
    username: name,
    pronoun,
    inputMode: "mood",
    mood: moodObj.label,
    language, // Used if createParticipant supports override
  };
}
const MOCK_ANSWERS = [
  "I really enjoy peaceful mornings with a good book.",
  "I'm a big fan of exploring new hiking trails on weekends.",
  "I find that a bit of creative coding always clears my head.",
  "I love discovering hidden gems in the city, like small coffee shops.",
  "I'm quite passionate about sustainable living and DIY projects.",
  "I enjoy the focus and flow that comes with learning a new language.",
  "I find that listening to lo-fi beats helps me stay productive.",
  "I'm always up for a good conversation about space exploration.",
  "I love the feeling of finishing a challenging puzzle or game.",
  "I find that a quick meditation session really recharges my energy."
];

export function generateMockQA(questions: any[]) {
  return questions.map((q, i) => {
    // Pick a varied answer based on index or random
    const answer = MOCK_ANSWERS[(i + Math.floor(Math.random() * MOCK_ANSWERS.length)) % MOCK_ANSWERS.length];
    return {
      questionId: q.id || `q${i+1}`,
      question: q.text || "",
      answer: answer
    };
  });
}
