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
  availabilityGroups: Array<"Today" | "Tomorrow" | "Weekdays" | "Weekend">;
};

type TutorSeed = Pick<Tutor, "id" | "name" | "examination" | "subject" | "rating" | "lessons" | "price" | "color" | "image" | "location" | "availability" | "availabilityGroups">;

const subjectTutor = (seed: TutorSeed): Tutor => ({
  ...seed,
  experience: "5 years teaching experience",
  headline: `Focused ${seed.examination} ${seed.subject} support with clear explanations and exam-style practice.`,
  about: `I help learners understand ${seed.subject} concepts, correct common mistakes, and build a reliable method for answering ${seed.examination} questions. Each tutorial is adjusted to the learner's current level and revision goals.`,
  specialties: [`${seed.subject} foundations`, "Structured questions", "Exam technique", "Revision planning"],
  approach: ["Identify the learner's priority topics", "Explain with worked examples", `Practise ${seed.examination}-style questions`, "Finish with feedback and a revision task"]
});

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
    availability: ["Today · 17:00", "Tomorrow · 16:30", "Sat · 10:00", "Sun · 14:00"],
    availabilityGroups: ["Today", "Tomorrow", "Weekend"]
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
    availability: ["Today · 18:00", "Thu · 17:30", "Sat · 09:00", "Sun · 15:30"],
    availabilityGroups: ["Today", "Weekdays", "Weekend"]
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
    availability: ["Tomorrow · 17:00", "Fri · 16:00", "Sat · 11:30", "Sun · 13:00"],
    availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"]
  },
  subjectTutor({ id: "kabelo", name: "Kabelo", examination: "PSLE", subject: "Mathematics", rating: "4.8", lessons: "735 lessons", price: 19, color: "blue", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=900&q=88", location: "Molepolole, Botswana", availability: ["Today · 19:00", "Wed · 16:00", "Sat · 12:00"], availabilityGroups: ["Today", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "naledi", name: "Naledi", examination: "PSLE", subject: "English", rating: "4.9", lessons: "1,088 lessons", price: 21, color: "yellow", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=88", location: "Gaborone, Botswana", availability: ["Tomorrow · 15:30", "Thu · 17:00", "Sun · 10:00"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "kagiso", name: "Kagiso", examination: "PSLE", subject: "Science", rating: "4.8", lessons: "642 lessons", price: 20, color: "peach", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=88", location: "Serowe, Botswana", availability: ["Today · 16:00", "Tomorrow · 18:00", "Sat · 09:30"], availabilityGroups: ["Today", "Tomorrow", "Weekend"] }),
  subjectTutor({ id: "boitumelo", name: "Boitumelo", examination: "PSLE", subject: "Setswana", rating: "5.0", lessons: "511 lessons", price: 18, color: "yellow", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=88", location: "Kanye, Botswana", availability: ["Tomorrow · 17:30", "Fri · 16:30", "Sun · 12:00"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "lorato", name: "Lorato", examination: "JCE", subject: "Mathematics", rating: "4.9", lessons: "972 lessons", price: 23, color: "peach", image: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=900&q=88", location: "Palapye, Botswana", availability: ["Today · 18:30", "Tomorrow · 16:00", "Sat · 11:00"], availabilityGroups: ["Today", "Tomorrow", "Weekend"] }),
  subjectTutor({ id: "tumelo", name: "Tumelo", examination: "JCE", subject: "Social Studies", rating: "4.7", lessons: "488 lessons", price: 19, color: "blue", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=88", location: "Maun, Botswana", availability: ["Tomorrow · 18:00", "Thu · 16:30", "Sun · 14:30"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "phenyo", name: "Phenyo", examination: "JCE", subject: "English", rating: "4.9", lessons: "803 lessons", price: 22, color: "yellow", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=88", location: "Lobatse, Botswana", availability: ["Today · 17:30", "Fri · 17:00", "Sat · 10:30"], availabilityGroups: ["Today", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "onalenna", name: "Onalenna", examination: "BGCSE", subject: "Mathematics", rating: "5.0", lessons: "1,271 lessons", price: 30, color: "blue", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=88", location: "Gaborone, Botswana", availability: ["Tomorrow · 19:00", "Thu · 18:00", "Sat · 08:30"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "tapiwa", name: "Tapiwa", examination: "BGCSE", subject: "Mathematics", rating: "4.8", lessons: "890 lessons", price: 25, color: "peach", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=88", location: "Francistown, Botswana", availability: ["Today · 20:00", "Wed · 17:30", "Sun · 11:00"], availabilityGroups: ["Today", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "dineo", name: "Dineo", examination: "BGCSE", subject: "Physics", rating: "4.8", lessons: "689 lessons", price: 29, color: "yellow", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=88", location: "Gaborone, Botswana", availability: ["Tomorrow · 16:30", "Fri · 18:30", "Sat · 13:00"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "goitse", name: "Goitse", examination: "BGCSE", subject: "Chemistry", rating: "4.9", lessons: "746 lessons", price: 28, color: "blue", image: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=900&q=88", location: "Mahalapye, Botswana", availability: ["Today · 18:00", "Tomorrow · 17:00", "Sun · 15:00"], availabilityGroups: ["Today", "Tomorrow", "Weekend"] }),
  subjectTutor({ id: "tshegofatso", name: "Tshegofatso", examination: "BGCSE", subject: "Accounting", rating: "4.8", lessons: "633 lessons", price: 26, color: "peach", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=88", location: "Gaborone, Botswana", availability: ["Tomorrow · 18:30", "Thu · 17:00", "Sat · 14:00"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "olebile", name: "Olebile", examination: "BGCSE", subject: "Geography", rating: "4.7", lessons: "402 lessons", price: 23, color: "yellow", image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=88", location: "Kasane, Botswana", availability: ["Today · 16:30", "Fri · 18:00", "Sun · 09:00"], availabilityGroups: ["Today", "Weekdays", "Weekend"] }),
  subjectTutor({ id: "lesego", name: "Lesego", examination: "BGCSE", subject: "Business Studies", rating: "4.9", lessons: "577 lessons", price: 25, color: "blue", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=88", location: "Gaborone, Botswana", availability: ["Tomorrow · 17:30", "Thu · 19:00", "Sat · 15:00"], availabilityGroups: ["Tomorrow", "Weekdays", "Weekend"] })
];

export const findTutor = (id: string) => tutors.find(tutor => tutor.id === id);
