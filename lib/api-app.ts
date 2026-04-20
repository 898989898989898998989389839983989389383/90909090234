import express from "express";
import { del, put } from "@vercel/blob";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import type { PoolConnection, RowDataPacket } from "./mysql";
import { execute, initDatabase, queryOne, queryRows, withTransaction } from "./mysql";

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
const ADMIN_USERS_RESOURCE_URL = "https://script.google.com/macros/s/AKfycbzj7_sa1S9oB2HEJbG6BzzCMK1GC9OYRDdw-0G9wDRJqMQexbEVvhPBSHWaASewOzEF_A/exec?resource=users";
const uploadRoot = process.env.VERCEL
  ? path.join(os.tmpdir(), "rbs-academy-uploads")
  : path.join(process.cwd(), "uploads");
const sliderUploadDir = path.join(uploadRoot, "sliders");
const questionUploadDir = path.join(uploadRoot, "questions");

fs.mkdirSync(sliderUploadDir, { recursive: true });
fs.mkdirSync(questionUploadDir, { recursive: true });

type DbUser = RowDataPacket & { id: string; name: string; email: string; phone: string; password: string };
type DbCourse = RowDataPacket & { id: string; title: string; lessons: number; image: string; price: number; oldPrice: number; type: string; category: string; access_code?: string };
type DbLesson = RowDataPacket & { id: string; course_id: string; title: string; duration: string; note_content: string; note_url?: string; video_url?: string };
type DbNote = RowDataPacket & { id: string; title: string; lessons: number; category: string; type: string; url?: string; content?: string };
type DbQuiz = RowDataPacket & { id: string; topic: string; type: string };
type DbQuestion = RowDataPacket & { id: string; quiz_id: string; text: string; options: string; correctAnswer: number; explanation: string; image_url?: string };
type DbSlider = RowDataPacket & { id: string; title: string; subtitle: string; image_url: string; sort_order: number; is_active: number | boolean };

const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);

const createId = (prefix: string) => `${prefix}${Date.now()}${randomUUID().replace(/-/g, "").slice(0, 8)}`;

const isValidStudentName = (value: string) => /^[A-Za-z][A-Za-z\s.'-]*$/.test(value.trim());
const normalizePhoneNumber = (value: string) => value.replace(/\D/g, "");
const createAccessCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `RBS-${chunk()}-${chunk()}`;
};

const parseJsonArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(String(value || "[]"));
  } catch {
    return [];
  }
};

const normalizeQuestion = (question: Partial<DbQuestion> & { options?: unknown }) => ({
  ...question,
  options: parseJsonArray(question.options).map((option) => String(option)),
  correctAnswer: Number(question.correctAnswer || 0),
  image_url: String(question.image_url || ""),
  explanation: String(question.explanation || ""),
});

const normalizeSlider = (slider: Partial<DbSlider>) => ({
  ...slider,
  sort_order: Number(slider.sort_order || 0),
  is_active: Boolean(slider.is_active),
});

const parseImagePayload = (
  payload: Record<string, unknown>,
  options: { dataKey?: string; urlKeys?: string[] } = {},
) => {
  const dataKey = options.dataKey || "imageData";
  const urlKeys = options.urlKeys || ["image_url"];
  const imageData = typeof payload[dataKey] === "string" ? String(payload[dataKey]).trim() : "";
  const imageUrl = urlKeys
    .map((key) => (typeof payload[key] === "string" ? String(payload[key]).trim() : ""))
    .find(Boolean) || "";

  if (!imageData) {
    return { imageData: "", imageUrl, mimeType: "" };
  }

  const matches = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    return { imageData: "", imageUrl, mimeType: "" };
  }

  return {
    imageData: matches[2],
    imageUrl,
    mimeType: matches[1].toLowerCase(),
  };
};

