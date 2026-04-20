import dotenv from "dotenv";
import { Pool, type PoolClient, type QueryResult } from "pg";

dotenv.config();

export type RowDataPacket = Record<string, any>;

export type PoolConnection = {
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  query: <T extends RowDataPacket = RowDataPacket>(sql: string, params?: unknown[]) => Promise<[T[]]>;
  execute: (sql: string, params?: unknown[]) => Promise<[QueryResult]>;
  release: () => void;
};

type SeedCourse = {
  id: string;
  title: string;
  lessons: number;
  image: string;
  price: number;
  oldPrice: number;
  type: "free" | "premium";
  category: string;
  access_code?: string;
};

type SeedLesson = {
  id: string;
  course_id: string;
  title: string;
  duration: string;
  note_content: string;
  note_url: string;
  video_url: string;
};

type SeedNote = {
  id: string;
  title: string;
  lessons: number;
  category: string;
  type: "free" | "premium";
  url: string;
  content: string;
};

type SeedQuiz = {
  id: string;
  topic: string;
  type: "free" | "premium";
};

type SeedQuestion = {
  id: string;
  quiz_id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  image_url?: string;
};

type SeedSlider = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  sort_order: number;
  is_active: number;
};

const seedCourses: SeedCourse[] = [
  {
    id: "5",
    title: "NEET/JEE Chemistry: Organic Chemistry",
    lessons: 120,
    image: "https://images.unsplash.com/photo-1532187875605-1ef6c237ddc4?auto=format&fit=crop&w=800&q=80",
    price: 4999,
    oldPrice: 14999,
    type: "premium",
    category: "Chemistry",
  },
  {
    id: "7",
    title: "Full Chemistry Course",
    lessons: 36,
    image: "https://images.unsplash.com/photo-1532634993-15f421e42ec0?auto=format&fit=crop&w=800&q=80",
    price: 0,
    oldPrice: 0,
    type: "free",
    category: "Chemistry",
  },
  {
    id: "11",
    title: "Chemistry 2.0",
    lessons: 96,
    image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=800&q=80",
    price: 6999,
    oldPrice: 19999,
    type: "premium",
    category: "Chemistry",
  },
];

const seedLessons: SeedLesson[] = [
  {
    id: "l6",
    course_id: "7",
    title: "Atomic Structure Basics",
    duration: "19:20",
    note_content: "Study subatomic particles, atomic number, mass number, isotopes, and electronic configuration.",
    note_url: "",
    video_url: "https://www.youtube.com/embed/QoU8R9PHN5c",
  },
  {
    id: "l7",
    course_id: "7",
    title: "Periodic Table and Trends",
    duration: "23:10",
    note_content: "Learn groups, periods, valency, atomic radius, electronegativity, and metallic character trends.",
    note_url: "",
    video_url: "https://www.youtube.com/embed/0RRVV4Diomg",
  },
  {
    id: "l8",
    course_id: "7",
    title: "Acids, Bases and Salts",
    duration: "21:45",
    note_content: "Understand pH scale, indicators, neutralization, common salts, and daily-life applications.",
    note_url: "",
    video_url: "https://www.youtube.com/embed/9s3sW0nG3hE",
  },
  {
    id: "l18",
    course_id: "11",
    title: "Organic Chemistry Masterclass",
    duration: "32:15",
    note_content: "Advanced coverage of hydrocarbons, functional groups, nomenclature, and reaction pathways.",
    note_url: "",
    video_url: "https://www.youtube.com/embed/4ZBs5JxQY3Y",
  },
  {
    id: "l19",
    course_id: "11",
    title: "Electrochemistry Deep Dive",
    duration: "29:50",
    note_content: "Detailed study of redox reactions, electrolysis, cells, and electrode potentials.",
    note_url: "",
    video_url: "https://www.youtube.com/embed/5s25Pq9Wj3M",
  },
  {
    id: "l20",
    course_id: "11",
    title: "Numerical Chemistry Practice",
    duration: "27:20",
    note_content: "Practice session focused on mole concept, concentration, stoichiometry, and gas law numericals.",
    note_url: "",
    video_url: "https://www.youtube.com/embed/Gyd3C6l2NJE",
  },
];

const seedNotes: SeedNote[] = [
  {
    id: "n1",
    title: "Class 10 Chemistry Formula Sheet",
    lessons: 1,
    category: "Chemistry",
    type: "free",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf?note=chem-formula",
    content: "# Chemistry Formulas\n\n- **Molarity (M)**: moles of solute / liters of solution\n- **Molality (m)**: moles of solute / kg of solvent\n- **Ideal Gas Law**: PV = nRT\n- **pH**: -log[H+]",
  },
  {
    id: "n2",
    title: "Organic Chemistry Revision Notes",
    lessons: 1,
    category: "Chemistry",
    type: "free",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf?note=organic",
    content: "# Organic Chemistry Revision\n\n- **Functional Groups**: Identify alcohols, aldehydes, ketones, carboxylic acids, and amines.\n- **Homologous Series**: Members differ by CH2.\n- **Isomerism**: Compounds can share the same molecular formula but differ in structure.",
  },
  {
    id: "n3",
    title: "Inorganic Chemistry Quick Notes",
    lessons: 1,
    category: "Chemistry",
    type: "free",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf?note=inorganic",
    content: "# Inorganic Chemistry Quick Notes\n\n- **Periodic Trends**: Atomic size, ionization energy, electronegativity, and metallic character.\n- **Coordination Compounds**: Central metal atom with ligands.\n- **Qualitative Analysis**: Basic color, precipitate, and flame observations.",
  },
];

