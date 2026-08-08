export type Tutor = {
  id: string;
  name: string;
  examination: "PSLE" | "JCE" | "BGCSE";
  subject: string;
  rating: string;
  lessons: string;
  price: number;
  color: string;
  image: string;
  location: string;
  experience: string;
  headline: string;
  about: string;
  specialties: string[];
  approach: string[];
  availability: string[];
};

export const tutors: Tutor[] = [
  {
    id: "masego",
    name: "Masego",
    examination: "PSLE",
    subject: "Mathematics",
    rating: "4.9",
    lessons: "1,184 lessons",
    price: 22,
    color: "peach",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=88",
    location: "Gaborone, Botswana",
    experience: "6 years teaching experience",
    headline: "Patient PSLE Mathematics support with clear, step-by-step explanations.",
    about: "I help Standard 7 learners turn difficult Mathematics topics into manageable steps. Lessons focus on computation, application, reasoning, and the confidence to show complete working in an examination.",
    specialties: ["Fractions & percentages", "Measurement & geometry", "Word problems", "Exam technique"],
    approach: ["Begin with a short skills check", "Explain one method at a time", "Practise with PSLE-style questions", "Finish with a revision task and checkpoint"],
    availability: ["Today · 17:00", "Tomorrow · 16:30", "Sat · 10:00", "Sun · 14:00"]
  },
  {
    id: "thabo",
    name: "Thabo",
    examination: "JCE",
    subject: "General Science",
    rating: "5.0",
    lessons: "946 lessons",
    price: 24,
    color: "blue",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=88",
    location: "Francistown, Botswana",
    experience: "8 years teaching experience",
    headline: "JCE Science made practical, visual, and easier to remember.",
    about: "My tutorials connect Biology, Chemistry, and Physics concepts to familiar situations. Learners practise scientific vocabulary, diagrams, explanations, and data interpretation so they can answer JCE questions precisely.",
    specialties: ["Cells & body systems", "Matter & particles", "Forces & energy", "Scientific investigations"],
    approach: ["Identify the learner's weakest topic", "Use diagrams and real-world examples", "Model a complete examination answer", "Check retention with multiple-choice questions"],
    availability: ["Today · 18:00", "Thu · 17:30", "Sat · 09:00", "Sun · 15:30"]
  },
  {
    id: "keneilwe",
    name: "Keneilwe",
    examination: "BGCSE",
    subject: "Biology",
    rating: "4.9",
    lessons: "817 lessons",
    price: 27,
    color: "yellow",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=88",
    location: "Maun, Botswana",
    experience: "7 years teaching experience",
    headline: "Precise BGCSE Biology explanations, diagrams, and exam practice.",
    about: "I help Form 5 learners organise Biology content and write answers that use the correct scientific terms. Every tutorial combines concept review, labelled diagrams, structured questions, and targeted revision.",
    specialties: ["Cell biology", "Genetics & inheritance", "Human physiology", "Ecology"],
    approach: ["Connect new ideas to prior knowledge", "Build accurate scientific vocabulary", "Practise structured BGCSE responses", "Create a focused revision plan"],
    availability: ["Tomorrow · 17:00", "Fri · 16:00", "Sat · 11:30", "Sun · 13:00"]
  }
];

export const findTutor = (id: string) => tutors.find(tutor => tutor.id === id);