const getImageExtension = (mimeType: string) =>
  mimeType === "image/png" ? ".png"
  : mimeType === "image/webp" ? ".webp"
  : mimeType === "image/gif" ? ".gif"
  : ".jpg";

const saveImageLocally = (dir: string, prefix: string, imageData: string, mimeType: string) => {
  const extension = getImageExtension(mimeType);
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, Buffer.from(imageData, "base64"));
  return `/uploads/${path.basename(dir)}/${fileName}`;
};

const saveSliderImage = async (payload: Record<string, unknown>) => {
  const { imageData, imageUrl, mimeType } = parseImagePayload(payload);
  if (!imageData) {
    return imageUrl;
  }

  if (BLOB_READ_WRITE_TOKEN) {
    const uploaded = await put(`sliders/slider-${Date.now()}${getImageExtension(mimeType)}`, Buffer.from(imageData, "base64"), {
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
      token: BLOB_READ_WRITE_TOKEN,
    });
    return uploaded.url;
  }

  return saveImageLocally(sliderUploadDir, "slider", imageData, mimeType);
};

const saveQuestionImage = async (payload: Record<string, unknown>) => {
  const { imageData, imageUrl, mimeType } = parseImagePayload(payload, {
    dataKey: "questionImageData",
    urlKeys: ["image_url", "imageUrl", "questionImage"],
  });

  if (!imageData) {
    return imageUrl;
  }

  if (BLOB_READ_WRITE_TOKEN) {
    const uploaded = await put(`questions/question-${Date.now()}${getImageExtension(mimeType)}`, Buffer.from(imageData, "base64"), {
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
      token: BLOB_READ_WRITE_TOKEN,
    });
    return uploaded.url;
  }

  return saveImageLocally(questionUploadDir, "question", imageData, mimeType);
};

const deleteStoredImage = async (imageUrl?: string, localPrefix = "/uploads/") => {
  if (!imageUrl) {
    return;
  }

  if (imageUrl.includes(".blob.vercel-storage.com/") && BLOB_READ_WRITE_TOKEN) {
    try {
      await del(imageUrl, { token: BLOB_READ_WRITE_TOKEN });
    } catch {}
    return;
  }

  if (!imageUrl.startsWith(localPrefix)) {
    return;
  }

  const filePath = path.join(uploadRoot, imageUrl.replace(/^\/uploads\//, ""));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const getGrantedCourseIds = async (userId: string) => {
  const rows = await queryRows<RowDataPacket & { course_id: string }>(
    "SELECT course_id FROM enrollments WHERE user_id = ? ORDER BY granted_at DESC, id DESC",
    [userId],
  );
  return rows.map((item) => String(item.course_id || "").trim()).filter(Boolean);
};

const normalizeUser = async (user: Pick<DbUser, "id" | "name" | "email" | "phone">) => ({
  id: String(user.id),
  name: String(user.name || ""),
  email: String(user.email || ""),
  phone: String(user.phone || ""),
  grantedCourseIds: await getGrantedCourseIds(String(user.id)),
});

const extractUsersPayload = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.users)) return record.users;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
};

const fetchJsonWithTimeout = async (url: string, timeoutMs = 1000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const getImportedQuestionSource = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  const record = (payload && typeof payload === "object" ? payload : {}) as {
    questions?: unknown[];
    quiz?: { questions?: unknown[] };
    data?: { questions?: unknown[] };
  };
  return record.questions || record.quiz?.questions || record.data?.questions || [];
};

const getImportedQuestionOptions = (record: Record<string, unknown>) => {
  if (Array.isArray(record.options)) {
    return record.options.map((option) => String(option).trim()).filter(Boolean);
  }
  return [
    record.option1,
    record.option2,
    record.option3,
    record.option4,
    record.option5,
    record.a,
    record.b,
    record.c,
    record.d,
    record.e,
  ].map((value) => String(value || "").trim()).filter(Boolean);
};

