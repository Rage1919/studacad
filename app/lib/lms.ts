export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type Lesson = {
  id: string;
  title: string;
  duration: string;
  description: string;
  videoUrl: string;
  revisionTitle: string;
  revisionContent: string;
  quiz: QuizQuestion[];
};

export type Course = {
  id: string;
  title: string;
  language: string;
  level: string;
  description: string;
  color: string;
  price: number;
  instructor: string;
  lessons: Lesson[];
};

export type CreditTransaction = {
  id: string;
  type: "topup" | "purchase" | "reward";
  label: string;
  amount: number;
  createdAt: string;
};

export type LmsState = {
  credits: number;
  courses: Course[];
  purchasedCourseIds: string[];
  completedLessonIds: string[];
  quizScores: Record<string, number>;
  transactions: CreditTransaction[];
};

const q = (id: string, prompt: string, options: string[], correctIndex: number): QuizQuestion => ({ id, prompt, options, correctIndex });

export const defaultCourses: Course[] = [
  {
    id: "english-confidence",
    title: "Confident English Conversations",
    language: "English",
    level: "Intermediate",
    description: "Speak naturally in everyday situations with practical phrases, listening drills, and guided practice.",
    color: "#ff72b6",
    price: 140,
    instructor: "Amara N.",
    lessons: [
      {
        id: "open-a-conversation",
        title: "Open a conversation naturally",
        duration: "14 min",
        description: "Learn friendly openers, follow-up questions, and the rhythm of a confident first conversation.",
        videoUrl: "https://www.youtube.com/embed/Hd4A7U8O9kE",
        revisionTitle: "Conversation openers — revision sheet",
        revisionContent: "Key phrases:\n• How has your week been?\n• What have you been working on lately?\n• That sounds interesting — tell me more.\n\nPractice: Write three follow-up questions for a new colleague.",
        quiz: [
          q("e1q1", "Which opener is most natural in a casual conversation?", ["State your full name.", "How has your week been?", "Why are you here?", "Give me information."], 1),
          q("e1q2", "What makes a good follow-up question?", ["It changes the topic immediately", "It can only be answered yes or no", "It connects to what the person just said", "It repeats the same words"], 2),
          q("e1q3", "Choose the phrase that shows active interest.", ["That sounds interesting — tell me more.", "Anyway, about me...", "I already know that.", "Please stop."], 0)
        ]
      },
      {
        id: "tell-a-story",
        title: "Tell a clear, engaging story",
        duration: "18 min",
        description: "Structure short stories with a strong beginning, useful details, and a memorable ending.",
        videoUrl: "https://www.youtube.com/embed/6eWS2YVJk2s",
        revisionTitle: "Story structure — quick guide",
        revisionContent: "Use the three-part structure:\n1. Set the scene\n2. Explain what changed\n3. Share the outcome\n\nConnectors: at first, suddenly, because of that, in the end.",
        quiz: [
          q("e2q1", "What should come first in a short story?", ["The outcome", "Every minor detail", "The setting and context", "A different topic"], 2),
          q("e2q2", "Which connector signals a result?", ["Because of that", "Meanwhile", "At first", "For example"], 0)
        ]
      },
      {
        id: "handle-misunderstandings",
        title: "Handle misunderstandings calmly",
        duration: "12 min",
        description: "Clarify meaning, ask for repetition, and recover smoothly when communication breaks down.",
        videoUrl: "https://www.youtube.com/embed/juKd26qkNAw",
        revisionTitle: "Clarification phrases",
        revisionContent: "Useful phrases:\n• Could you say that another way?\n• If I understood correctly, you mean...\n• Sorry, I missed the last part.\n• Let me rephrase that.",
        quiz: [
          q("e3q1", "Which phrase politely checks your understanding?", ["You are wrong.", "If I understood correctly, you mean...", "Say it properly.", "Never mind."], 1),
          q("e3q2", "What is the best response when you miss one sentence?", ["Pretend you understood", "End the conversation", "Ask the speaker to repeat the last part", "Change the subject"], 2)
        ]
      }
    ]
  },
  {
    id: "spanish-travel",
    title: "Spanish for Real-World Travel",
    language: "Spanish",
    level: "Beginner",
    description: "Navigate airports, cafés, hotels, and new friendships with high-frequency Spanish.",
    color: "#aee4ff",
    price: 185,
    instructor: "Mateo R.",
    lessons: [
      {
        id: "cafe-basics",
        title: "Order confidently at a café",
        duration: "16 min",
        description: "Practice greetings, menu questions, and polite ways to order food and drinks.",
        videoUrl: "https://www.youtube.com/embed/DAp_v7EH9AA",
        revisionTitle: "Café Spanish phrase sheet",
        revisionContent: "Hola. Quisiera... = Hello. I would like...\n¿Qué me recomienda? = What do you recommend?\nLa cuenta, por favor. = The bill, please.",
        quiz: [
          q("s1q1", "How do you politely say ‘I would like’?", ["No quiero", "Quisiera", "¿Dónde?", "Gracias"], 1),
          q("s1q2", "What does ‘La cuenta, por favor’ request?", ["The menu", "A table", "The bill", "A taxi"], 2)
        ]
      },
      {
        id: "directions",
        title: "Ask for and understand directions",
        duration: "15 min",
        description: "Use landmarks, direction words, and clarification phrases to find your way.",
        videoUrl: "https://www.youtube.com/embed/JqkMtE4VqTo",
        revisionTitle: "Directions vocabulary",
        revisionContent: "a la derecha = to the right\na la izquierda = to the left\ntodo recto = straight ahead\ncerca de = near",
        quiz: [q("s2q1", "What does ‘a la derecha’ mean?", ["To the left", "Straight ahead", "To the right", "Nearby"], 2)]
      }
    ]
  },
  {
    id: "french-foundations",
    title: "French Foundations",
    language: "French",
    level: "Beginner",
    description: "Build a practical foundation in pronunciation, introductions, and everyday French.",
    color: "#ffe56c",
    price: 120,
    instructor: "Camille D.",
    lessons: [
      {
        id: "introductions",
        title: "Introduce yourself in French",
        duration: "13 min",
        description: "Share your name, where you are from, and what you enjoy doing.",
        videoUrl: "https://www.youtube.com/embed/ujDtm0hZyII",
        revisionTitle: "French introductions",
        revisionContent: "Je m’appelle... = My name is...\nJe viens de... = I come from...\nJ’aime... = I like...\nEnchanté(e). = Nice to meet you.",
        quiz: [
          q("f1q1", "How do you say ‘My name is...’?", ["Je viens de...", "Je m’appelle...", "J’aime...", "À bientôt"], 1),
          q("f1q2", "Which phrase means ‘Nice to meet you’?", ["Merci", "Bonjour", "Enchanté(e)", "Pardon"], 2)
        ]
      }
    ]
  }
];

export const initialLmsState: LmsState = {
  credits: 850,
  courses: defaultCourses,
  purchasedCourseIds: ["english-confidence"],
  completedLessonIds: [],
  quizScores: {},
  transactions: [
    { id: "welcome-credit", type: "topup", label: "Demo wallet funded", amount: 850, createdAt: new Date().toISOString() }
  ]
};

export const credit = (amount: number) => `${amount.toLocaleString()} credits`;

