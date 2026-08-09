import type { ReferralRewardEvent } from "./referrals";

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

export type ExamLevel = "PSLE" | "JCE" | "BGCSE";

export type Course = {
  id: string;
  title: string;
  examination: ExamLevel;
  subject: string;
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
  appliedReferralRewardIds: string[];
  referralRewards: ReferralRewardEvent[];
};

const q = (id: string, prompt: string, options: string[], correctIndex: number): QuizQuestion => ({ id, prompt, options, correctIndex });

export const defaultCourses: Course[] = [
  {
    id: "psle-mathematics",
    title: "PSLE Mathematics Exam Readiness",
    examination: "PSLE",
    subject: "Mathematics",
    description: "Build speed and confidence in computation, application, and reasoning for Botswana PSLE Mathematics.",
    color: "#ffcf70",
    price: 140,
    instructor: "Masego T.",
    lessons: [
      {
        id: "fractions-decimals-percentages",
        title: "Fractions, decimals and percentages",
        duration: "18 min",
        description: "Convert between fractions, decimals, and percentages, then use them in familiar PSLE-style situations.",
        videoUrl: "https://www.youtube.com/embed/PSqbQXy8oq0",
        revisionTitle: "PSLE number skills revision paper",
        revisionContent: "PSLE Mathematics — Number Skills\n\n1. Simplify 18/24.\n2. Write 0.45 as a percentage.\n3. Find 25% of P240.\n4. A class has 40 learners. Three fifths are present. How many learners are present?\n\nRemember: percentage means out of 100. To find a fraction of an amount, divide by the denominator and multiply by the numerator.",
        quiz: [
          q("pm1q1", "What is 3/4 written as a percentage?", ["34%", "43%", "75%", "80%"], 2),
          q("pm1q2", "What is 20% of 150?", ["20", "30", "50", "75"], 1),
          q("pm1q3", "Which fraction is equivalent to 0.5?", ["1/5", "1/4", "1/2", "2/5"], 2)
        ]
      },
      {
        id: "measurement-and-geometry",
        title: "Measurement, perimeter and area",
        duration: "20 min",
        description: "Choose suitable units and solve perimeter and area questions with clear working.",
        videoUrl: "https://www.youtube.com/embed/AAY1bsazcgM",
        revisionTitle: "Measurement formula sheet",
        revisionContent: "Rectangle perimeter = 2 × (length + width)\nRectangle area = length × width\nSquare area = side × side\n\nPractice:\n1. Find the perimeter of a 9 cm by 5 cm rectangle.\n2. Find the area of a classroom floor measuring 8 m by 6 m.\n3. Convert 2.5 m to centimetres.",
        quiz: [
          q("pm2q1", "What is the area of a rectangle 8 cm long and 5 cm wide?", ["13 cm²", "26 cm²", "40 cm²", "80 cm²"], 2),
          q("pm2q2", "How many centimetres are in 3 metres?", ["30", "300", "3,000", "0.3"], 1)
        ]
      },
      {
        id: "multi-step-problems",
        title: "Solve multi step word problems",
        duration: "16 min",
        description: "Identify the information given, choose operations, and check whether your answer is reasonable.",
        videoUrl: "https://www.youtube.com/embed/AHk16ZOKS3E",
        revisionTitle: "Word problem strategy card",
        revisionContent: "READ — What is the question asking?\nPLAN — Which facts and operations will you use?\nSOLVE — Show one step per line.\nCHECK — Estimate and label your final answer.\n\nPractice: A school buys 24 boxes of pencils. Each box contains 12 pencils. The pencils are shared equally among 8 classes. How many pencils does each class receive?",
        quiz: [
          q("pm3q1", "A shop packs 6 oranges in each bag. How many bags are needed for 54 oranges?", ["8", "9", "48", "60"], 1),
          q("pm3q2", "Which step should come first when solving a word problem?", ["Guess the answer", "Read what is being asked", "Choose the largest number", "Ignore the units"], 1)
        ]
      }
    ]
  },
  {
    id: "psle-science",
    title: "PSLE Science Core Concepts",
    examination: "PSLE",
    subject: "Science",
    description: "Revise scientific knowledge and practise applying it to everyday Botswana contexts.",
    color: "#b8efc5",
    price: 125,
    instructor: "Kagiso R.",
    lessons: [
      {
        id: "water-cycle",
        title: "The water cycle and weather",
        duration: "15 min",
        description: "Trace evaporation, condensation, precipitation, and collection through the water cycle.",
        videoUrl: "https://www.youtube.com/embed/al-do-HGuIk",
        revisionTitle: "Water cycle labelled revision",
        revisionContent: "Evaporation: liquid water changes to water vapour.\nCondensation: water vapour cools and forms tiny droplets.\nPrecipitation: water falls as rain, hail, or snow.\nCollection: water gathers in rivers, dams, lakes, and the ground.\n\nDraw the cycle and label all four processes.",
        quiz: [
          q("ps1q1", "Which process changes liquid water into water vapour?", ["Condensation", "Evaporation", "Precipitation", "Collection"], 1),
          q("ps1q2", "Cloud droplets form mainly through…", ["condensation", "melting", "freezing", "filtration"], 0)
        ]
      },
      {
        id: "forces-and-energy",
        title: "Forces, movement and energy",
        duration: "17 min",
        description: "Recognise pushes, pulls, friction, gravity, and common energy changes.",
        videoUrl: "https://www.youtube.com/embed/fo_pmp5rtzo",
        revisionTitle: "Forces and energy practice",
        revisionContent: "A force is a push or pull.\nGravity pulls objects towards Earth.\nFriction opposes movement between surfaces.\nEnergy may change form, for example electrical energy to light and heat in a bulb.\n\nPractice: Explain why a bicycle slows down when the rider stops pedalling.",
        quiz: [
          q("ps2q1", "Which force pulls objects towards Earth?", ["Magnetism", "Friction", "Gravity", "Upthrust"], 2),
          q("ps2q2", "Friction usually acts…", ["in the direction of motion", "against motion", "only in water", "only on metal"], 1)
        ]
      }
    ]
  },
  {
    id: "jce-general-science",
    title: "JCE General Science Essentials",
    examination: "JCE",
    subject: "General Science",
    description: "Connect biology, chemistry, and physics ideas with JCE-style explanations and data questions.",
    color: "#aee4ff",
    price: 180,
    instructor: "Thabo K.",
    lessons: [
      {
        id: "cells-and-systems",
        title: "Cells, tissues and body systems",
        duration: "22 min",
        description: "Compare plant and animal cells and link specialised structures to their functions.",
        videoUrl: "https://www.youtube.com/embed/24YMQ9GvLss",
        revisionTitle: "JCE cell structure revision paper",
        revisionContent: "Both plant and animal cells contain a cell membrane, cytoplasm, and nucleus. Plant cells also have a cellulose cell wall, a large permanent vacuole, and may contain chloroplasts.\n\nPractice:\n1. State the function of the nucleus.\n2. Explain why palisade cells contain many chloroplasts.\n3. Arrange these from smallest to largest: organ, cell, organism, tissue.",
        quiz: [
          q("jg1q1", "Which structure controls activities inside a cell?", ["Nucleus", "Cell wall", "Vacuole", "Cytoplasm"], 0),
          q("jg1q2", "Which structure is present in plant cells but not animal cells?", ["Cell membrane", "Nucleus", "Cell wall", "Cytoplasm"], 2),
          q("jg1q3", "A group of similar cells working together forms a…", ["tissue", "system", "organism", "molecule"], 0)
        ]
      },
      {
        id: "matter-and-particles",
        title: "Matter and the particle model",
        duration: "19 min",
        description: "Use the particle model to explain solids, liquids, gases, diffusion, and changes of state.",
        videoUrl: "https://www.youtube.com/embed/21CR01rlmv4",
        revisionTitle: "Particle model summary",
        revisionContent: "Solid: particles are closely packed and vibrate in fixed positions.\nLiquid: particles remain close but move past one another.\nGas: particles are far apart and move rapidly in all directions.\n\nUse particle ideas to explain why the smell of cooking spreads through a house.",
        quiz: [
          q("jg2q1", "In which state are particles far apart and moving rapidly?", ["Solid", "Liquid", "Gas", "Crystal"], 2),
          q("jg2q2", "The change from liquid to gas at the surface is called…", ["freezing", "condensation", "evaporation", "melting"], 2)
        ]
      }
    ]
  },
  {
    id: "jce-mathematics",
    title: "JCE Mathematics Problem Solving",
    examination: "JCE",
    subject: "Mathematics",
    description: "Strengthen algebra, ratio, graphs, and clear mathematical reasoning for the JCE examination.",
    color: "#e0c8ff",
    price: 165,
    instructor: "Lorato P.",
    lessons: [
      {
        id: "linear-equations",
        title: "Linear equations and substitution",
        duration: "21 min",
        description: "Collect like terms, solve equations, and verify solutions by substitution.",
        videoUrl: "https://www.youtube.com/embed/9IUEk9fn2Vs",
        revisionTitle: "JCE algebra drill",
        revisionContent: "Keep an equation balanced by performing the same operation on both sides.\n\nSolve:\n1. x + 7 = 19\n2. 3x = 27\n3. 2x + 5 = 17\n4. If y = 3x - 2, find y when x = 5.",
        quiz: [
          q("jm1q1", "Solve 3x + 2 = 17.", ["x = 3", "x = 5", "x = 6", "x = 15"], 1),
          q("jm1q2", "If y = 2x + 1 and x = 4, what is y?", ["6", "8", "9", "12"], 2)
        ]
      },
      {
        id: "ratio-and-proportion",
        title: "Ratio, rate and proportion",
        duration: "18 min",
        description: "Simplify ratios and solve direct-proportion problems using unit rates.",
        videoUrl: "https://www.youtube.com/embed/USmit5zUGas",
        revisionTitle: "Ratio and proportion paper",
        revisionContent: "Simplify a ratio by dividing every part by the highest common factor.\n\nPractice:\n1. Simplify 18:24.\n2. If 4 notebooks cost 36 credits, find the cost of 7 notebooks.\n3. Share 280 in the ratio 3:4.",
        quiz: [
          q("jm2q1", "Simplify the ratio 12:18.", ["2:3", "3:2", "6:9", "4:9"], 0),
          q("jm2q2", "If 5 pens cost 20 credits, what is the cost of one pen?", ["2 credits", "4 credits", "5 credits", "15 credits"], 1)
        ]
      }
    ]
  },
  {
    id: "bgcse-mathematics",
    title: "BGCSE Mathematics Paper Skills",
    examination: "BGCSE",
    subject: "Mathematics",
    description: "Practise the algebra, geometry, and statistics methods needed for confident BGCSE responses.",
    color: "#ffb6b0",
    price: 220,
    instructor: "Onalenna B.",
    lessons: [
      {
        id: "quadratic-expressions",
        title: "Factorise and solve quadratics",
        duration: "24 min",
        description: "Factorise quadratic expressions and use the zero-product rule to find solutions.",
        videoUrl: "https://www.youtube.com/embed/ZBalWWHYFQc",
        revisionTitle: "BGCSE quadratics practice paper",
        revisionContent: "To factorise x² + bx + c, find two numbers whose product is c and sum is b.\n\nPractice:\n1. Factorise x² + 7x + 12.\n2. Solve x² - 5x + 6 = 0.\n3. Expand (x - 4)(x + 2).\n\nAlways substitute your solutions back into the original equation to check.",
        quiz: [
          q("bm1q1", "Which is the factorised form of x² + 5x + 6?", ["(x + 1)(x + 6)", "(x + 2)(x + 3)", "(x - 2)(x - 3)", "(x + 5)(x + 1)"], 1),
          q("bm1q2", "What are the solutions of x² - 9 = 0?", ["x = 9 only", "x = 3 only", "x = -3 only", "x = 3 or x = -3"], 3)
        ]
      },
      {
        id: "statistics-and-probability",
        title: "Statistics and probability",
        duration: "23 min",
        description: "Calculate averages, interpret data displays, and express simple probabilities correctly.",
        videoUrl: "https://www.youtube.com/embed/uhxtUt_-GyM",
        revisionTitle: "Data handling formula sheet",
        revisionContent: "Mean = sum of values ÷ number of values\nMedian = middle value after ordering\nMode = most frequent value\nRange = highest value - lowest value\nProbability = favourable outcomes ÷ total possible outcomes\n\nPractice with: 4, 7, 7, 8, 9.",
        quiz: [
          q("bm2q1", "What is the mean of 4, 6 and 8?", ["4", "6", "8", "18"], 1),
          q("bm2q2", "A fair die is rolled. What is the probability of rolling a 6?", ["1/2", "1/3", "1/6", "6"], 2)
        ]
      }
    ]
  },
  {
    id: "bgcse-biology",
    title: "BGCSE Biology Core Revision",
    examination: "BGCSE",
    subject: "Biology",
    description: "Turn key biological processes into precise, exam-ready explanations and labelled diagrams.",
    color: "#8ee3d2",
    price: 210,
    instructor: "Keneilwe S.",
    lessons: [
      {
        id: "cell-structure",
        title: "Cell structure and organisation",
        duration: "20 min",
        description: "Identify cell structures and explain how specialised cells are adapted to their functions.",
        videoUrl: "https://www.youtube.com/embed/5KfHxF6Vhps",
        revisionTitle: "BGCSE cell biology revision paper",
        revisionContent: "Review cell membrane, cytoplasm, nucleus, mitochondria, ribosomes, cell wall, chloroplasts, and vacuoles.\n\nExam practice:\n1. Compare a plant cell with an animal cell.\n2. Explain two adaptations of a root hair cell.\n3. Describe the levels of organisation from cell to organism.",
        quiz: [
          q("bb1q1", "Where does aerobic respiration mainly occur?", ["Nucleus", "Mitochondrion", "Ribosome", "Cell wall"], 1),
          q("bb1q2", "Which structure controls movement of substances into and out of a cell?", ["Cell membrane", "Vacuole", "Nucleus", "Chloroplast"], 0)
        ]
      },
      {
        id: "genetics-and-inheritance",
        title: "Genetics and inheritance",
        duration: "25 min",
        description: "Use key genetic terms and simple inheritance diagrams to predict offspring characteristics.",
        videoUrl: "https://www.youtube.com/embed/CBezq1fFUEA",
        revisionTitle: "Inheritance terminology sheet",
        revisionContent: "Gene: a section of DNA that influences a characteristic.\nAllele: an alternative form of a gene.\nGenotype: the alleles an organism has.\nPhenotype: the observable characteristic.\n\nPractice a monohybrid cross where T is dominant for tall plants and t is recessive for short plants.",
        quiz: [
          q("bb2q1", "An alternative form of a gene is called an…", ["allele", "organ", "enzyme", "antibody"], 0),
          q("bb2q2", "Which term describes the observable characteristic of an organism?", ["Genotype", "Phenotype", "Chromosome", "Mutation"], 1)
        ]
      }
    ]
  }
];

export const initialLmsState: LmsState = {
  credits: 850,
  courses: defaultCourses,
  purchasedCourseIds: ["psle-mathematics"],
  completedLessonIds: [],
  quizScores: {},
  appliedReferralRewardIds: [],
  referralRewards: [],
  transactions: [
    { id: "welcome-credit", type: "topup", label: "Studacad demo wallet funded", amount: 850, createdAt: new Date().toISOString() }
  ]
};

export const credit = (amount: number) => `${amount.toLocaleString()} credits`;