const normalizeImportedQuestions = (payload: unknown) => {
  const source = getImportedQuestionSource(payload);
  if (source.length === 0) {
    throw new Error("Questions array is required");
  }

  return source.map((item, index) => {
    const record = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const text = String(record.text || record.question || record.title || "").trim();
    const options = getImportedQuestionOptions(record);
    const explanation = String(record.explanation || "").trim();
    const image_url = String(record.image_url || record.imageUrl || record.image || record.questionImage || "").trim();
    const answerValue = record.correctAnswer ?? record.answer ?? record.correct_option ?? record.correctOption ?? record.correct ?? 0;

    let correctAnswer = 0;
    if (typeof answerValue === "number" && Number.isFinite(answerValue)) {
      correctAnswer = answerValue;
    } else {
      const normalizedAnswer = String(answerValue).trim();
      const normalizedLetter = normalizedAnswer.toUpperCase();
      if (/^[A-E]$/.test(normalizedLetter)) {
        correctAnswer = normalizedLetter.charCodeAt(0) - 65;
      } else {
        const optionIndex = options.findIndex((option) => option.toLowerCase() === normalizedAnswer.toLowerCase());
        correctAnswer = optionIndex >= 0 ? optionIndex : Number(normalizedAnswer) || 0;
      }
    }

    if (correctAnswer >= options.length && correctAnswer - 1 < options.length) {
      correctAnswer -= 1;
    }

    if (!text || options.length < 2 || correctAnswer < 0 || correctAnswer >= options.length) {
      throw new Error(`Invalid question at position ${index + 1}`);
    }

    return {
      id: createId("qn"),
      text,
      options,
      correctAnswer,
      explanation,
      image_url,
    };
  });
};

const removeQuestionById = async (id: string, connection?: PoolConnection) => {
  const current = connection
    ? await connection.query<DbQuestion>("SELECT * FROM questions WHERE id = ?", [id]).then(([rows]) => rows[0] || null)
    : await queryOne<DbQuestion>("SELECT * FROM questions WHERE id = ?", [id]);
  if (!current) {
    return false;
  }

  await deleteStoredImage(current.image_url, "/uploads/questions/");
  if (connection) {
    await connection.execute("DELETE FROM questions WHERE id = ?", [id]);
  } else {
    await execute("DELETE FROM questions WHERE id = ?", [id]);
  }
  return true;
};

const removeQuestionsForQuiz = async (quizId: string, connection?: PoolConnection) => {
  const rows = connection
    ? await connection.query<RowDataPacket>("SELECT id FROM questions WHERE quiz_id = ?", [quizId]).then(([result]) => result)
    : await queryRows<RowDataPacket>("SELECT id FROM questions WHERE quiz_id = ?", [quizId]);
  for (const question of rows) {
    await removeQuestionById(String(question.id), connection);
  }
};