const seedQuizzes: SeedQuiz[] = [
  { id: "q1", topic: "Chemistry", type: "free" },
];

const seedQuestions: SeedQuestion[] = [
  {
    id: "qn1",
    quiz_id: "q1",
    text: "Which of the following is a decomposition reaction?",
    options: ["H2 + O2 -> H2O", "CaCO3 -> CaO + CO2", "Zn + HCl -> ZnCl2 + H2", "NaOH + HCl -> NaCl + H2O"],
    correctAnswer: 1,
    explanation: "Decomposition reaction is a reaction in which a single reactant breaks down into two or more products. CaCO3 -> CaO + CO2 is a classic example.",
  },
  {
    id: "qn2",
    quiz_id: "q1",
    text: "What is the pH of a neutral solution?",
    options: ["0", "14", "7", "1"],
    correctAnswer: 2,
    explanation: "A neutral solution has a pH of 7. Values below 7 are acidic, and values above 7 are basic.",
  },
  {
    id: "qn3",
    quiz_id: "q1",
    text: "Which gas is evolved when zinc reacts with dilute sulphuric acid?",
    options: ["Oxygen", "Hydrogen", "Carbon Dioxide", "Nitrogen"],
    correctAnswer: 1,
    explanation: "Zinc reacts with sulphuric acid to produce zinc sulphate and hydrogen gas (Zn + H2SO4 -> ZnSO4 + H2).",
  },
];

const seedSliders: SeedSlider[] = [
  {
    id: "sl1",
    title: "Chemistry One Shot Video",
    subtitle: "Start fast with a focused chemistry one-shot session designed for quick revision.",
    image_url: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqmdaP81MD5lfSQVNyUCJHE9FIrXTOfUWnKCTUFxE45Jx9QoEf3diojYpuDZggIrin3HGuPMTBSzn2lZmU4bz_u5tAaIxqVtZaqmrcLzOVUG4ZNDPl916cIR1XekUjbegMk2HeRWejq6SMpfJr5ontaQhhmlN1NJ7yZBClkbchUrH9-ZH9xhOGkixzVQ/s1600/oneshot%20video.png",
    sort_order: 1,
    is_active: 1,
  },
  {
    id: "sl2",
    title: "Organic Chemistry",
    subtitle: "Study reaction pathways, mechanisms, and named reactions with confidence.",
    image_url: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgwdYcwalrDhUUicjNzgFlihRBqyGSDR-6R-pzRt58tSxvGoFeBsvmcUV8VMx83zmnMeNne0R_LU0fjw5NLK1ryg-yVbzsWc0ye0h187vq09UR7Gph1PiHYeaggvkICuJ4fAzqk7KQqhd485SqYSKvhtxPfE7HLQBKCmUae9g3c0FIHYHW6e4_ur18X7Q/s1536/organic.png",
    sort_order: 2,
    is_active: 1,
  },
  {
    id: "sl3",
    title: "Inorganic Chemistry",
    subtitle: "Cover periodic trends, coordination compounds, and core inorganic concepts.",
    image_url: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjgbaKHm45THr1QiQ4mfh6oBypp8tS3_F1lV_f2fwVwgnZp54S2Vm7ZT-ch5ZBshKsc7AtiwJwwhjoMc3CZYFR8SvULf4BBgSwkjvn_JVTtOrJcJTRmF4uCUy284SVMSazNsVTLPf4lWUVSwRWIwT9Y6q9RAN01AY_MwcMYV0nCAcDrXaSVUcQf66UcTQ/s1536/inorganic.png",
    sort_order: 3,
    is_active: 1,
  },
];

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