export const createApiApp = async () => {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: "12mb" }));
  app.use("/uploads", express.static(uploadRoot));

  app.post("/api/signup", asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body || {};
    const trimmedName = String(name || "").trim();
    const normalizedPhone = normalizePhoneNumber(String(phone || ""));

    if (!trimmedName || !email || !password || !normalizedPhone) {
      res.status(400).json({ success: false, message: "All fields are required" });
      return;
    }

    if (!isValidStudentName(trimmedName)) {
      res.status(400).json({ success: false, message: "Name must contain letters only" });
      return;
    }

    if (normalizedPhone.length < 10) {
      res.status(400).json({ success: false, message: "Valid phone number is required" });
      return;
    }

    const existingUser = await queryOne<DbUser>("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser) {
      res.status(409).json({ success: false, message: "Email already registered" });
      return;
    }

    const id = `u${Date.now()}`;
    await execute("INSERT INTO users (id, name, email, phone, password) VALUES (?, ?, ?, ?, ?)", [id, trimmedName, email, normalizedPhone, password]);
    res.status(201).json({ success: true, user: { id, name: trimmedName, email, phone: normalizedPhone } });
  }));

  app.post("/api/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required" });
      return;
    }

    const user = await queryOne<DbUser>("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || user.password !== password) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        grantedCourseIds: await getGrantedCourseIds(String(user.id)),
      },
    });
  }));

  app.get("/api/courses", asyncHandler(async (_req, res) => {
    const courses = await queryRows<DbCourse>("SELECT * FROM courses");
    const lessons = await queryRows<DbLesson>("SELECT * FROM lessons");
    const result = courses.map((course) => ({
      ...course,
      lessonList: lessons.filter((lesson) => String(lesson.course_id) === String(course.id)),
    }));
    res.json(result);
  }));

  app.get("/api/notes", asyncHandler(async (_req, res) => {
    res.json(await queryRows<DbNote>("SELECT * FROM notes"));
  }));

  app.get("/api/quizzes", asyncHandler(async (_req, res) => {
    const quizzes = await queryRows<DbQuiz>("SELECT * FROM quizzes");
    const questions = await queryRows<DbQuestion>("SELECT * FROM questions");
    res.json(
      quizzes.map((quiz) => ({
        ...quiz,
        questions: questions.filter((question) => String(question.quiz_id) === String(quiz.id)).map(normalizeQuestion),
      })),
    );
  }));

  app.get("/api/users", asyncHandler(async (_req, res) => {
    const users = await queryRows<DbUser>("SELECT id, name, email, phone FROM users ORDER BY name ASC, id ASC");
    const normalized = await Promise.all(users.map((user) => normalizeUser(user)));
    res.json(normalized);
  }));

  app.get("/api/admin-users", asyncHandler(async (_req, res) => {
    const users = await queryRows<DbUser>("SELECT id, name, email, phone FROM users ORDER BY name ASC, id ASC");
    const normalized = await Promise.all(users.map((user) => normalizeUser(user)));
    if (normalized.length > 0) {
      res.json(normalized);
      return;
    }

    try {
      const payload = await fetchJsonWithTimeout(ADMIN_USERS_RESOURCE_URL);
      const externalUsers = extractUsersPayload(payload);
      if (Array.isArray(externalUsers) && externalUsers.length > 0) {
        res.json(externalUsers);
        return;
      }
    } catch {}

    res.json(normalized);
  }));

  app.get("/api/sliders", asyncHandler(async (_req, res) => {
    const sliders = await queryRows<DbSlider>("SELECT * FROM sliders ORDER BY sort_order ASC, id ASC");
    res.json(sliders.map(normalizeSlider));
  }));

  app.post("/api/createSlider", asyncHandler(async (req, res) => {
    const { title, subtitle, sort_order, is_active } = req.body || {};
    const imageUrl = await saveSliderImage(req.body || {});
    if (!title || !subtitle) {
      res.status(400).json({ success: false, message: "Title and subtitle are required" });
      return;
    }
    if (!imageUrl) {
      res.status(400).json({ success: false, message: "Slider image is required" });
      return;
    }

    const id = `sl${Date.now()}`;
    await execute(
      "INSERT INTO sliders (id, title, subtitle, image_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [id, title, subtitle, imageUrl, Number(sort_order || 0), String(is_active) === "false" ? 0 : 1],
    );

    const slider = await queryOne<DbSlider>("SELECT * FROM sliders WHERE id = ?", [id]);
    res.status(201).json({ success: true, slider: normalizeSlider(slider || {}) });
  }));

  app.post("/api/updateSlider", asyncHandler(async (req, res) => {
    const { id, title, subtitle, sort_order, is_active } = req.body || {};
    if (!id || !title || !subtitle) {
      res.status(400).json({ success: false, message: "Id, title and subtitle are required" });
      return;
    }

    const current = await queryOne<DbSlider>("SELECT * FROM sliders WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Slider not found" });
      return;
    }

    const imageUrl = (await saveSliderImage(req.body || {})) || current.image_url;
    if (imageUrl !== current.image_url) {
      await deleteStoredImage(current.image_url, "/uploads/sliders/");
    }

    await execute(
      "UPDATE sliders SET title = ?, subtitle = ?, image_url = ?, sort_order = ?, is_active = ? WHERE id = ?",
      [title, subtitle, imageUrl, Number(sort_order || 0), String(is_active) === "false" ? 0 : 1, id],
    );

    const slider = await queryOne<DbSlider>("SELECT * FROM sliders WHERE id = ?", [id]);
    res.json({ success: true, message: "Slider updated", slider: normalizeSlider(slider || {}) });
  }));

  app.post("/api/deleteSlider", asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ success: false, message: "Slider id is required" });
      return;
    }
    const current = await queryOne<DbSlider>("SELECT * FROM sliders WHERE id = ?", [id]);
    await deleteStoredImage(current?.image_url, "/uploads/sliders/");
    await execute("DELETE FROM sliders WHERE id = ?", [id]);
    res.json({ success: true, message: "Slider deleted" });
  }));

  app.post("/api/createCourse", asyncHandler(async (req, res) => {
    const { title, lessons, image, price, oldPrice, type, category, access_code } = req.body || {};
    if (!title || !image || !type || !category) {
      res.status(400).json({ success: false, message: "Title, image, type, and category are required" });
      return;
    }

    const id = createId("c");
    await execute(
      "INSERT INTO courses (id, title, lessons, image, price, oldPrice, type, category, access_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, Number(lessons || 0), image, Number(price || 0), Number(oldPrice || 0), type, category, access_code || ""],
    );

    const course = await queryOne<DbCourse>("SELECT * FROM courses WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "Course created", course });
  }));

  app.post("/api/updateCourse", asyncHandler(async (req, res) => {
    const { id, title, lessons, image, price, oldPrice, type, category, access_code } = req.body || {};
    if (!id || !title || !image || !type || !category) {
      res.status(400).json({ success: false, message: "Id, title, image, type, and category are required" });
      return;
    }

    const current = await queryOne<DbCourse>("SELECT * FROM courses WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Course not found" });
      return;
    }

    await execute(
      "UPDATE courses SET title = ?, lessons = ?, image = ?, price = ?, oldPrice = ?, type = ?, category = ?, access_code = ? WHERE id = ?",
      [title, Number(lessons || 0), image, Number(price || 0), Number(oldPrice || 0), type, category, access_code ?? current.access_code ?? "", id],
    );

    res.json({ success: true, message: "Course updated" });
  }));

  app.post("/api/deleteCourse", asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ success: false, message: "Course id is required" });
      return;
    }

    const current = await queryOne<DbCourse>("SELECT id FROM courses WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Course not found" });
      return;
    }

    await withTransaction(async (connection) => {
      await connection.execute("DELETE FROM lessons WHERE course_id = ?", [id]);
      await connection.execute("DELETE FROM enrollments WHERE course_id = ?", [id]);
      await connection.execute("DELETE FROM courses WHERE id = ?", [id]);
    });

    res.json({ success: true, message: "Course deleted" });
  }));

  app.post("/api/updateCourseAccess", asyncHandler(async (req, res) => {
    const { courseId, accessCode } = req.body || {};
    if (!courseId) {
      res.status(400).json({ success: false, message: "Course id is required" });
      return;
    }

    const current = await queryOne<DbCourse>("SELECT * FROM courses WHERE id = ?", [courseId]);
    if (!current) {
      res.status(404).json({ success: false, message: "Course not found" });
      return;
    }

    await execute("UPDATE courses SET access_code = ? WHERE id = ?", [String(accessCode || "").toUpperCase(), courseId]);
    res.json({ success: true, message: "Access code updated" });
  }));

  app.post("/api/grantCourseAccess", asyncHandler(async (req, res) => {
    const { userId, courseId, accessCode } = req.body || {};
    if (!userId || !courseId) {
      res.status(400).json({ success: false, message: "User id and course id are required" });
      return;
    }

    const user = await queryOne<DbUser>("SELECT id FROM users WHERE id = ?", [userId]);
    if (!user) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const course = await queryOne<DbCourse>("SELECT id, type FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      res.status(404).json({ success: false, message: "Course not found" });
      return;
    }

    if (String(course.type || "").toLowerCase() !== "premium") {
      res.status(400).json({ success: false, message: "Only premium courses require generated access codes" });
      return;
    }

    const generatedCode = String(accessCode || createAccessCode()).trim().toUpperCase();
    const existing = await queryOne<RowDataPacket & { id: string }>("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?", [userId, courseId]);

    if (existing) {
      await execute("UPDATE enrollments SET access_code = ?, granted_at = ? WHERE id = ?", [generatedCode, new Date(), existing.id]);
      res.json({ success: true, message: "Course access granted", accessCode: generatedCode });
      return;
    }

    await execute(
      "INSERT INTO enrollments (id, user_id, course_id, access_code, granted_at) VALUES (?, ?, ?, ?, ?)",
      [createId("en"), userId, courseId, generatedCode, new Date()],
    );
    res.json({ success: true, message: "Course access granted", accessCode: generatedCode });
  }));

  app.post("/api/verifyCourseAccess", asyncHandler(async (req, res) => {
    const { courseId, accessCode, userId } = req.body || {};
    if (!courseId || !accessCode || !userId) {
      res.status(400).json({ success: false, message: "Course id, user id and access code are required" });
      return;
    }

    const course = await queryOne<DbCourse>("SELECT * FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      res.status(404).json({ success: false, message: "Course not found" });
      return;
    }
    if (course.type !== "premium") {
      res.json({ success: true, message: "Course unlocked" });
      return;
    }

    const enrollment = await queryOne<RowDataPacket & { access_code: string }>(
      "SELECT access_code FROM enrollments WHERE user_id = ? AND course_id = ?",
      [userId, courseId],
    );
    const expectedCode = String(enrollment?.access_code || "").toUpperCase();
    if (!expectedCode || expectedCode !== String(accessCode).toUpperCase()) {
      res.status(401).json({ success: false, message: "Invalid access code" });
      return;
    }

    res.json({ success: true, message: "Course unlocked" });
  }));

  app.post("/api/createLesson", asyncHandler(async (req, res) => {
    const { course_id, title, duration, note_content, note_url, video_url } = req.body || {};
    if (!course_id || !title) {
      res.status(400).json({ success: false, message: "Course and lesson title are required" });
      return;
    }

    const id = createId("l");
    await execute(
      "INSERT INTO lessons (id, course_id, title, duration, note_content, note_url, video_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, course_id, title, duration || "", note_content || "", note_url || "", video_url || ""],
    );
    res.status(201).json({ success: true, message: "Lesson created" });
  }));

  app.post("/api/updateLesson", asyncHandler(async (req, res) => {
    const { id, course_id, title, duration, note_content, note_url, video_url } = req.body || {};
    if (!id || !course_id || !title) {
      res.status(400).json({ success: false, message: "Id, course, and lesson title are required" });
      return;
    }

    const current = await queryOne<DbLesson>("SELECT * FROM lessons WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Lesson not found" });
      return;
    }

    await execute(
      "UPDATE lessons SET course_id = ?, title = ?, duration = ?, note_content = ?, note_url = ?, video_url = ? WHERE id = ?",
      [course_id, title, duration || "", note_content || "", note_url || "", video_url || "", id],
    );
    res.json({ success: true, message: "Lesson updated" });
  }));

  app.post("/api/deleteLesson", asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ success: false, message: "Lesson id is required" });
      return;
    }
    await execute("DELETE FROM lessons WHERE id = ?", [id]);
    res.json({ success: true, message: "Lesson deleted" });
  }));

  app.post("/api/createNote", asyncHandler(async (req, res) => {
    const { title, lessons, category, type, url, content } = req.body || {};
    if (!title || !category) {
      res.status(400).json({ success: false, message: "Title and category are required" });
      return;
    }

    const id = createId("n");
    await execute(
      "INSERT INTO notes (id, title, lessons, category, type, url, content) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, title, Number(lessons || 0), category, type || "free", url || "", content || ""],
    );
    res.status(201).json({ success: true, message: "Note created" });
  }));

  app.post("/api/updateNote", asyncHandler(async (req, res) => {
    const { id, title, lessons, category, type, url, content } = req.body || {};
    if (!id || !title || !category) {
      res.status(400).json({ success: false, message: "Id, title, and category are required" });
      return;
    }

    const current = await queryOne<DbNote>("SELECT * FROM notes WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Note not found" });
      return;
    }

    await execute(
      "UPDATE notes SET title = ?, lessons = ?, category = ?, type = ?, url = ?, content = ? WHERE id = ?",
      [title, Number(lessons || 0), category, type || "free", url || "", content || "", id],
    );
    res.json({ success: true, message: "Note updated" });
  }));

  app.post("/api/deleteNote", asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ success: false, message: "Note id is required" });
      return;
    }
    await execute("DELETE FROM notes WHERE id = ?", [id]);
    res.json({ success: true, message: "Note deleted" });
  }));

  app.post("/api/createQuiz", asyncHandler(async (req, res) => {
    const { topic, type } = req.body || {};
    if (!topic) {
      res.status(400).json({ success: false, message: "Quiz topic is required" });
      return;
    }
    const id = createId("q");
    await execute("INSERT INTO quizzes (id, topic, type) VALUES (?, ?, ?)", [id, topic, type || "free"]);
    res.status(201).json({ success: true, message: "Quiz created" });
  }));

  app.post("/api/updateQuiz", asyncHandler(async (req, res) => {
    const { id, topic, type } = req.body || {};
    if (!id || !topic) {
      res.status(400).json({ success: false, message: "Id and topic are required" });
      return;
    }
    const current = await queryOne<DbQuiz>("SELECT * FROM quizzes WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    await execute("UPDATE quizzes SET topic = ?, type = ? WHERE id = ?", [topic, type || "free", id]);
    res.json({ success: true, message: "Quiz updated" });
  }));

  app.post("/api/deleteQuiz", asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ success: false, message: "Quiz id is required" });
      return;
    }
    await withTransaction(async (connection) => {
      await removeQuestionsForQuiz(id, connection);
      await connection.execute("DELETE FROM quizzes WHERE id = ?", [id]);
    });
    res.json({ success: true, message: "Quiz deleted" });
  }));

  app.post("/api/createQuestion", asyncHandler(async (req, res) => {
    const { quiz_id, text, options, correctAnswer, explanation } = req.body || {};
    if (!quiz_id || !text || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ success: false, message: "Quiz, question text, and options are required" });
      return;
    }

    const normalizedOptions = options.map((option: unknown) => String(option).trim()).filter(Boolean);
    const normalizedCorrectAnswer = Number(correctAnswer ?? 0);
    if (!Number.isInteger(normalizedCorrectAnswer) || normalizedCorrectAnswer < 0 || normalizedCorrectAnswer >= normalizedOptions.length) {
      res.status(400).json({ success: false, message: "Correct answer must match one of the provided options" });
      return;
    }

    const image_url = await saveQuestionImage(req.body || {});
    const id = createId("qn");
    await execute(
      "INSERT INTO questions (id, quiz_id, text, options, correctAnswer, explanation, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, quiz_id, String(text).trim(), JSON.stringify(normalizedOptions), normalizedCorrectAnswer, String(explanation || "").trim(), image_url || ""],
    );

    res.status(201).json({ success: true, message: "Question created" });
  }));

  app.post("/api/importQuestions", asyncHandler(async (req, res) => {
    const { quiz_id, questions } = req.body || {};
    if (!quiz_id) {
      res.status(400).json({ success: false, message: "Quiz is required" });
      return;
    }
    const currentQuiz = await queryOne<DbQuiz>("SELECT * FROM quizzes WHERE id = ?", [quiz_id]);
    if (!currentQuiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    const normalizedQuestions = normalizeImportedQuestions(questions);
    await withTransaction(async (connection) => {
      for (const question of normalizedQuestions) {
        await connection.execute(
          "INSERT INTO questions (id, quiz_id, text, options, correctAnswer, explanation, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [question.id, quiz_id, question.text, JSON.stringify(question.options), question.correctAnswer, question.explanation, question.image_url || ""],
        );
      }
    });
    res.status(201).json({ success: true, message: `${normalizedQuestions.length} questions imported` });
  }));

  app.post("/api/updateQuestion", asyncHandler(async (req, res) => {
    const { id, quiz_id, text, options, correctAnswer, explanation } = req.body || {};
    if (!id || !quiz_id || !text || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ success: false, message: "Id, quiz, question text, and options are required" });
      return;
    }

    const current = await queryOne<DbQuestion>("SELECT * FROM questions WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    const normalizedOptions = options.map((option: unknown) => String(option).trim()).filter(Boolean);
    const normalizedCorrectAnswer = Number(correctAnswer ?? 0);
    if (!Number.isInteger(normalizedCorrectAnswer) || normalizedCorrectAnswer < 0 || normalizedCorrectAnswer >= normalizedOptions.length) {
      res.status(400).json({ success: false, message: "Correct answer must match one of the provided options" });
      return;
    }

    const imageWasProvided = Object.prototype.hasOwnProperty.call(req.body, "image_url")
      || Object.prototype.hasOwnProperty.call(req.body, "imageUrl")
      || Object.prototype.hasOwnProperty.call(req.body, "questionImage")
      || Object.prototype.hasOwnProperty.call(req.body, "questionImageData");
    const nextImageUrl = await saveQuestionImage(req.body || {});
    const image_url = imageWasProvided ? nextImageUrl : String(current.image_url || "");
    if (image_url !== current.image_url) {
      await deleteStoredImage(current.image_url, "/uploads/questions/");
    }

    await execute(
      "UPDATE questions SET quiz_id = ?, text = ?, options = ?, correctAnswer = ?, explanation = ?, image_url = ? WHERE id = ?",
      [quiz_id, String(text).trim(), JSON.stringify(normalizedOptions), normalizedCorrectAnswer, String(explanation || "").trim(), image_url || "", id],
    );
    res.json({ success: true, message: "Question updated" });
  }));

  app.post("/api/deleteQuestion", asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ success: false, message: "Question id is required" });
      return;
    }
    const removed = await removeQuestionById(id);
    if (!removed) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }
    res.json({ success: true, message: "Question deleted" });
  }));

  app.post("/api/updateProfile", asyncHandler(async (req, res) => {
    const { id, name, password } = req.body || {};
    const trimmedName = String(name || "").trim();
    if (!id || !trimmedName) {
      res.status(400).json({ success: false, message: "User id and name are required" });
      return;
    }

    if (!isValidStudentName(trimmedName)) {
      res.status(400).json({ success: false, message: "Name must contain letters only" });
      return;
    }

    const current = await queryOne<DbUser>("SELECT * FROM users WHERE id = ?", [id]);
    if (!current) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    await execute("UPDATE users SET name = ?, password = ? WHERE id = ?", [trimmedName, password || current.password, id]);
    const updatedUser = await queryOne<DbUser>("SELECT id, name, email, phone FROM users WHERE id = ?", [id]);
    res.json({ success: true, message: "Profile updated", user: updatedUser });
  }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ success: false, message });
  });

  return app;
};