const adaptSql = (sql: string) => {
  let adapted = sql.replace(/`([^`]+)`/g, "\"$1\"");

  adapted = adapted.replace(/\boldPrice\b/g, "\"oldPrice\"");
  adapted = adapted.replace(/\bcorrectAnswer\b/g, "\"correctAnswer\"");

  let parameterIndex = 0;
  adapted = adapted.replace(/\?/g, () => `$${++parameterIndex}`);

  return adapted;
};

const normalizeRow = <T extends RowDataPacket>(row: RowDataPacket): T => {
  const normalized = {
    ...row,
    oldPrice: row.oldPrice ?? row.oldprice,
    correctAnswer: row.correctAnswer ?? row.correctanswer,
  };

  return normalized as unknown as T;
};

const normalizeRows = <T extends RowDataPacket>(rows: RowDataPacket[]) => rows.map((row) => normalizeRow<T>(row));

const getConnectionConfig = () => {
  const url = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (url) {
    return {
      connectionString: url,
      ssl: String(process.env.SUPABASE_SSL ?? "true").toLowerCase() === "false"
        ? false
        : { rejectUnauthorized: false },
    };
  }

  const host = process.env.SUPABASE_HOST?.trim();
  const port = Number(process.env.SUPABASE_PORT || 5432);
  const user = process.env.SUPABASE_USER?.trim();
  const password = process.env.SUPABASE_PASSWORD?.trim();
  const database = process.env.SUPABASE_DATABASE?.trim();

  if (!host || !user || !database) {
    throw new Error("Supabase/Postgres connection is not configured. Set SUPABASE_DB_URL or SUPABASE_HOST, SUPABASE_USER, SUPABASE_PASSWORD, and SUPABASE_DATABASE.");
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: String(process.env.SUPABASE_SSL ?? "true").toLowerCase() === "false"
      ? false
      : { rejectUnauthorized: false },
  };
};

export const getPool = () => {
  if (!pool) {
    pool = new Pool({
      ...getConnectionConfig(),
      max: 10,
    });
  }

  return pool;
};

const runQuery = async <T extends RowDataPacket = RowDataPacket>(
  client: Pool | PoolClient,
  sql: string,
  params: unknown[] = [],
) => {
  const result = await client.query(adaptSql(sql), params);
  return normalizeRows<T>(result.rows as RowDataPacket[]);
};

const wrapClient = (client: PoolClient): PoolConnection => ({
  beginTransaction: async () => {
    await client.query("BEGIN");
  },
  commit: async () => {
    await client.query("COMMIT");
  },
  rollback: async () => {
    await client.query("ROLLBACK");
  },
  query: async <T extends RowDataPacket = RowDataPacket>(sql: string, params: unknown[] = []) => [await runQuery<T>(client, sql, params)],
  execute: async (sql: string, params: unknown[] = []) => [await client.query(adaptSql(sql), params)],
  release: () => {
    client.release();
  },
});

const seedRowsIfEmpty = async (
  client: Pool | PoolClient,
  table: string,
  rows: Record<string, unknown>[],
) => {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
  const count = Number(result.rows[0]?.count || 0);
  if (count > 0 || rows.length === 0) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map((column) => {
    if (column === "oldPrice" || column === "correctAnswer") {
      return `"${column}"`;
    }
    return `"${column}"`;
  });

  for (const row of rows) {
    const values = columns.map((column) => row[column] ?? null);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    await client.query(
      `INSERT INTO "${table}" (${quotedColumns.join(", ")}) VALUES (${placeholders})`,
      values,
    );
  }
};

const createSchema = async (client: Pool | PoolClient) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT,
      lessons INTEGER DEFAULT 0,
      image TEXT,
      price INTEGER DEFAULT 0,
      "oldPrice" INTEGER DEFAULT 0,
      type TEXT,
      category TEXT,
      access_code TEXT DEFAULT ''
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT,
      duration TEXT,
      note_content TEXT,
      note_url TEXT,
      video_url TEXT
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      lessons INTEGER DEFAULT 0,
      category TEXT,
      type TEXT DEFAULT 'free',
      url TEXT,
      content TEXT
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL
    )
  `);

  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      topic TEXT,
      type TEXT DEFAULT 'free'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS sliders (
      id TEXT PRIMARY KEY,
      title TEXT,
      subtitle TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE,
      text TEXT,
      options TEXT,
      "correctAnswer" INTEGER DEFAULT 0,
      explanation TEXT,
      image_url TEXT
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
      access_code TEXT,
      granted_at TIMESTAMPTZ,
      UNIQUE(user_id, course_id)
    )
  `);
};

const seedDatabase = async (client: Pool | PoolClient) => {
  await seedRowsIfEmpty(client, "courses", seedCourses);
  await seedRowsIfEmpty(client, "lessons", seedLessons);
  await seedRowsIfEmpty(client, "notes", seedNotes);
  await seedRowsIfEmpty(client, "quizzes", seedQuizzes);
  await seedRowsIfEmpty(
    client,
    "questions",
    seedQuestions.map((question) => ({
      ...question,
      options: JSON.stringify(question.options),
      image_url: question.image_url || "",
    })),
  );
  await seedRowsIfEmpty(client, "sliders", seedSliders);
};

export const initDatabase = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getPool();
      await createSchema(db);
      await seedDatabase(db);
    })();
  }

  await initPromise;
};

export const queryRows = async <T extends RowDataPacket = RowDataPacket>(sql: string, params: unknown[] = []) => {
  const db = getPool();
  return runQuery<T>(db, sql, params);
};

export const queryOne = async <T extends RowDataPacket = RowDataPacket>(sql: string, params: unknown[] = []) => {
  const rows = await queryRows<T>(sql, params);
  return rows[0] || null;
};

export const execute = async (sql: string, params: unknown[] = []) => {
  const db = getPool();
  return db.query(adaptSql(sql), params);
};

export const withTransaction = async <T>(handler: (connection: PoolConnection) => Promise<T>) => {
  const db = getPool();
  const client = await db.connect();
  const connection = wrapClient(client);

  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
