/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  User, 
  Search, 
  Filter, 
  Play, 
  ChevronRight, 
  Bell, 
  Menu,
  ArrowLeft,
  Download,
  Settings,
  LogOut,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  X,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Info,
  Eye,
  Mail,
  Lock,
  ChevronDown,
  ExternalLink
  ,Phone,
  FlaskConical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import ReactMarkdown from 'react-markdown';

// --- Types ---
type Screen = 'home' | 'courses' | 'notes' | 'quiz' | 'profile' | 'settings' | 'profile-edit' | 'help-center' | 'support-chat' | 'my-courses' | 'offline-notes' | 'about-us' | 'about-developer' | 'privacy-policy' | 'admin' | 'video-player' | 'note-viewer' | 'course-details';

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  duration: string;
  note_content: string;
  note_url?: string;
  video_url?: string;
}

interface Course {
  id: string;
  title: string;
  lessons: number;
  image: string;
  price?: number;
  oldPrice?: number;
  type: 'free' | 'premium';
  category: string;
  lessonList?: Lesson[];
}

interface Note {
  id: string;
  title: string;
  lessons: number;
  category: string;
  type?: 'free' | 'premium';
  url?: string;
  content?: string;
}

interface Question {
  id: string;
  quiz_id?: string;
  text: string;
  options: string[];
  option_images?: string[];
  correctAnswer: number;
  explanation?: string;
  image_url?: string;
}

interface Quiz {
  id: string;
  topic: string;
  questions: Question[];
}

interface SliderItem {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  drive_file_id?: string;
  sort_order: number;
  is_active: boolean;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  grantedCourseIds?: string[];
}

interface StoredUser extends AuthUser {
  password: string;
}

interface AdminUser extends AuthUser {
  grantedCourseIds: string[];
  password?: string;
  [key: string]: unknown;
}

interface AdminAccount {
  id: string;
  username: string;
  password: string;
  createdAt: number;
}

type AdminRole = 'admin' | 'superadmin';

interface AdminSession {
  role: AdminRole;
  username: string;
  token: string;
  rememberMe?: boolean;
}

const AUTH_STORAGE_KEY = 'rbs-academy-users';
const THEME_STORAGE_KEY = 'rbs-academy-theme';
const USER_SESSION_KEY = 'rbs-academy-user-session';
const ADMIN_SESSION_KEY = 'rbs-academy-admin-session';
const ADMIN_ACCOUNTS_STORAGE_KEY = 'rbs-academy-admin-accounts';
const NOTE_CATEGORIES_STORAGE_KEY = 'rbs-academy-note-categories';
const APP_DATA_CACHE_KEY = 'rbs-academy-app-cache';
const ADMIN_USERS_CACHE_KEY = 'rbs-academy-admin-users-cache';
const DATA_REQUEST_TIMEOUT_MS = 8000;
const ADMIN_USERS_RESOURCE_URL = 'https://script.google.com/macros/s/AKfycbzj7_sa1S9oB2HEJbG6BzzCMK1GC9OYRDdw-0G9wDRJqMQexbEVvhPBSHWaASewOzEF_A/exec?resource=users';
const APPS_SCRIPT_URL = (import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();

const getAppsScriptActionUrl = (action: string) => {
  if (!APPS_SCRIPT_URL) {
    return '';
  }

  const separator = APPS_SCRIPT_URL.includes('?') ? '&' : '?';
  return `${APPS_SCRIPT_URL}${separator}action=${encodeURIComponent(action)}`;
};

const shouldFallbackToLocalApi = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return true;
  }

  try {
    const payload = await response.clone().json();
    const message = String(payload?.message || '').toLowerCase();
    return !response.ok || message === 'unsupported action' || message === 'unsupported resource';
  } catch {
    return !response.ok;
  }
};

const fetchWithFallback = async (
  appScriptRequest: () => Promise<Response>,
  localRequest: () => Promise<Response>
) => {
  if (!APPS_SCRIPT_URL) {
    return localRequest();
  }

  try {
    const response = await appScriptRequest();
    if (await shouldFallbackToLocalApi(response)) {
      return localRequest();
    }
    return response;
  } catch {
    return localRequest();
  }
};

const apiGet = async (resource: 'courses' | 'notes' | 'quizzes' | 'users' | 'sliders', params?: Record<string, string>) => {
  const query = new URLSearchParams(params || {});
  query.set('resource', resource);
  return fetchWithFallback(
    () => fetch(`${APPS_SCRIPT_URL}?${query.toString()}`),
    () => fetch(`/api/${resource}`)
  );
};

const normalizeAdminUser = (value: unknown): AdminUser | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const findValue = (...keys: string[]) => {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null && String(record[key]).trim()) {
        return String(record[key]).trim();
      }
    }
    return '';
  };

  const id = findValue('id', 'ID', 'Id', 'user_id', 'userId', 'User ID', 'Student ID', 'student_id');
  const email = findValue('email', 'Email', 'email_address', 'emailAddress', 'Email Address');
  const phone = findValue('phone', 'Phone', 'mobile', 'Mobile', 'phone_number', 'phoneNumber', 'mobile_number', 'mobileNumber');
  const name = findValue('name', 'Name', 'full_name', 'fullName', 'student_name', 'Student Name');
  const password = findValue('password', 'Password', 'pass', 'Pass');

  if (!id && !email && !name) {
    return null;
  }

  return {
    ...record,
    id: id || email || name || `student-${Date.now()}`,
    name: name || email || 'Student',
    email,
    phone,
    password: password || undefined,
    grantedCourseIds: Array.isArray(record.grantedCourseIds)
      ? record.grantedCourseIds.map((item) => String(item))
      : [],
  };
};

const mergeAdminUsers = (...groups: unknown[][]): AdminUser[] => {
  const merged = new Map<string, AdminUser>();

  groups.flat().forEach((item) => {
    const normalized = normalizeAdminUser(item);
    if (!normalized) {
      return;
    }

    const key = normalized.id || normalized.email || normalized.name;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...normalized } : normalized);
  });

  return Array.from(merged.values()).sort((left, right) =>
    `${left.name} ${left.email}`.localeCompare(`${right.name} ${right.email}`)
  );
};

const getCachedAppData = (): {
  sliders: SliderItem[];
  courses: Course[];
  notes: Note[];
  quizzes: Quiz[];
} | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawCache = window.localStorage.getItem(APP_DATA_CACHE_KEY);
  if (!rawCache) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawCache) as Partial<{
      sliders: SliderItem[];
      courses: Course[];
      notes: Note[];
      quizzes: Quiz[];
    }>;

    return {
      sliders: normalizeSliders(parsed.sliders),
      ...filterChemistryAppData({
        courses: Array.isArray(parsed.courses) ? parsed.courses : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : fallbackQuizzes,
      }),
    };
  } catch {
    return null;
  }
};

const saveCachedAppData = (payload: {
  sliders: SliderItem[];
  courses: Course[];
  notes: Note[];
  quizzes: Quiz[];
}) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify({
      sliders: payload.sliders,
      ...filterChemistryAppData(payload),
    }));
  }
};

const getCachedAdminUsers = (): AdminUser[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawCache = window.localStorage.getItem(ADMIN_USERS_CACHE_KEY);
  if (!rawCache) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawCache) as unknown[];
    return mergeAdminUsers(Array.isArray(parsed) ? parsed : []).filter((user) => !isLegacySeedUser(user));
  } catch {
    return [];
  }
};

const saveCachedAdminUsers = (users: AdminUser[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_USERS_CACHE_KEY, JSON.stringify(users));
  }
};

const loadJsonResource = async <T,>(resource: 'sliders' | 'courses' | 'notes' | 'quizzes' | 'users', fallbackValue: T): Promise<T> => {
  try {
    const response = await apiGet(resource);
    return await readJsonResponse(response);
  } catch {
    return fallbackValue;
  }
};

const withTimeout = async <T,>(task: Promise<T>, fallbackValue: T, timeoutMs = DATA_REQUEST_TIMEOUT_MS): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = DATA_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const getStoredAdminToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY) || window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return '';
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch {
    return '';
  }
};

const getAdminAuthHeaders = () => {
  const token = getStoredAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const extractUserArray = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.users)) {
      return record.users;
    }
    if (Array.isArray(record.data)) {
      return record.data;
    }
  }

  return [];
};

const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    const response = await fetchWithTimeout('/api/admin-users', {
      headers: getAdminAuthHeaders(),
    });
    const payload = await readLenientJsonResponse(response);
    const localUsers = mergeAdminUsers(extractUserArray(payload)).filter((user) => !isLegacySeedUser(user));
    if (localUsers.length) {
      return localUsers;
    }
  } catch {}

  try {
    const response = await fetchWithTimeout('/api/users');
    const payload = await readLenientJsonResponse(response);
    const users = mergeAdminUsers(extractUserArray(payload)).filter((user) => !isLegacySeedUser(user));
    if (users.length) {
      return users;
    }
  } catch {}

  if (!APPS_SCRIPT_URL) {
    return [];
  }

  try {
    const directResponse = await fetchWithTimeout(ADMIN_USERS_RESOURCE_URL);
    const directPayload = await readLenientJsonResponse(directResponse);
    const directUsers = mergeAdminUsers(extractUserArray(directPayload)).filter((user) => !isLegacySeedUser(user));
    if (directUsers.length) {
      return directUsers;
    }
  } catch {}

  try {
    const response = await apiGet('users');
    const payload = await readLenientJsonResponse(response);
    return mergeAdminUsers(extractUserArray(payload)).filter((user) => !isLegacySeedUser(user));
  } catch {
    return [];
  }
};

const isChemistryCourse = (course: Course) => String(course.category || '').toLowerCase().includes('chem');
const isChemistryNote = (note: Note) => String(note.category || '').toLowerCase().includes('chem');
const isChemistryQuiz = (quiz: Quiz) => String(quiz.topic || '').toLowerCase().includes('chem');

const makeCoursePremium = (course: Course): Course => {
  const price = Number(course.price || 0);
  const oldPrice = Number(course.oldPrice || 0);

  return {
    ...course,
    type: 'premium',
    price: price > 0 ? price : 999,
    oldPrice: oldPrice > price ? oldPrice : Math.max((price > 0 ? price : 999) * 2, 2999),
  };
};

const fullChemistryCoursePlaylistLessons: Lesson[] = [
  {
    id: 'playlist-ygfWkUUe_mw',
    course_id: '7',
    title: 'Prepare smarter for NEB Chemistry with RBS Sir!',
    duration: '57:30',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/ygfWkUUe_mw',
  },
  {
    id: 'playlist-ctvAG2m0eck',
    course_id: '7',
    title: 'Prepare smarter for NEB Chemistry with RBS Sir!',
    duration: '34:41',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/ctvAG2m0eck',
  },
  {
    id: 'playlist-dJN_zde16e0',
    course_id: '7',
    title: 'Prepare smarter for NEB Chemistry with RBS Sir!',
    duration: '56:25',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/dJN_zde16e0',
  },
  {
    id: 'playlist-Go11beHIcDc',
    course_id: '7',
    title: 'RBS sir Chemistry important questions solving for NEB students',
    duration: '56:10',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/Go11beHIcDc',
  },
  {
    id: 'playlist-M-BNETidn8o',
    course_id: '7',
    title: 'Chemistry NEB Grade 12 Revision 2026 |Important Questions & Numerical | RBS',
    duration: '1:02:22',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/M-BNETidn8o',
  },
  {
    id: 'playlist-l8f4e1_tWhE',
    course_id: '7',
    title: 'First Part Chemistry NEB Grade 12 Revision 2026 |Important Questions & Numerical | RBS |',
    duration: '22:00',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/l8f4e1_tWhE',
  },
  {
    id: 'playlist-HOomRqoQi6g',
    course_id: '7',
    title: 'Chemistry NEB Grade 12 Revision 2026 |Important Questions & Numerical | RBS |Saral Shikshya Academy',
    duration: '1:16:08',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/HOomRqoQi6g',
  },
  {
    id: 'playlist-fgJAyaWlUT8',
    course_id: '7',
    title: 'Chemistry Class | Ravi Bhushan Sharma',
    duration: '1:06:19',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/fgJAyaWlUT8',
  },
  {
    id: 'playlist-zE0JXXvbhP4',
    course_id: '7',
    title: 'Chemistry Class | Ravi Bhushan Sharma',
    duration: '1:12:21',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/zE0JXXvbhP4',
  },
  {
    id: 'playlist-hl2Q3Rhlq_0',
    course_id: '7',
    title: 'Aldehydes, Ketones and Carboxylic Acid | Grade 12 | NEB | Saral Shikshya',
    duration: '5:40',
    note_content: 'NEB Chemistry playlist lesson from Saral Shikshya Academy.',
    note_url: '',
    video_url: 'https://www.youtube.com/embed/hl2Q3Rhlq_0',
  },
];

const dummyFullChemistryLessonIds = new Set(['l6', 'l7', 'l8']);

const withFullChemistryPlaylistLessons = (courses: Course[]) => courses.map((course) => {
  const isFullChemistryCourse =
    String(course.id) === '7' ||
    String(course.title || '').toLowerCase().includes('full chemistry course');

  if (!isFullChemistryCourse) {
    return course;
  }

  const currentLessons = Array.isArray(course.lessonList)
    ? course.lessonList.filter((lesson) => !dummyFullChemistryLessonIds.has(String(lesson.id)))
    : [];
  const lessonMap = new Map<string, Lesson>();
  [...currentLessons, ...fullChemistryCoursePlaylistLessons].forEach((lesson) => {
    lessonMap.set(String(lesson.id), { ...lesson, course_id: String(course.id || '7') });
  });
  const lessonList = Array.from(lessonMap.values());

  return {
    ...course,
    lessons: lessonList.length,
    lessonList,
  };
});

const filterChemistryAppData = (payload: {
  courses: Course[];
  notes: Note[];
  quizzes: Quiz[];
}) => ({
  courses: withFullChemistryPlaylistLessons((payload.courses || []).filter(isChemistryCourse)).map(makeCoursePremium),
  notes: (payload.notes || []).filter(isChemistryNote),
  quizzes: (payload.quizzes || []).filter(isChemistryQuiz),
});

const legacyPlaceholderSliderUrls = [
  'https://picsum.photos/seed/slide1/1200/600',
  'https://picsum.photos/seed/slide2/1200/600',
  'https://picsum.photos/seed/slide3/1200/600',
];

const fallbackSliders: SliderItem[] = [
  {
    id: 'sl1',
    title: 'Chemistry One Shot Video',
    subtitle: 'Start fast with a focused chemistry one-shot session designed for quick revision.',
    image_url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqmdaP81MD5lfSQVNyUCJHE9FIrXTOfUWnKCTUFxE45Jx9QoEf3diojYpuDZggIrin3HGuPMTBSzn2lZmU4bz_u5tAaIxqVtZaqmrcLzOVUG4ZNDPl916cIR1XekUjbegMk2HeRWejq6SMpfJr5ontaQhhmlN1NJ7yZBClkbchUrH9-ZH9xhOGkixzVQ/s1600/oneshot%20video.png',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'sl2',
    title: 'Organic Chemistry',
    subtitle: 'Study reaction pathways, mechanisms, and named reactions with confidence.',
    image_url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgwdYcwalrDhUUicjNzgFlihRBqyGSDR-6R-pzRt58tSxvGoFeBsvmcUV8VMx83zmnMeNne0R_LU0fjw5NLK1ryg-yVbzsWc0ye0h187vq09UR7Gph1PiHYeaggvkICuJ4fAzqk7KQqhd485SqYSKvhtxPfE7HLQBKCmUae9g3c0FIHYHW6e4_ur18X7Q/s1536/organic.png',
    sort_order: 2,
    is_active: true
  },
  {
    id: 'sl3',
    title: 'Inorganic Chemistry',
    subtitle: 'Cover periodic trends, coordination compounds, and core inorganic concepts.',
    image_url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjgbaKHm45THr1QiQ4mfh6oBypp8tS3_F1lV_f2fwVwgnZp54S2Vm7ZT-ch5ZBshKsc7AtiwJwwhjoMc3CZYFR8SvULf4BBgSwkjvn_JVTtOrJcJTRmF4uCUy284SVMSazNsVTLPf4lWUVSwRWIwT9Y6q9RAN01AY_MwcMYV0nCAcDrXaSVUcQf66UcTQ/s1536/inorganic.png',
    sort_order: 3,
    is_active: true
  }
];

const normalizeSliders = (items: SliderItem[] | null | undefined): SliderItem[] => {
  if (!Array.isArray(items) || !items.length) {
    return fallbackSliders;
  }

  const usesLegacyPlaceholders = items.every((slider, index) =>
    slider?.id === `sl${index + 1}` && slider?.image_url === legacyPlaceholderSliderUrls[index]
  );

  return usesLegacyPlaceholders ? fallbackSliders : items;
};

const apiAuthPost = async (
  action: 'login' | 'signup',
  payload: Record<string, unknown>
) => {
  return fetchWithFallback(
    () => fetch(getAppsScriptActionUrl(action), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    }),
    () => fetch(action === 'signup' ? '/api/signup' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
};

const apiPost = async (action: string, payload: Record<string, unknown>) => {
  return fetchWithFallback(
    () => fetch(getAppsScriptActionUrl(action), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    }),
    () => fetch('/api/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(payload)
    })
  );
};

const apiPostToAppsScript = async (action: string, payload: Record<string, unknown>) => {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Google Apps Script is not configured');
  }

  return fetch(getAppsScriptActionUrl(action), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
};

const isValidStudentName = (value: string) => /^[A-Za-z][A-Za-z\s.'-]*$/.test(value.trim());
const normalizePhoneNumber = (value: string) => value.replace(/\D/g, "");

const readJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const bodyText = await response.text();
    throw new Error(
      bodyText.trim().startsWith('<')
        ? 'Server returned HTML instead of JSON. Refresh the app and make sure the API/server is running.'
        : 'Server returned an unexpected response.'
    );
  }

  return response.json();
};

const readLenientJsonResponse = async (response: Response) => {
  try {
    return await readJsonResponse(response);
  } catch {
    const bodyText = await response.text();
    return JSON.parse(bodyText);
  }
};

const normalizeAuthUser = (
  user: any,
  fallback: { name?: string; email?: string; phone?: string } = {}
): AuthUser => ({
  id: String(user?.id || `u${Date.now()}`),
  name: String(user?.name || fallback.name || 'Student'),
  email: String(user?.email || fallback.email || ''),
  phone: String(user?.phone || fallback.phone || ''),
  grantedCourseIds: Array.isArray(user?.grantedCourseIds)
    ? user.grantedCourseIds.map((item: unknown) => String(item))
    : [],
});

const isLegacySeedUser = (value: { id?: string; name?: string; email?: string } | null | undefined) =>
  String(value?.id || '').trim() === 'u1' &&
  String(value?.name || '').trim().toLowerCase() === 'rahul sharma' &&
  String(value?.email || '').trim().toLowerCase() === 'rahul@example.com';

const getStoredUsers = (): StoredUser[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawUsers = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawUsers) {
    return [];
  }

  try {
    const parsedUsers = JSON.parse(rawUsers) as StoredUser[];
    const normalizedUsers = parsedUsers.map((user) => ({
      ...user,
      phone: String((user as Partial<StoredUser>).phone || ''),
    }));
    const filteredUsers = normalizedUsers.filter((user) => !isLegacySeedUser(user));
    if (filteredUsers.length !== parsedUsers.length) {
      saveStoredUsers(filteredUsers);
    }
    return filteredUsers;
  } catch {
    return [];
  }
};

const saveStoredUsers = (users: StoredUser[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
  }
};

const updateStoredUser = (updatedUser: AuthUser) => {
  const storedUsers = getStoredUsers();
  const nextUsers = storedUsers.map((storedUser) =>
    storedUser.id === updatedUser.id
      ? { ...storedUser, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone }
      : storedUser
  );

  saveStoredUsers(nextUsers);
};

const updateStoredUserCredentials = (payload: { id: string; name: string; password?: string }) => {
  const storedUsers = getStoredUsers();
  const nextUsers = storedUsers.map((storedUser) =>
    storedUser.id === payload.id
      ? {
          ...storedUser,
          name: payload.name,
          ...(payload.password ? { password: payload.password } : {})
        }
      : storedUser
  );

  saveStoredUsers(nextUsers);
};

const getStoredSessionUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem(USER_SESSION_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
};

const saveSessionUser = (user: AuthUser | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(USER_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
};

const getStoredAdminAccounts = (): AdminAccount[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_ACCOUNTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as AdminAccount[] : [];
    const normalized = parsed
      .filter((item) => item && item.username && item.password)
      .map((item, index) => ({
        id: String(item.id || `admin-${index}`),
        username: String(item.username).trim(),
        password: String(item.password),
        createdAt: Number(item.createdAt || Date.now()),
      }))
      .filter((item) => item.username && item.password);

    const deduped = new Map<string, AdminAccount>();
    normalized.forEach((account) => {
      deduped.set(account.username.toLowerCase(), account);
    });
    return Array.from(deduped.values());
  } catch {
    return [];
  }
};

const saveStoredAdminAccounts = (accounts: AdminAccount[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADMIN_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

const getStoredNoteCategories = () => {
  const defaults = ['Chemistry', 'Physics', 'Biology', 'Maths'];

  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(NOTE_CATEGORIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as string[] : [];
    const merged = Array.from(new Set([...defaults, ...parsed.map((item) => String(item || '').trim()).filter(Boolean)]));
    return merged;
  } catch {
    return defaults;
  }
};

const saveStoredNoteCategories = (categories: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(NOTE_CATEGORIES_STORAGE_KEY, JSON.stringify(Array.from(new Set(categories.map((item) => item.trim()).filter(Boolean)))));
};

const getAdminSession = (): AdminSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY) || window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.role || !parsed?.username) {
      return null;
    }
    if (!parsed.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveAdminSession = (session: AdminSession | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);

  if (session) {
    const storage = session.rememberMe ? window.localStorage : window.sessionStorage;
    storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }
};

const fallbackQuizzes: Quiz[] = [
  {
    id: 'q1',
    topic: 'Chemistry',
    questions: [
      {
        id: 'qn1',
        text: 'Which of the following is a decomposition reaction?',
        options: ['H2 + O2 -> H2O', 'CaCO3 -> CaO + CO2', 'Zn + HCl -> ZnCl2 + H2', 'NaOH + HCl -> NaCl + H2O'],
        correctAnswer: 1,
        explanation: 'CaCO3 breaking into CaO and CO2 is a decomposition reaction.'
      },
      {
        id: 'qn2',
        text: 'What is the pH of a neutral solution?',
        options: ['0', '14', '7', '1'],
        correctAnswer: 2,
        explanation: 'A neutral solution has pH 7.'
      },
      {
        id: 'qn3',
        text: 'Which gas is evolved when zinc reacts with dilute sulphuric acid?',
        options: ['Oxygen', 'Hydrogen', 'Carbon Dioxide', 'Nitrogen'],
        correctAnswer: 1,
        explanation: 'Zinc reacts with dilute sulphuric acid to release hydrogen gas.'
      }
    ]
  },
  {
    id: 'q2',
    topic: 'Physics',
    questions: [
      {
        id: 'qn4',
        text: 'The focal length of a plane mirror is:',
        options: ['Zero', 'Infinite', '25 cm', '-25 cm'],
        correctAnswer: 1,
        explanation: 'A plane mirror has infinite focal length.'
      },
      {
        id: 'qn5',
        text: 'The unit of power of a lens is:',
        options: ['Meter', 'Dioptre', 'Watt', 'Joule'],
        correctAnswer: 1,
        explanation: 'Lens power is measured in dioptre.'
      },
      {
        id: 'qn6',
        text: 'Which mirror is used as a rear-view mirror in vehicles?',
        options: ['Concave', 'Convex', 'Plane', 'None'],
        correctAnswer: 1,
        explanation: 'Convex mirrors provide a wider field of view.'
      }
    ]
  },
  {
    id: 'q3',
    topic: 'Biology',
    questions: [
      {
        id: 'qn7',
        text: 'Which part of the cell is known as the control center?',
        options: ['Nucleus', 'Cytoplasm', 'Cell membrane', 'Ribosome'],
        correctAnswer: 0,
        explanation: 'The nucleus controls major cell activities.'
      },
      {
        id: 'qn8',
        text: 'Photosynthesis mainly takes place in which part of the plant cell?',
        options: ['Mitochondria', 'Chloroplast', 'Vacuole', 'Nucleus'],
        correctAnswer: 1,
        explanation: 'Chloroplasts contain chlorophyll and are the site of photosynthesis.'
      },
      {
        id: 'qn9',
        text: 'Which blood vessel carries blood away from the heart?',
        options: ['Vein', 'Capillary', 'Artery', 'Nerve'],
        correctAnswer: 2,
        explanation: 'Arteries carry blood away from the heart.'
      }
    ]
  },
  {
    id: 'q4',
    topic: 'Mathematics',
    questions: [
      {
        id: 'qn10',
        text: 'What is the value of sin 90 degrees?',
        options: ['0', '1', '1/2', 'sqrt(3)/2'],
        correctAnswer: 1,
        explanation: 'sin 90 degrees equals 1.'
      },
      {
        id: 'qn11',
        text: 'If x + 7 = 15, what is the value of x?',
        options: ['6', '7', '8', '9'],
        correctAnswer: 2,
        explanation: 'Subtract 7 from both sides to get x = 8.'
      },
      {
        id: 'qn12',
        text: 'What is the area of a rectangle with length 8 cm and breadth 5 cm?',
        options: ['13 cm2', '26 cm2', '40 cm2', '80 cm2'],
        correctAnswer: 2,
        explanation: 'Area = length x breadth = 40 cm2.'
      }
    ]
  },
  {
    id: 'q5',
    topic: 'English',
    questions: [
      {
        id: 'qn13',
        text: 'Which of the following is a noun?',
        options: ['Quickly', 'Beautiful', 'Honesty', 'Run'],
        correctAnswer: 2,
        explanation: 'Honesty is an abstract noun.'
      },
      {
        id: 'qn14',
        text: 'Choose the correct synonym of "rapid".',
        options: ['Slow', 'Fast', 'Weak', 'Silent'],
        correctAnswer: 1,
        explanation: 'Rapid means fast.'
      },
      {
        id: 'qn15',
        text: 'Which sentence is in the past tense?',
        options: ['She sings well.', 'They are playing.', 'He went to school.', 'I will call you.'],
        correctAnswer: 2,
        explanation: 'The verb "went" is in the past tense.'
      }
    ]
  },
  {
    id: 'q6',
    topic: 'History',
    questions: [
      {
        id: 'qn16',
        text: 'Who was the first Prime Minister of independent India?',
        options: ['Mahatma Gandhi', 'Sardar Patel', 'Jawaharlal Nehru', 'Subhas Chandra Bose'],
        correctAnswer: 2,
        explanation: 'Jawaharlal Nehru became the first Prime Minister in 1947.'
      },
      {
        id: 'qn17',
        text: 'In which year did India gain independence?',
        options: ['1945', '1947', '1950', '1952'],
        correctAnswer: 1,
        explanation: 'India became independent in 1947.'
      },
      {
        id: 'qn18',
        text: 'The Harappan civilization is also known as the:',
        options: ['Vedic civilization', 'Indus Valley civilization', 'Mauryan civilization', 'Gupta civilization'],
        correctAnswer: 1,
        explanation: 'Harappan civilization is another name for the Indus Valley civilization.'
      }
    ]
  },
  {
    id: 'q7',
    topic: 'Computer Science',
    questions: [
      {
        id: 'qn19',
        text: 'What does CPU stand for?',
        options: ['Central Processing Unit', 'Computer Primary Unit', 'Central Program Utility', 'Control Processing Utility'],
        correctAnswer: 0,
        explanation: 'CPU stands for Central Processing Unit.'
      },
      {
        id: 'qn20',
        text: 'Which of the following is an output device?',
        options: ['Keyboard', 'Mouse', 'Monitor', 'Scanner'],
        correctAnswer: 2,
        explanation: 'A monitor is an output device.'
      },
      {
        id: 'qn21',
        text: 'Binary language uses which two digits?',
        options: ['0 and 1', '1 and 2', '2 and 3', '0 and 9'],
        correctAnswer: 0,
        explanation: 'Binary uses only 0 and 1.'
      }
    ]
  }
];

const mergeQuizzes = (apiQuizzes: Quiz[]): Quiz[] => {
  const quizMap = new Map(
    fallbackQuizzes.map((quiz) => [quiz.topic.toLowerCase(), quiz])
  );

  apiQuizzes.forEach((quiz) => {
    const key = quiz.topic.toLowerCase();
    const fallbackQuiz = quizMap.get(key);
    quizMap.set(key, {
      ...(fallbackQuiz || quiz),
      ...quiz,
      questions: quiz.questions?.length ? quiz.questions : fallbackQuiz?.questions || []
    });
  });

  return Array.from(quizMap.values());
};

const isEmbeddableVideoUrl = (url?: string) => {
  if (!url) return false;

  return /(youtube(-nocookie)?\.com\/embed|youtube\.com\/watch\?v=|youtu\.be\/|player\.vimeo\.com\/video\/|vimeo\.com\/)/i.test(url);
};

const appendQueryParams = (baseUrl: string, params: Record<string, string>) => {
  try {
    const parsedUrl = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      parsedUrl.searchParams.set(key, value);
    });
    return parsedUrl.toString();
  } catch {
    return baseUrl;
  }
};

const normalizeVideoUrl = (url?: string) => {
  if (!url) {
    return '';
  }

  const trimmedUrl = url.trim();
  const youtubeWatchMatch = trimmedUrl.match(/[?&]v=([^&]+)/i);
  if (trimmedUrl.includes('youtube.com/watch') && youtubeWatchMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${youtubeWatchMatch[1]}`;
  }

  const shortYoutubeMatch = trimmedUrl.match(/youtu\.be\/([^?&]+)/i);
  if (shortYoutubeMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortYoutubeMatch[1]}`;
  }

  if (trimmedUrl.includes('youtube.com/embed/')) {
    return trimmedUrl.replace('https://www.youtube.com/embed/', 'https://www.youtube-nocookie.com/embed/');
  }

  if (trimmedUrl.includes('youtube-nocookie.com/embed/')) {
    return trimmedUrl;
  }

  const vimeoMatch = trimmedUrl.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch?.[1] && !trimmedUrl.includes('player.vimeo.com')) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmedUrl;
};

const getProtectedEmbedUrl = (url?: string) => {
  const normalizedUrl = normalizeVideoUrl(url);
  if (!normalizedUrl) {
    return '';
  }

  if (/youtube(-nocookie)?\.com\/embed\//i.test(normalizedUrl)) {
    return appendQueryParams(normalizedUrl, {
      autoplay: '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      controls: '1',
      fs: '0',
      iv_load_policy: '3',
      disablekb: '1',
      origin: window.location.origin
    });
  }

  if (/player\.vimeo\.com\/video\//i.test(normalizedUrl)) {
    return appendQueryParams(normalizedUrl, {
      autopause: '1',
      title: '0',
      byline: '0',
      portrait: '0'
    });
  }

  return normalizedUrl;
};

// --- Components ---

const LoginScreen = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const trimmedName = name.trim();
    const normalizedPhone = normalizePhoneNumber(phone);

    if (isSignup && !isValidStudentName(trimmedName)) {
      setError('Name must contain letters only');
      setLoading(false);
      return;
    }

    if (isSignup && normalizedPhone.length < 10) {
      setError('Phone number is required');
      setLoading(false);
      return;
    }

    try {
      const payload = isSignup ? { name: trimmedName, email, phone: normalizedPhone, password } : { email, password };

      const res = await apiAuthPost(isSignup ? 'signup' : 'login', payload);
      const data = await res.json();
      if (data.success) {
        onLogin(normalizeAuthUser(data.user, { name: trimmedName, email, phone: normalizedPhone }));
      } else {
        setError(data.message || (isSignup ? 'Signup failed' : 'Login failed'));
      }
    } catch (err) {
      const storedUsers = getStoredUsers();

      if (isSignup) {
        const existingUser = storedUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          setError('Email already registered');
          setLoading(false);
          return;
        }

        const newUser: StoredUser = {
          id: `u${Date.now()}`,
          name: trimmedName,
          email,
          phone: normalizedPhone,
          password
        };

        saveStoredUsers([...storedUsers, newUser]);
        onLogin(normalizeAuthUser(newUser, { name: trimmedName, email, phone: normalizedPhone }));
      } else {
        const matchedUser = storedUsers.find(
          (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password
        );

        if (!matchedUser) {
          setError('Invalid credentials');
          setLoading(false);
          return;
        }

        onLogin(normalizeAuthUser(matchedUser, { email }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="auth-scenic-shell auth-login-page flex-1 flex items-center justify-center p-5 sm:p-6"
    >
      <div className="auth-scenic-card auth-login-card px-6 py-6 sm:px-8 sm:py-8">
      <div className="auth-login-brand">
        <div className="auth-login-badge">RBS Academy</div>
        <div className="auth-login-copy">
          <h1 className="auth-login-title">{isSignup ? 'Create account' : 'Welcome back'}</h1>
          <p className="auth-login-subtitle">
            {isSignup
              ? 'Create your student account to save progress and access your learning dashboard.'
              : 'Sign in to continue with your courses, notes, quizzes, and saved access.'}
          </p>
        </div>
      </div>
      <div className="auth-login-switch" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          onClick={() => {
            setIsSignup(false);
            setError('');
            setPhone('');
            setConfirmPassword('');
          }}
          className={`auth-login-switch-button ${!isSignup ? 'auth-login-switch-button--active' : ''}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignup(true);
            setError('');
            setPhone('');
          }}
          className={`auth-login-switch-button ${isSignup ? 'auth-login-switch-button--active' : ''}`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {isSignup && (
          <label className="auth-login-field">
            <span className="auth-login-label">Full Name</span>
            <input
              type="text"
              required
              className="auth-scenic-input auth-login-input text-sm"
              placeholder="Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        {isSignup && (
          <label className="auth-login-field">
            <span className="auth-login-label">Mobile Number</span>
            <input
              type="tel"
              required
              className="auth-scenic-input auth-login-input text-sm"
              placeholder="Enter mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        )}
        <label className="auth-login-field">
          <span className="auth-login-label">Email</span>
          <input
            type="email"
            required
            className="auth-scenic-input auth-login-input text-sm"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="auth-login-field">
          <span className="auth-login-label">Password</span>
          <input 
            type="password" 
            required
            className="auth-scenic-input auth-login-input text-sm"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {isSignup && (
          <label className="auth-login-field">
            <span className="auth-login-label">Confirm Password</span>
            <input
              type="password"
              required
              className="auth-scenic-input auth-login-input text-sm"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        )}
        
        <div className="auth-login-meta">
          <div className="auth-login-note">{isSignup ? 'Use a password you will remember.' : 'Use the same email and password you signed up with.'}</div>
          {!isSignup && <button type="button" className="auth-scenic-link text-sm">Forgot password?</button>}
        </div>

        {error && <p className="auth-login-error">{error}</p>}

        <button 
          type="submit"
          disabled={loading}
          className="auth-scenic-button auth-login-submit py-4 mt-2 flex items-center justify-center gap-2"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isSignup ? 'Create Account' : 'Log In')}
        </button>
      </form>

      <p className="auth-login-footer">
        {isSignup ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setError('');
            setPhone('');
            setPassword('');
            setConfirmPassword('');
          }}
          className="auth-login-footer-link"
        >
          {isSignup ? 'Sign In' : 'Create one'}
        </button>
      </p>
      </div>
    </motion.div>
  );
};

const Loading = () => (
  <div className="flex-1 flex flex-col items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-500 text-sm animate-pulse">Loading Academy...</p>
  </div>
);

const AccessCodeModal = ({ 
  isOpen, 
  onClose, 
  onUnlock, 
  courseTitle 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onUnlock: (code: string) => Promise<{ success: boolean; message?: string }>,
  courseTitle: string
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!code.trim()) {
      setError('Please enter access code');
      return;
    }

    setLoading(true);
    const result = await onUnlock(code);
    if (!result.success) {
      setError(result.message || 'Invalid access code');
    }
    setLoading(false);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hello Admin, I want to buy the course: ${courseTitle}. Please provide the access code.`);
    window.open(`https://wa.me/919876543210?text=${message}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-primary p-6 text-white text-center relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={20} /></button>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold">Unlock Course</h3>
                <p className="text-white/70 text-xs mt-1">{courseTitle}</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enter Access Code</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                  />
                  {error && <p className="text-red-500 text-[10px] mt-1 text-center font-medium">{error}</p>}
                </div>

                <button 
                  onClick={handleUnlock}
                  disabled={loading}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 transition-transform active:scale-95"
                >
                  {loading ? 'Checking...' : 'Unlock Now'}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-300"><span className="bg-white px-2">OR</span></div>
                </div>

                <button 
                  onClick={handleWhatsApp}
                  className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <MessageSquare size={20} />
                  Buy on WhatsApp
                </button>

                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Contact admin on WhatsApp to get your unique access code after payment.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const BottomNav = ({ activeScreen, setScreen, onQuizClick }: { activeScreen: Screen, setScreen: (s: Screen) => void, onQuizClick?: () => void }) => (
  <nav className="nav-bottom">
    <button onClick={() => setScreen('home')} className={`nav-item ${activeScreen === 'home' ? 'active' : ''}`}>
      <Home size={24} />
      <span className="text-[10px] font-medium">Home</span>
    </button>
    <button onClick={() => setScreen('courses')} className={`nav-item ${activeScreen === 'courses' ? 'active' : ''}`}>
      <BookOpen size={24} />
      <span className="text-[10px] font-medium">Courses</span>
    </button>
    <button onClick={() => setScreen('notes')} className={`nav-item ${activeScreen === 'notes' ? 'active' : ''}`}>
      <FileText size={24} />
      <span className="text-[10px] font-medium">Notes</span>
    </button>
    <button onClick={() => onQuizClick ? onQuizClick() : setScreen('quiz')} className={`nav-item ${activeScreen === 'quiz' ? 'active' : ''}`}>
      <HelpCircle size={24} />
      <span className="text-[10px] font-medium">Quiz</span>
    </button>
    <button onClick={() => setScreen('profile')} className={`nav-item ${activeScreen === 'profile' ? 'active' : ''}`}>
      <User size={24} />
      <span className="text-[10px] font-medium">Profile</span>
    </button>
  </nav>
);

const Header = ({ title, showBack, onBack, onMenuClick, onNotificationClick }: { title: string, showBack?: boolean, onBack?: () => void, onMenuClick?: () => void, onNotificationClick?: () => void }) => (
  <header className="hero-gradient text-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg shadow-blue-900/10">
    <div className="flex items-center gap-3">
      {showBack ? (
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><ArrowLeft size={20} /></button>
      ) : (
        <button onClick={onMenuClick} className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"><Menu size={20} /></button>
      )}
      <div>
        {title !== 'RBS Academy' && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-bold">RBS Academy</div>
        )}
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <button onClick={onNotificationClick} className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
        <Bell size={20} />
      </button>
      <button
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.open('https://wa.me/9779823415625', '_blank', 'noopener,noreferrer');
          }
        }}
        className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center"
        aria-label="Contact on WhatsApp"
      >
        <MessageSquare size={20} />
      </button>
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=RBSAcademy" alt="Avatar" referrerPolicy="no-referrer" />
      </div>
    </div>
  </header>
);

const SectionHeader = ({ title, onSeeAll }: { title: string, onSeeAll?: () => void }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h2>
    {onSeeAll && (
      <button onClick={onSeeAll} className="app-chip px-3 py-1.5 text-primary text-sm font-medium">See All</button>
    )}
  </div>
);

const ImageSlider = ({ sliders }: { sliders: SliderItem[] }) => {
  const activeSlides = [...sliders]
    .filter((slider) => slider.is_active)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const slides = activeSlides.length ? activeSlides : fallbackSliders;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides.length) {
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [slides.length]);

  const currentSlide = slides[currentIndex] || fallbackSliders[0];

  return (
    <div className="relative w-full h-52 overflow-hidden mb-6 shadow-xl shadow-slate-200/60">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={currentSlide.image_url}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${currentIndex === idx ? 'bg-white w-4' : 'bg-white/50'}`}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-6 left-6 text-white">
        <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-bold mb-3">Featured</div>
        <h2 className="text-xl font-bold">{currentSlide.title}</h2>
        <p className="text-xs text-white/80 max-w-[220px]">{currentSlide.subtitle}</p>
      </div>
    </div>
  );
};

const SideDrawer = ({ isOpen, onClose, user, setScreen }: { isOpen: boolean, onClose: () => void, user: any, setScreen: (s: Screen) => void }) => {
  const menuItems = [
    { icon: <ShieldCheck size={20} />, label: 'Privacy Policy' },
    { icon: <MessageSquare size={20} />, label: 'Support Chat' },
    { icon: <Info size={20} />, label: 'About Us' },
    { icon: <User size={20} />, label: 'About Developer' },
    { icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] shadow-2xl flex flex-col"
          >
            <div className="bg-primary p-6 text-white relative overflow-hidden">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full border-2 border-white/30 p-1 mb-4">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Student'}`} 
                    alt="Profile" 
                    className="w-full h-full rounded-full bg-white" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <h3 className="text-lg font-bold">{user?.name || 'Student'}</h3>
                <p className="text-white/70 text-xs">{user?.email || 'student@academy.com'}</p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-4 mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Menu</p>
              </div>
              {menuItems.map((item, idx) => (
                <button 
                  key={idx} 
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-gray-700"
                  onClick={() => {
                    if (item.label === 'Settings') {
                      setScreen('settings');
                    }
                    if (item.label === 'About Us') {
                      setScreen('about-us');
                    }
                    if (item.label === 'About Developer') {
                      setScreen('about-developer');
                    }
                    if (item.label === 'Privacy Policy') {
                      setScreen('privacy-policy');
                    }
                    if (item.label === 'Support Chat') {
                      setScreen('support-chat');
                    }
                    onClose();
                  }}
                >
                  <div className="text-primary">{item.icon}</div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Screens ---

const HomeScreen = ({ 
  setScreen, 
  courses, 
  notes,
  quizzes,
  sliders, 
  unlockedCourseIds, 
  onOpenCoursesTab,
  onBuyClick,
  onCourseSelect
}: { 
  setScreen: (s: Screen) => void, 
  courses: Course[],
  notes: Note[],
  quizzes: Quiz[],
  sliders: SliderItem[],
  unlockedCourseIds: string[],
  onOpenCoursesTab: (tab: 'free' | 'premium') => void,
  onBuyClick: (course: Course) => void,
  onCourseSelect: (course: Course) => void
}) => {
  const recentUpdates = [
    sliders[0] ? `Slider updated: ${sliders[0].title}` : '',
    courses[0] ? `Course live: ${courses[0].title}` : '',
    notes[0] ? `New note: ${notes[0].title}` : '',
    quizzes[0] ? `Quiz ready: ${quizzes[0].topic}` : '',
  ].filter(Boolean).slice(0, 4);
  const premiumCourses = courses.filter(course => course.type === 'premium');

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 overflow-y-auto pb-24 px-4 pt-4"
    >
      <ImageSlider sliders={sliders} />

      <a
        href="go:101"
        className="mb-6 flex w-full items-center justify-between rounded-2xl bg-[linear-gradient(135deg,#17304f_0%,#24527d_100%)] px-5 py-4 text-left text-white shadow-lg shadow-blue-900/15"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Chemistry Quick Access</div>
          <div className="mt-1 text-base font-black">Chemistry One Short</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12">
          <ArrowRight size={20} />
        </div>
      </a>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={() => onOpenCoursesTab('premium')} className="card-gradient-green p-4 rounded-xl text-white text-left flex flex-col justify-between h-32 shadow-lg shadow-green-100">
          <BookOpen size={24} className="mb-2" />
          <div>
            <p className="font-bold">Chemistry Courses</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Premium Catalog</span>
          </div>
        </button>
        <button onClick={() => onOpenCoursesTab('premium')} className="premium-action-card p-4 rounded-xl text-white text-left flex flex-col justify-between h-32 shadow-lg shadow-amber-100">
          <div className="flex items-start justify-between">
            <ShieldCheck size={24} className="mb-2" />
            <span className="rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-black uppercase">Pro</span>
          </div>
          <div>
            <p className="font-bold">Premium Chemistry</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{premiumCourses.length || 0} Courses</span>
          </div>
        </button>
        <button onClick={() => setScreen('notes')} className="card-gradient-blue p-4 rounded-xl text-white text-left flex flex-col justify-between h-32 shadow-lg shadow-blue-100">
          <FileText size={24} className="mb-2" />
          <div>
            <p className="font-bold">Free Notes</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Download</span>
          </div>
        </button>
        <button onClick={() => setScreen('quiz')} className="card-gradient-red p-4 rounded-xl text-white text-left flex flex-col justify-between h-32 shadow-lg shadow-red-100">
          <HelpCircle size={24} className="mb-2" />
          <div>
            <p className="font-bold">Practice Quiz</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Test Skills</span>
          </div>
        </button>
      </div>

      {!!premiumCourses.length && (
        <div>
          <SectionHeader title="Premium Chemistry Courses" onSeeAll={() => onOpenCoursesTab('premium')} />
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {premiumCourses.slice(0, 4).map(course => {
              const isUnlocked = unlockedCourseIds.includes(course.id);
              return (
                <button
                  key={course.id}
                  onClick={() => {
                    onCourseSelect(course);
                    setScreen('course-details');
                  }}
                  className="premium-mini-card min-w-[190px] overflow-hidden rounded-xl border text-left shadow-sm"
                >
                  <div className="relative h-24">
                    <img src={course.image} alt={course.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-amber-700">
                      Rs {course.price || 0}
                    </div>
                    <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                      {isUnlocked ? <CheckCircle2 size={14} /> : <Lock size={14} />}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-sm font-black text-gray-900">{course.title}</h3>
                    <p className="mt-1 text-[10px] font-semibold text-gray-500">{course.lessons}+ lessons • Premium access</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Updates */}
      <div className="mt-6">
        <SectionHeader title="Recent Updates" />
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
          {recentUpdates.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <p className="text-sm text-gray-700">{item}</p>
            </div>
          ))}
          {!recentUpdates.length && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <p className="text-sm text-gray-700">Chemistry content updates will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const CoursesScreen = ({ 
  setScreen, 
  courses, 
  unlockedCourseIds, 
  initialTab,
  onBuyClick,
  onCourseSelect
}: { 
  setScreen: (s: Screen) => void, 
  courses: Course[],
  unlockedCourseIds: string[],
  initialTab: 'free' | 'premium',
  onBuyClick: (course: Course) => void,
  onCourseSelect: (course: Course) => void
}) => {
  const [activeTab, setActiveTab] = useState<'free' | 'premium'>('premium');
  const [searchQuery, setSearchQuery] = useState('');
  const freeCount = courses.filter(c => c.type === 'free').length;
  const premiumCount = courses.filter(c => c.type === 'premium').length;

  useEffect(() => {
    setActiveTab(initialTab === 'free' && freeCount === 0 ? 'premium' : initialTab);
  }, [initialTab, freeCount]);

  const filteredCourses = courses.filter(c => 
    c.type === activeTab && 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className={`mb-4 rounded-2xl p-4 text-white shadow-lg ${activeTab === 'premium' ? 'premium-course-hero shadow-amber-100' : 'bg-[linear-gradient(135deg,#0f8a45_0%,#075a35_100%)] shadow-green-100'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{activeTab === 'premium' ? 'Premium Chemistry' : 'Chemistry Courses'}</p>
              <h2 className="mt-1 text-xl font-black">{activeTab === 'premium' ? 'Unlock focused batches' : 'Start learning today'}</h2>
              <p className="mt-1 text-xs text-white/75">{activeTab === 'premium' ? `${premiumCount} premium courses with admin access code` : `${freeCount} free courses available now`}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16">
              {activeTab === 'premium' ? <CreditCard size={22} /> : <BookOpen size={22} />}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search courses..." 
            className="w-full bg-gray-100 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white p-1 rounded">
            <Filter size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {freeCount > 0 && (
            <button 
              onClick={() => setActiveTab('free')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'free' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
            >
              Free ({freeCount})
            </button>
          )}
          <button 
            onClick={() => setActiveTab('premium')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'premium' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'}`}
          >
            Premium ({premiumCount})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {filteredCourses.map(course => {
          const isUnlocked = unlockedCourseIds.includes(course.id);
          
          return (
            <div key={course.id} className={`course-list-card bg-white rounded-xl overflow-hidden border shadow-sm flex flex-col ${course.type === 'premium' ? 'border-amber-100' : 'border-gray-100'}`}>
              <div className="relative h-40">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {course.type === 'premium' && (
                  <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[10px] font-black uppercase text-amber-700 shadow-sm">
                    Premium
                  </div>
                )}
                <div className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${isUnlocked ? 'bg-emerald-500 text-white' : 'bg-black/55 text-white backdrop-blur-sm'}`}>
                  {isUnlocked ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                  {isUnlocked ? 'Unlocked' : 'Locked'}
                </div>
                <button 
                  onClick={() => {
                    onCourseSelect(course);
                    setScreen('course-details');
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 group hover:bg-black/40 transition-all"
                >
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary shadow-lg group-hover:scale-110 transition-transform">
                    {isUnlocked ? <Play size={24} fill="currentColor" /> : <ShieldCheck size={24} />}
                  </div>
                </button>
              </div>
              <div className="p-4 flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800">{course.title}</h3>
                  <p className="text-xs text-gray-500">{course.lessons}+ Video Lessons & Notes</p>
                  {course.type === 'premium' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">Rs {course.price} Only</span>
                      {!!course.oldPrice && <span className="text-gray-400 text-[10px] line-through">Rs {course.oldPrice}</span>}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (isUnlocked) {
                      onCourseSelect(course);
                      setScreen('course-details');
                      return;
                    }
                    onBuyClick(course);
                  }}
                  className={`${isUnlocked ? 'bg-primary shadow-blue-100' : 'premium-buy-button shadow-amber-100'} shrink-0 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95`}
                >
                  {isUnlocked ? 'View Details' : 'Buy Now'}
                </button>
              </div>
            </div>
          );
        })}
        {!filteredCourses.length && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <BookOpen size={22} />
            </div>
            <h3 className="font-bold text-gray-800">No {activeTab} courses found</h3>
            <p className="mt-1 text-sm text-gray-500">Try another search or check back after new chemistry courses are added.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const VideoPlayerScreen = ({ 
  onBack, 
  course, 
  onLessonSelect, 
  onViewNotes 
}: { 
  onBack: () => void, 
  course: Course | null,
  onLessonSelect: (lesson: Lesson) => void,
  onViewNotes: (lesson: Lesson) => void
}) => {
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(course?.lessonList?.[0] || null);

  useEffect(() => {
    setCurrentLesson(course?.lessonList?.[0] || null);
  }, [course]);

  if (!course) return null;

  const activeVideoUrl = getProtectedEmbedUrl(currentLesson?.video_url);
  const usesEmbedPlayer = isEmbeddableVideoUrl(activeVideoUrl);
  const isProtectedYoutubeEmbed = /youtube(-nocookie)?\.com\/embed\//i.test(activeVideoUrl);

  return (
    <motion.div 
      initial={{ y: '100%' }} 
      animate={{ y: 0 }} 
      exit={{ y: '100%' }}
      className="flex-1 bg-white flex flex-col z-50"
    >
      <div className="bg-black aspect-video relative">
        {activeVideoUrl && usesEmbedPlayer ? (
          <>
            <iframe
              src={activeVideoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              title={currentLesson?.title || course.title}
            ></iframe>
            {isProtectedYoutubeEmbed ? (
              <>
                <div
                  className="absolute inset-x-0 top-0 z-10 h-14 bg-transparent"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-x-0 bottom-0 z-10 h-16 bg-transparent"
                  aria-hidden="true"
                />
              </>
            ) : null}
          </>
        ) : activeVideoUrl ? (
          <video
            key={activeVideoUrl}
            src={activeVideoUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
            preload="metadata"
          >
            Your browser does not support HTML5 video.
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-center text-white">
            <div className="px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Lesson Video</p>
              <h3 className="mt-3 text-2xl font-black">Video unavailable</h3>
              <p className="mt-2 text-sm text-white/70">This lesson does not have a playable video yet.</p>
            </div>
          </div>
        )}
        <button 
          onClick={onBack} 
          className="absolute top-4 left-4 w-8 h-8 bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">{currentLesson?.title || course.title}</h2>
        <p className="text-xs text-gray-400 mb-2">
          {currentLesson?.video_url ? (usesEmbedPlayer ? 'Embedded lesson' : 'Direct video lesson') : 'No lesson video'}
        </p>
        <p className="text-sm text-gray-500 mb-6">{course.title} • {currentLesson?.duration || '10:00'} mins</p>

        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => currentLesson && onViewNotes(currentLesson)}
            className="flex-1 bg-gray-100 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <Eye size={18} />
            View Notes
          </button>
          <button className="flex-1 bg-primary py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white shadow-lg shadow-blue-100 transition-transform active:scale-95">
            <HelpCircle size={18} />
            Take Quiz
          </button>
        </div>

        <SectionHeader title="Course Lessons" />
        <div className="space-y-3">
          {course.lessonList?.map((lesson, idx) => (
            <button 
              key={lesson.id} 
              onClick={() => {
                setCurrentLesson(lesson);
                onLessonSelect(lesson);
              }}
              className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-colors text-left group ${currentLesson?.id === lesson.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:bg-gray-50'}`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${currentLesson?.id === lesson.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                <Play size={20} />
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-bold transition-colors ${currentLesson?.id === lesson.id ? 'text-primary' : 'text-gray-800'}`}>{lesson.title}</h4>
                <p className="text-[10px] text-gray-500">Lesson {idx + 1} • {lesson.duration} mins</p>
              </div>
              <ChevronRight size={18} className={currentLesson?.id === lesson.id ? 'text-primary' : 'text-gray-300'} />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const CourseDetailsScreen = ({ 
  course, 
  onBack, 
  onStartLearning, 
  onViewNotes, 
  onTakeQuiz,
  isUnlocked
}: { 
  course: Course | null, 
  onBack: () => void,
  onStartLearning: () => void,
  onViewNotes: (lesson: Lesson) => void,
  onTakeQuiz: () => void,
  isUnlocked: boolean
}) => {
  if (!course) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 overflow-y-auto pb-24"
    >
      <div className="relative h-56">
        <img src={course.image} alt={course.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{course.category}</span>
            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{course.type}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{course.title}</h2>
          <p className="text-white/70 text-sm">{course.lessons}+ Video Lessons • {isUnlocked ? 'Unlocked' : 'Locked'}</p>
        </div>
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={onStartLearning}
            className="flex-1 bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            <Play size={20} fill="currentColor" />
            {isUnlocked ? 'Continue Learning' : 'Unlock Course'}
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeader title="Course Lessons" />
            <div className="space-y-3">
              {course.lessonList?.map((lesson, idx) => (
                <div 
                  key={lesson.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800">{lesson.title}</h4>
                    <p className="text-[10px] text-gray-500">{lesson.duration} mins</p>
                  </div>
                  {isUnlocked && (
                    <button 
                      onClick={() => onViewNotes(lesson)}
                      className="text-primary p-2 hover:bg-primary/5 rounded-full transition-colors"
                    >
                      <FileText size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="Study Material & Quizzes" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center mb-3">
                  <FileText size={20} />
                </div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">Course Notes</h4>
                <p className="text-[10px] text-blue-700 mb-3">PDF & Text materials</p>
                <button 
                  onClick={() => course.lessonList?.[0] && onViewNotes(course.lessonList[0])}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1"
                >
                  View All <ChevronRight size={12} />
                </button>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <div className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center mb-3">
                  <HelpCircle size={20} />
                </div>
                <h4 className="font-bold text-red-900 text-sm mb-1">Topic Quiz</h4>
                <p className="text-[10px] text-red-700 mb-3">Test your knowledge</p>
                <button 
                  onClick={onTakeQuiz}
                  className="text-xs font-bold text-red-600 flex items-center gap-1"
                >
                  Start Quiz <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">About this course</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              This comprehensive course on {course.title} covers everything from fundamental concepts to advanced applications. 
              Designed for students of {course.category}, it includes high-quality video lectures, detailed notes, and practice quizzes to ensure complete mastery of the subject.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

const LegacyNotesScreen = ({ 
  notes, 
  onViewNote 
}: { 
  notes: Note[], 
  onViewNote: (note: Note) => void 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(notes.map((note) => note.category).filter(Boolean)))];
  const filteredNotes = notes.filter((note) => {
    const matchesCategory = activeCategory === 'All' || note.category === activeCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || note.title.toLowerCase().includes(query)
      || note.category.toLowerCase().includes(query)
      || String(note.content || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 overflow-y-auto bg-[#f5f8fd] p-4 pb-24"
    >
      <div className="mb-5 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, category, or content..."
            className="w-full rounded-2xl border border-slate-200 bg-[#f8fbff] py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-lg shadow-blue-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
            {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700">
          {filteredNotes.length} note{filteredNotes.length === 1 ? '' : 's'} found
        </div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
          {activeCategory}
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotes.map(note => (
          <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-800">{note.title}</h3>
              <p className="text-[10px] text-gray-500">{note.lessons} Detailed Chapters • {note.category}</p>
            </div>
            <button 
              onClick={() => onViewNote(note)}
              className="px-4 py-2 text-primary bg-primary/5 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
            >
              View
            </button>
          </div>
        ))}
        {!filteredNotes.length && (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center text-sm text-slate-500">
            No notes matched your search.
          </div>
        )}
      </div>
    </motion.div>
  );
};

const NotesScreen = ({
  notes,
  onViewNote
}: {
  notes: Note[],
  onViewNote: (note: Note) => void
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const isLoading = false;
  const chipLabels = ['All', 'Class 12', 'Chemistry', 'Inorganic', 'Organic', 'Physics'];
  const noteSizes = ['2.4 MB', '1.8 MB', '2.1 MB', '2.7 MB', '1.6 MB', '2.9 MB'];

  const titleCasePdf = (title: string) => {
    const normalized = title.replace(/\s+/g, ' ').trim();
    const extensionMatch = normalized.match(/(\.[a-z0-9]+)$/i);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    const base = extension ? normalized.slice(0, -extension.length) : normalized;
    return `${base.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())}${extension}`;
  };

  const matchesChip = (note: Note, chip: string) => {
    const haystack = `${note.title} ${note.category} ${note.content || ''}`.toLowerCase();
    if (chip === 'All') return true;
    if (chip === 'Class 12') return haystack.includes('class 12');
    if (chip === 'Chemistry') return haystack.includes('chemistry');
    if (chip === 'Inorganic') return haystack.includes('inorganic');
    if (chip === 'Organic') return haystack.includes('organic') && !haystack.includes('inorganic');
    if (chip === 'Physics') return haystack.includes('physics');
    return true;
  };

  const selectedBadge = activeCategory === 'All'
    ? 'All Study Notes'
    : activeCategory === 'Inorganic'
      ? 'Chemistry - Class 12 Inorganic'
      : activeCategory === 'Organic'
        ? 'Chemistry - Class 12 Organic'
        : activeCategory === 'Physics'
          ? 'Physics - Study Notes'
          : 'Chemistry - Class 12';

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.trim().toLowerCase();
    const searchable = `${note.title} ${note.category} ${note.content || ''}`.toLowerCase();
    return matchesChip(note, activeCategory) && (!query || searchable.includes(query));
  });

  const chipIcon = (chip: string) => {
    if (chip === 'Chemistry') return <FlaskConical size={16} />;
    if (chip === 'Class 12') return <BookOpen size={16} />;
    if (chip === 'All') return <FileText size={16} />;
    if (chip === 'Physics') return <Settings size={16} />;
    return <Filter size={16} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto bg-gradient-to-b from-[#F6F8FF] to-[#EEF3FF] px-4 pb-24 pt-4 text-slate-900"
    >
      <div className="sticky top-0 z-20 -mx-1 mb-7 rounded-[30px] bg-white/55 p-4 shadow-[0_22px_60px_rgba(55,91,170,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white/70 backdrop-blur-2xl">
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={21} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search notes, chapters, subjects..."
            className="h-16 w-full rounded-[24px] bg-white/85 pl-14 pr-16 text-sm font-medium text-slate-700 shadow-[8px_10px_24px_rgba(99,126,191,0.14),-8px_-8px_18px_rgba(255,255,255,0.95),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none ring-1 ring-white/80 transition focus:shadow-[0_0_0_4px_rgba(59,130,246,0.14),8px_10px_24px_rgba(99,126,191,0.14)]"
          />
          <button type="button" aria-label="Filter notes" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-[16px] bg-white text-blue-600 shadow-[0_10px_22px_rgba(70,101,170,0.16)] transition active:scale-95">
            <Filter size={20} />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {chipLabels.map((chip) => {
            const isActive = activeCategory === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveCategory(chip)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#60A5FA] to-[#2448F5] text-white shadow-[0_16px_30px_rgba(37,99,235,0.30)]'
                    : 'bg-white/95 text-slate-800 shadow-[7px_9px_20px_rgba(99,126,191,0.14),-6px_-6px_16px_rgba(255,255,255,0.9)]'
                }`}
              >
                {chipIcon(chip)}
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-[22px] font-black tracking-tight text-[#10224A]">
            {filteredNotes.length} Notes Found
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">High quality study notes for your preparation</p>
        </div>
        <div className="rounded-full bg-gradient-to-br from-[#5CB6FF] to-[#2450F5] px-4 py-2 text-[11px] font-extrabold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)]">
          {selectedBadge}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-[24px] bg-white/80 p-5 shadow-[0_18px_42px_rgba(70,101,170,0.12)]">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-[22px] bg-blue-100" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/3 rounded-full bg-slate-200" />
                  <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {filteredNotes.map((note, index) => {
            const tones = [
              { icon: 'text-blue-600 bg-blue-50', button: 'from-[#5EA8FF] to-[#2547F4]', tag: 'bg-blue-50 text-blue-700' },
              { icon: 'text-violet-600 bg-violet-50', button: 'from-[#B15CFF] to-[#7437EA]', tag: 'bg-violet-50 text-violet-700' },
              { icon: 'text-emerald-600 bg-emerald-50', button: 'from-[#4DD383] to-[#10B981]', tag: 'bg-emerald-50 text-emerald-700' },
              { icon: 'text-amber-600 bg-amber-50', button: 'from-[#FDBA3B] to-[#F59E0B]', tag: 'bg-amber-50 text-amber-700' },
            ][index % 4];

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.2) }}
                whileTap={{ scale: 0.985 }}
                className="rounded-[24px] bg-white/92 p-4 shadow-[0_18px_42px_rgba(70,101,170,0.13),inset_0_1px_0_rgba(255,255,255,0.95)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(70,101,170,0.18)] sm:p-5"
              >
                <div className="flex items-center gap-4">
                  <div className={`grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[22px] ${tones.icon} shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]`}>
                    <div className="relative">
                      <FileText size={36} strokeWidth={2.3} />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                        PDF
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black tracking-tight text-[#10224A]">{titleCasePdf(note.title)}</h3>
                    <p className="mt-1 truncate text-xs font-medium text-slate-500">
                      {note.lessons || 1} Detailed Chapter &bull; Chemistry &bull; Class 12
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
                      <span className={`rounded-full px-2.5 py-1 ${tones.tag}`}>PDF</span>
                      <span className="h-4 w-px bg-slate-200" />
                      <span className="text-slate-500">{noteSizes[index % noteSizes.length]}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewNote(note)}
                    className={`shrink-0 rounded-[16px] bg-gradient-to-br ${tones.button} px-5 py-3 text-sm font-black text-white shadow-[0_12px_22px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 active:scale-95`}
                  >
                    View
                  </button>
                </div>
              </motion.div>
            );
          })}

          {!filteredNotes.length && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[28px] border border-dashed border-blue-200/80 bg-white/45 px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
            >
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 shadow-[0_16px_28px_rgba(37,99,235,0.14)]">
                <FileText size={30} />
              </div>
              <h3 className="text-lg font-black text-[#10224A]">No notes found</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">Try adjusting your search or filter to find what you need.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-blue-600 shadow-[0_12px_24px_rgba(70,101,170,0.16)] transition active:scale-95"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

const QuizScreen = ({ quizzes, initialQuiz }: { quizzes: Quiz[], initialQuiz?: Quiz | null }) => {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(initialQuiz || null);
  const [isQuizStarted, setIsQuizStarted] = useState(!!initialQuiz);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const playSound = (type: 'correct' | 'incorrect') => {
    const correctSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    const incorrectSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
    
    if (type === 'correct') {
      correctSound.play().catch(e => console.log('Audio play blocked'));
    } else {
      incorrectSound.play().catch(e => console.log('Audio play blocked'));
    }
  };

  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsQuizStarted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResults(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleStartQuiz = () => {
    setIsQuizStarted(true);
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    
    setSelectedOption(index);
    setIsAnswered(true);
    
    const isCorrect = index === selectedQuiz?.questions[currentQuestionIndex].correctAnswer;
    if (isCorrect) {
      setScore(prev => prev + 1);
      playSound('correct');
    } else {
      playSound('incorrect');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < (selectedQuiz?.questions.length || 0)) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setSelectedQuiz(null);
    setIsQuizStarted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResults(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  if (!selectedQuiz) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="flex-1 p-4 overflow-y-auto pb-24"
      >
        <SectionHeader title="Choose Subject" />
        <p className="text-xs text-gray-500 mb-6 -mt-4">Select a subject to test your knowledge</p>
        <div className="grid grid-cols-1 gap-4">
          {quizzes.map((quiz) => (
            <button 
              key={quiz.id} 
              onClick={() => handleSelectQuiz(quiz)}
              className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <HelpCircle size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800">{quiz.topic} Quiz</h3>
                  <p className="text-xs text-gray-500">{quiz.questions.length} Questions Available</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!isQuizStarted) {
    return (
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="flex-1 p-6 flex flex-col items-center justify-center text-center"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
          <HelpCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedQuiz.topic} Quiz</h2>
        <p className="text-gray-500 mb-8 max-w-[280px]">
          Test your knowledge in {selectedQuiz.topic}. This quiz contains {selectedQuiz.questions.length} questions.
        </p>
        
        <div className="w-full space-y-4 max-w-xs">
          <button 
            onClick={handleStartQuiz}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-100 transition-transform active:scale-95"
          >
            Play Quiz
          </button>
          <button 
            onClick={() => setSelectedQuiz(null)}
            className="w-full bg-gray-100 text-gray-600 py-4 rounded-xl font-bold"
          >
            Back to Subjects
          </button>
        </div>
      </motion.div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / selectedQuiz.questions.length) * 100);
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="flex-1 flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Completed!</h2>
        <p className="text-gray-500 mb-8">You scored {score} out of {selectedQuiz.questions.length}</p>
        
        <div className="w-full max-w-xs bg-gray-50 rounded-2xl p-6 mb-8">
          <div className="text-4xl font-black text-primary mb-1">{percentage}%</div>
          <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">Accuracy Score</div>
        </div>

        <button 
          onClick={handleRestart}
          className="w-full max-w-xs bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100"
        >
          Try Another Quiz
        </button>
      </motion.div>
    );
  }

  const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 flex flex-col p-4 overflow-y-auto pb-24"
    >
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</span>
          <span className="text-xs text-gray-400">Score: {score}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            className="h-full bg-primary"
          />
        </div>
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-bold text-gray-800 mb-8">{currentQuestion.text}</h2>
        {currentQuestion.image_url && (
          <div className="mb-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <img
              src={currentQuestion.image_url}
              alt={`Question ${currentQuestionIndex + 1}`}
              className="w-full max-h-72 object-contain bg-slate-50"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const optionImage = currentQuestion.option_images?.[idx];
            let variant = 'default';
            if (isAnswered) {
              if (idx === currentQuestion.correctAnswer) variant = 'correct';
              else if (idx === selectedOption) variant = 'incorrect';
            }

            return (
              <button 
                key={idx}
                disabled={isAnswered}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  variant === 'correct' ? 'bg-green-50 border-green-500 text-green-700' :
                  variant === 'incorrect' ? 'bg-red-50 border-red-500 text-red-700' :
                  selectedOption === idx ? 'bg-primary/5 border-primary text-primary' :
                  'bg-white border-gray-100 text-gray-700 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-sm ${
                    variant === 'correct' ? 'border-green-500 bg-green-500 text-white' :
                    variant === 'incorrect' ? 'border-red-500 bg-red-500 text-white' :
                    selectedOption === idx ? 'border-primary bg-primary text-white' :
                    'border-gray-200 text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium block">{option}</span>
                    {optionImage && (
                      <img
                        src={optionImage}
                        alt={`${option} option`}
                        className="mt-3 w-full max-w-[180px] rounded-2xl border border-gray-100 object-contain bg-slate-50"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>
                {variant === 'correct' && <CheckCircle2 size={18} className="text-green-500" />}
                {variant === 'incorrect' && <XCircle size={18} className="text-red-500" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-xl border ${
                selectedOption === currentQuestion.correctAnswer 
                  ? 'bg-green-50 border-green-100' 
                  : 'bg-red-50 border-red-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 font-bold text-sm ${
                  selectedOption === currentQuestion.correctAnswer ? 'text-green-700' : 'text-red-700'
                }`}>
                  {selectedOption === currentQuestion.correctAnswer ? (
                    <><CheckCircle2 size={18} /> Correct Answer!</>
                  ) : (
                    <><XCircle size={18} /> Wrong Answer!</>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-widest font-black opacity-30">Feedback</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                  <HelpCircle size={14} />
                  Explanation
                </div>
                <p className={`text-sm leading-relaxed ${
                  selectedOption === currentQuestion.correctAnswer ? 'text-green-800/80' : 'text-red-800/80'
                }`}>
                  {currentQuestion.explanation || "No explanation available for this question."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button 
        disabled={!isAnswered}
        onClick={handleNextQuestion}
        className={`mt-8 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          !isAnswered 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-primary text-white shadow-lg shadow-blue-100'
        }`}
      >
        {currentQuestionIndex + 1 === selectedQuiz.questions.length ? 'Finish Quiz' : 'Next Question'}
        <ArrowRight size={18} />
      </button>
    </motion.div>
  );
};

const ProfileScreen = ({
  user,
  onLogout,
  onOpenSettings,
  onOpenProfileInfo,
  onOpenMyCourses,
  onOpenOfflineNotes
}: {
  user: any,
  onLogout: () => void,
  onOpenSettings: () => void,
  onOpenProfileInfo: () => void,
  onOpenMyCourses: () => void,
  onOpenOfflineNotes: () => void
}) => {
  const menuItems = [
    { icon: <BookOpen size={20} />, label: 'My Courses' },
    { icon: <HelpCircle size={20} />, label: 'Quiz Results' },
    { icon: <Download size={20} />, label: 'Download Note Offline' },
    { icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 flex flex-col overflow-hidden"
    >
      <button
        type="button"
        onClick={onOpenProfileInfo}
        className="bg-primary pt-8 pb-12 px-6 text-center relative w-full"
      >
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-white/30 p-1 mb-4">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Student'}`} alt="Profile" className="w-full h-full rounded-full bg-white" referrerPolicy="no-referrer" />
          </div>
          <h2 className="text-xl font-bold text-white">{user?.name || 'Student'}</h2>
          <p className="text-white/70 text-sm">{user?.email || 'rahul.sharma@gmail.com'}</p>
          <div className="mt-3 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white">
            Open Profile Management
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-50 rounded-t-[32px]"></div>
      </button>

      <div className="flex-1 bg-gray-50 px-6 pb-24 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.label === 'My Courses') onOpenMyCourses();
                if (item.label === 'Download Note Offline') onOpenOfflineNotes();
                if (item.label === 'Settings') onOpenSettings();
              }}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="text-primary">{item.icon}</div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          ))}
        </div>

        <button 
          onClick={onLogout}
          className="w-full mt-6 py-4 rounded-xl border border-gray-200 text-gray-500 font-bold flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </motion.div>
  );
};

const SettingsScreen = ({
  user,
  darkModeEnabled,
  onToggleDarkMode,
  onOpenProfileInfo,
  onOpenHelpCenter
}: {
  user: any,
  darkModeEnabled: boolean,
  onToggleDarkMode: () => void,
  onOpenProfileInfo: () => void,
  onOpenHelpCenter: () => void
}) => {
  const [downloadOnWifi, setDownloadOnWifi] = useState(true);

  const toggleRow = (
    label: string,
    description: string,
    enabled: boolean,
    onToggle: () => void
  ) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-gray-800">{label}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-14 h-8 rounded-full p-1 transition-colors ${enabled ? 'bg-primary' : 'bg-gray-200'}`}
      >
        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </button>
    </div>
  );

  const infoRow = (label: string, value: string, onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4 text-left"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-800">{label}</h3>
        <p className="text-xs text-gray-500 mt-1">{value}</p>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50"
    >
      <div className="bg-[linear-gradient(135deg,#0b56c4_0%,#00357f_100%)] rounded-[28px] p-5 text-white shadow-xl shadow-blue-100 mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2">Preferences</p>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-sm text-white/75">Manage account preferences, support pages, and your study experience.</p>

        <div className="mt-5 bg-white/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/30 bg-white/10">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Student'}`} alt="Profile" className="w-full h-full" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="font-bold">{user?.name || 'Student'}</div>
            <div className="text-xs text-white/70">{user?.email || 'student@academy.com'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <section>
          <SectionHeader title="App Preferences" />
          <div className="space-y-3">
            {toggleRow('Dark Mode', 'Switch the entire academy app to a darker reading theme.', darkModeEnabled, onToggleDarkMode)}
            {toggleRow('Download on Wi-Fi Only', 'Use Wi-Fi when downloading study material.', downloadOnWifi, () => setDownloadOnWifi(!downloadOnWifi))}
          </div>
        </section>

        <section>
          <SectionHeader title="Account" />
          <div className="space-y-3">
            {infoRow('Profile Information', 'Change student name and password. Email stays fixed.', onOpenProfileInfo)}
            {infoRow('Security', 'Password and account protection settings')}
            {infoRow('Language', 'English')}
          </div>
        </section>

        <section>
          <SectionHeader title="Support" />
          <div className="space-y-3">
            {infoRow('Help Center', 'Get help with courses, notes, quizzes, and access', onOpenHelpCenter)}
            {infoRow('Privacy Policy', 'How your data is used in the academy app')}
            {infoRow('App Version', 'RBS Academy v1.0.0')}
          </div>
        </section>
      </div>
    </motion.div>
  );
};

const ProfileEditScreen = ({
  user,
  onSave
}: {
  user: AuthUser,
  onSave: (payload: { name: string; password?: string }) => Promise<{ success: boolean; message?: string }>
}) => {
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter your name');
      setMessage('');
      return;
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters');
      setMessage('');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const result = await onSave({
      name: trimmedName,
      password: password || undefined
    });

    if (result.success) {
      setMessage(result.message || 'Profile updated successfully');
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(result.message || 'Unable to update profile');
    }

    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50"
    >
      <div className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-slate-200/60 p-5">
        <div className="bg-[linear-gradient(135deg,#0b56c4_0%,#00357f_100%)] rounded-[24px] p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2">Account</p>
          <h2 className="text-2xl font-bold">Profile Information</h2>
          <p className="text-sm text-white/75 mt-2">Update the student name and password. The account email stays locked and cannot be changed.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Student Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-primary"
              placeholder="Enter student name"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Email Address</label>
            <input
              value={user.email}
              readOnly
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-primary"
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-primary"
              placeholder="Re-enter new password"
            />
          </div>

          {message && (
            <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-primary text-white font-bold py-3 shadow-lg shadow-blue-100 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const HelpCenterScreen = () => {
  const helpCards = [
    {
      title: 'Course Access',
      description: 'Premium courses unlock after the correct access code is verified or granted by admin.'
    },
    {
      title: 'Notes & PDFs',
      description: 'Notes open directly inside the app or from the hosted note URL added in the admin panel.'
    },
    {
      title: 'Quizzes',
      description: 'Quizzes load from the academy database. If a quiz is missing, ask admin to publish it from the panel.'
    },
    {
      title: 'Account Support',
      description: 'Use Profile Information to update your student name. Email stays linked to your signup account.'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50"
    >
      <div className="bg-[linear-gradient(135deg,#0b56c4_0%,#00357f_100%)] rounded-[28px] p-5 text-white shadow-xl shadow-blue-100">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2">Support</p>
        <h2 className="text-2xl font-bold">Help Center</h2>
        <p className="text-sm text-white/75 mt-2">Everything students need for courses, notes, access, and account help.</p>
      </div>

      <div className="mt-5 space-y-4">
        {helpCards.map((card) => (
          <div key={card.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-base font-bold text-gray-800">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-2">{card.description}</p>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-800">Need Direct Help?</h3>
          <p className="text-sm text-gray-500 mt-2">Contact the academy admin if your premium access, notes, or quiz data is not showing correctly.</p>
        </div>
      </div>
    </motion.div>
  );
};

const AboutUsScreen = () => {
  const chemistryPoints = ['Concept Clarity', 'Smart Notes', 'Exam Practice'];

  const affiliations = [
    {
      name: 'Kathmandu Model College',
      role: 'Academic Association',
      logo: 'https://merocollege.com/wp-content/uploads/2020/01/Kathmandu-Model-College-KMC-Logo.png',
    },
    {
      name: 'Saral Shikshya',
      role: 'Learning Platform Partner',
      logo: 'https://saralgate.saralshikshya.org/backend/media/Saral%20Shikshya%20Academy/Saral_Shikshya_8z2DQTn.png',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#d9f2ff_0%,#f8fcff_38%,#eef8f2_100%)] p-4 pb-24"
    >
      <div className="overflow-hidden rounded-[36px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
        <div className="relative h-[320px] sm:h-[360px]">
          <img
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhvgoKhcfed24WTxNsPHaWpVqqAX3Utkpbx32ag9aeE_8B_Bqv0j9fwP_vJNGgamPjvw7vYmzkxX4-Od6AuyAY9bNud5O2nwybZJ3axd4Krfx18vj2raht8vdB8_abprhfauSRH6CDMMw0RkOcU2ZNV4eIQcobQ8d_jxeDDd0vaTj1eB1IZ9q27PzMeog/s1600/ma.png"
            alt="Ravi Bhushna Sharma"
            className="h-full w-full object-cover object-top"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,28,52,0.68)_0%,rgba(9,74,117,0.56)_48%,rgba(13,148,136,0.40)_100%)]" />
          <div className="absolute -left-8 top-10 h-28 w-28 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 text-white sm:p-6">
            <div className="rounded-[28px] border-4 border-white/20 bg-white/10 p-1 shadow-2xl backdrop-blur-sm">
              <img
                src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhvgoKhcfed24WTxNsPHaWpVqqAX3Utkpbx32ag9aeE_8B_Bqv0j9fwP_vJNGgamPjvw7vYmzkxX4-Od6AuyAY9bNud5O2nwybZJ3axd4Krfx18vj2raht8vdB8_abprhfauSRH6CDMMw0RkOcU2ZNV4eIQcobQ8d_jxeDDd0vaTj1eB1IZ9q27PzMeog/s1600/ma.png"
                alt="Ravi Bhushna Sharma portrait"
                className="h-20 w-20 rounded-[22px] object-cover object-top sm:h-24 sm:w-24"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-sm">
                <FlaskConical size={13} />
                Chemistry Faculty
              </div>
              <h2 className="mt-3 text-3xl font-black leading-none sm:text-[2.75rem]">Ravi Bhushna Sharma</h2>
              <p className="mt-2 text-sm font-semibold text-white/80 sm:text-base">Kathmandu Chemistry Lecturer</p>
            </div>
          </div>
        </div>

        <div className="bg-[linear-gradient(140deg,#082847_0%,#0f4a76_48%,#15958c_100%)] px-5 py-5 text-white sm:px-6">
          <div className="flex flex-wrap gap-3">
            {chemistryPoints.map((point) => (
              <div key={point} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/92 backdrop-blur-sm">
                {point}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Subject</div>
              <div className="mt-2 text-lg font-black">Chemistry</div>
            </div>
            <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Role</div>
              <div className="mt-2 text-lg font-black">Lecturer</div>
            </div>
            <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">City</div>
              <div className="mt-2 text-lg font-black">Kathmandu</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="rounded-[32px] border border-slate-100 bg-white/92 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Affiliations</div>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Trusted Learning Links</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d8f3ff_0%,#e7fff7_100%)] text-cyan-700">
              <BookOpen size={22} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {affiliations.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 + index * 0.08 }}
                className="rounded-[28px] border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex h-24 items-center justify-center rounded-[22px] bg-white p-4 shadow-sm">
                  <img
                    src={item.logo}
                    alt={item.name}
                    className="max-h-full w-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.role}</div>
                <div className="mt-2 text-lg font-black text-slate-950">{item.name}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="rounded-[32px] border border-slate-100 bg-white/92 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Contact</div>
          <div className="mt-3 rounded-[28px] bg-[linear-gradient(145deg,#081a32_0%,#143f68_100%)] p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Phone size={24} />
            </div>
            <div className="mt-5 text-sm text-white/70">Call for chemistry guidance</div>
            <div className="mt-2 text-3xl font-black tracking-tight">9819239480</div>
            <button
              type="button"
              onClick={() => openExternalResource('tel:9819239480')}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-900"
            >
              <Phone size={16} />
              Contact Now
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const AboutDeveloperScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50"
  >
    <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-xl shadow-slate-200/60">
      <div className="relative h-56">
        <img
          src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj5gE5usoG8x-m_ntz8ez29lTJcKnhunWSy1UXIJNi-gJ0nb7kOs4ODDfQtp_vfjSgRRJeAWALNO24VYpwQ9fz7B9Qw8_pTA2p5HE9N8VqPLP4tZyHvOFIVVReUGlmH053cgTU0HIMeWyk0L5LXGmujE046sAqdRNlUN60C5qU6o8DtcYk-hqL5ASuapw/s1600/ChatGPT%20Image%20Apr%2020,%202026,%2012_19_51%20AM.png"
          alt="Developer workspace"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.82)_0%,rgba(11,86,196,0.72)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-6 text-white">
          <img
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjx9lK0YYowt9iTo4ZvzTVh_DHsZYijgp3X3h4KYFKAo0ObGBJudHnG_wBP7QXJo03uFP0I1EF2THef0WoiwzG-e6rshprmrgFMhGzzaHgM1gf9RPFFGsNV1arKTjfBLEwKL7qmNQCt2S0JRD5KprHfTE5NrVc5gTJp-R6WGqoffZCqkSC6cNyK9Rt46A/s595/Screenshot%202025-12-18%20193226.png"
            alt="Developer portrait"
            className="h-20 w-20 rounded-3xl border-4 border-white/25 object-cover shadow-lg"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Developer</p>
            <h2 className="text-2xl font-black">Sachin Kushwaha</h2>
            <p className="text-sm text-white/75">Founder of Pranam Software</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-[24px] bg-blue-50 p-5">
          <h3 className="text-base font-black text-slate-900">About The Developer</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sachin Kushwaha is the founder of Pranam Software. This platform is built in Pranam Software with a focus on education products, admin systems, and smooth student experiences across web platforms.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-[24px] border border-gray-100 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Experience</div>
            <div className="mt-2 text-lg font-black text-slate-900">6+ Years</div>
            <div className="mt-1 text-sm text-slate-500">Web apps, admin panels, learning systems</div>
          </div>
          <div className="rounded-[24px] border border-gray-100 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Focus</div>
            <div className="mt-2 text-lg font-black text-slate-900">EdTech UI</div>
            <div className="mt-1 text-sm text-slate-500">Student-first products and premium dashboards</div>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-100 bg-slate-950 p-5 text-white">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Contact</div>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <div>Email: contact.pranamsoftware@gmail.com</div>
            <div>Phone: +977-9823415625</div>
            <div>Location: Maitidevi, Kathmandu</div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

const PrivacyPolicyScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50"
  >
    <div className="bg-[linear-gradient(135deg,#0b56c4_0%,#00357f_100%)] rounded-[28px] p-5 text-white shadow-xl shadow-blue-100">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2">Policy</p>
      <h2 className="text-2xl font-bold">Privacy Policy</h2>
      <p className="text-sm text-white/75 mt-2">A simple overview of what student information is stored and how it is used inside the academy app.</p>
    </div>

    <div className="mt-5 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-800">Information We Store</h3>
        <p className="text-sm text-gray-500 mt-2">The academy may store student details such as name, email, password, course access, notes progress, and quiz-related data needed to run the platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-800">Why We Use It</h3>
        <p className="text-sm text-gray-500 mt-2">This information is used to authenticate students, provide access to free and premium content, and keep the learning experience personalized and functional.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-800">Admin Access</h3>
        <p className="text-sm text-gray-500 mt-2">Only academy admins should manage student data, access codes, course content, and internal educational records.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-800">Support</h3>
        <p className="text-sm text-gray-500 mt-2">If a student has concerns about account data or access, they should contact the academy admin directly.</p>
      </div>
    </div>
  </motion.div>
);

const MyCoursesScreen = ({
  courses,
  unlockedCourseIds,
  onCourseSelect
}: {
  courses: Course[],
  unlockedCourseIds: string[],
  onCourseSelect: (course: Course) => void
}) => {
  const visibleCourses = courses.filter((course) => unlockedCourseIds.includes(course.id));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
      <div className="bg-[linear-gradient(135deg,#0b56c4_0%,#00357f_100%)] rounded-[28px] p-5 text-white shadow-xl shadow-blue-100">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2">Chemistry Learning</p>
        <h2 className="text-2xl font-bold">My Courses</h2>
        <p className="text-sm text-white/75 mt-2">Continue learning with the currently available chemistry courses.</p>
      </div>

      <div className="mt-5 space-y-4">
        {visibleCourses.length ? visibleCourses.map((course) => (
          <button
            key={course.id}
            onClick={() => onCourseSelect(course)}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 text-left"
          >
            <img src={course.image} alt={course.title} className="w-20 h-20 rounded-2xl object-cover" referrerPolicy="no-referrer" />
            <div className="flex-1">
              <div className="text-base font-bold text-gray-800">{course.title}</div>
              <div className="text-sm text-gray-500 mt-1">{course.category}</div>
              <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${course.type === 'premium' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                {course.type === 'premium' ? 'Premium Unlocked' : 'Available Now'}
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        )) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <div className="text-base font-bold text-gray-800">No courses available yet</div>
            <div className="text-sm text-gray-500 mt-2">Available courses will appear here automatically.</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const OfflineNotesScreen = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
    <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(145deg,#082847_0%,#0f4a76_48%,#15958c_100%)] p-5 text-center text-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
      <motion.div
        animate={{ y: [0, -10, 0], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-6 top-6 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, 12, 0], opacity: [0.3, 0.65, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
        className="absolute right-0 top-10 h-28 w-28 rounded-full bg-emerald-300/20 blur-3xl"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-sm"
        >
          <Download size={32} />
        </motion.div>
      </motion.div>
      <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-sm">
        Offline Notes
      </div>
      <h2 className="mt-4 text-3xl font-black tracking-tight">Beautiful Offline Downloads Are On The Way</h2>
      <div className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
        Premium Update Incoming
      </div>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/78">
        Offline note downloads will be added in a future release. Right now, study materials continue opening online smoothly.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {['Fast Access', 'Cleaner Notes', 'Smart Sync'].map((item, index) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
            className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-sm font-bold text-white/90 backdrop-blur-sm"
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
);

const SupportChatScreen = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
    <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(145deg,#091a34_0%,#153b63_48%,#0d9488_100%)] p-5 text-center text-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
      <motion.div
        animate={{ x: [0, 18, 0], opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, -10, 0], opacity: [0.25, 0.7, 0.25] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        className="absolute right-0 top-6 h-28 w-28 rounded-full bg-emerald-300/20 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-sm"
      >
        <MessageSquare size={32} />
      </motion.div>
      <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-sm">
        Support Chat
      </div>
      <h2 className="mt-4 text-3xl font-black tracking-tight">Coming Soon</h2>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/78">
        Live student support chat is being prepared with a cleaner and faster experience for the next update.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {['Live Replies', 'Student Help', 'Quick Support'].map((item, index) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
            className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-4 text-sm font-bold text-white/90 backdrop-blur-sm"
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
);

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });

const fileToText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsText(file);
  });

const getImportedQuestionSource = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = (payload && typeof payload === 'object' ? payload : {}) as {
    questions?: unknown[];
    quiz?: { questions?: unknown[] };
    data?: { questions?: unknown[] };
  };

  if (Array.isArray(record.questions)) {
    return record.questions;
  }

  if (Array.isArray(record.quiz?.questions)) {
    return record.quiz.questions;
  }

  if (Array.isArray(record.data?.questions)) {
    return record.data.questions;
  }

  return [];
};

const getImportedQuestionOptions = (record: Record<string, unknown>) => {
  if (Array.isArray(record.options)) {
    const options = record.options.map((option) => {
      if (option && typeof option === 'object') {
        const item = option as Record<string, unknown>;
        return {
          text: String(item.text || item.label || item.option || '').trim(),
          image_url: String(item.image_url || item.image || item.imageUrl || '').trim(),
        };
      }

      return {
        text: String(option).trim(),
        image_url: '',
      };
    }).filter((option) => option.text);

    return {
      options: options.map((option) => option.text),
      option_images: options.map((option) => option.image_url),
    };
  }

  const keyedOptions = [
    ['option1', 'option1_image'],
    ['option2', 'option2_image'],
    ['option3', 'option3_image'],
    ['option4', 'option4_image'],
    ['option5', 'option5_image'],
    ['a', 'a_image'],
    ['b', 'b_image'],
    ['c', 'c_image'],
    ['d', 'd_image'],
    ['e', 'e_image'],
  ].map(([key, imageKey]) => ({
    text: String(record[key] || '').trim(),
    image_url: String(record[imageKey] || record[`${key}Image`] || '').trim(),
  })).filter((option) => option.text);

  if (keyedOptions.length >= 2) {
    return {
      options: keyedOptions.map((option) => option.text),
      option_images: keyedOptions.map((option) => option.image_url),
    };
  }

  return {
    options: [],
    option_images: [],
  };
};

const normalizeImportedQuestions = (payload: unknown) => {
  const source = getImportedQuestionSource(payload);

  if (!source.length) {
    throw new Error('JSON file must contain a questions array');
  }

  return source.map((item, index) => {
    const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const text = String(record.text || record.question || record.title || '').trim();
    const { options, option_images } = getImportedQuestionOptions(record);

    if (!text || options.length < 2) {
      throw new Error(`Question ${index + 1} is missing text or enough options`);
    }

    let correctAnswer = 0;
    const answerValue = record.correctAnswer ?? record.answer ?? record.correct_option ?? record.correctOption ?? record.correct ?? 0;
    if (typeof answerValue === 'number' && Number.isFinite(answerValue)) {
      correctAnswer = answerValue;
    } else {
      const normalizedAnswer = String(answerValue).trim();
      const normalizedLetter = normalizedAnswer.toUpperCase();
      if (/^[A-E]$/.test(normalizedLetter)) {
        correctAnswer = normalizedLetter.charCodeAt(0) - 65;
      } else {
        const optionIndex = options.findIndex((option) => option.toLowerCase() === normalizedAnswer.toLowerCase());
        if (optionIndex >= 0) {
          correctAnswer = optionIndex;
        } else {
          const parsedAnswer = Number(normalizedAnswer);
          correctAnswer = Number.isFinite(parsedAnswer) ? parsedAnswer : 0;
        }
      }
    }

    if (correctAnswer >= options.length && correctAnswer - 1 < options.length) {
      correctAnswer -= 1;
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      throw new Error(`Question ${index + 1} has an invalid correct answer`);
    }

    return {
      text,
      options,
      option_images,
      correctAnswer,
      explanation: String(record.explanation || '').trim(),
      image_url: String(record.image_url || record.imageUrl || record.image || record.questionImage || '').trim(),
    };
  });
};

const openExternalResource = (url?: string) => {
  const value = String(url || '').trim();
  if (!value || typeof window === 'undefined') {
    return false;
  }

  const openedWindow = window.open(value, '_blank', 'noopener,noreferrer');
  if (!openedWindow) {
    window.location.href = value;
  }

  return true;
};

const AdminLoginScreen = ({
  mode,
  onLogin
}: {
  mode: AdminRole,
  onLogin: (session: AdminSession) => void
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          username: username.trim(),
          password,
        }),
      });
      const data = await readJsonResponse(response);

      if (!data.success || !data.session?.token) {
        setError(data.message || 'Invalid admin credentials');
        return;
      }

      onLogin({
        role: data.session.role,
        username: data.session.username,
        token: data.session.token,
        rememberMe,
      });
      return;
    } catch (error) {
      setError('Unable to sign in. Check server admin configuration.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="auth-scenic-shell admin-login admin-login-page min-h-screen w-full flex items-center justify-center px-4 py-8 lg:px-10"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="auth-scenic-card admin-login-card-neo w-full max-w-[440px] px-6 py-6 sm:px-7 sm:py-7"
      >
        <div className="relative z-10">
          <div className="auth-login-brand auth-login-brand--compact">
            <div className="auth-login-badge">RBS Academy</div>
            <div className="auth-login-copy">
              <h1 className="auth-login-title">{mode === 'superadmin' ? 'Super admin access' : 'Admin login'}</h1>
              <p className="auth-login-subtitle">
                {mode === 'superadmin'
                  ? 'Manage academy admins and platform data from one secure place.'
                  : 'Sign in to manage courses, notes, quizzes, access codes, and student records.'}
              </p>
            </div>
          </div>

          <div className="admin-login-chip-row">
            <div className="admin-login-chip">{mode === 'superadmin' ? 'Super Admin' : 'Admin'}</div>
            <div className="admin-login-chip">Secure Access</div>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-4 max-w-sm mx-auto">
            <label className="admin-login-field">
              <span className="admin-login-label">Username</span>
              <div className="admin-login-input-wrap">
                <input
                  className="auth-scenic-input admin-login-underline-input text-sm"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                />
                <Mail size={18} className="admin-login-input-icon" />
              </div>
            </label>

            <label className="admin-login-field">
              <span className="admin-login-label">Password</span>
              <div className="admin-login-input-wrap">
                <input
                  type="password"
                  className="auth-scenic-input admin-login-underline-input text-sm"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
                <Lock size={18} className="admin-login-input-icon" />
              </div>
            </label>

            <div className="admin-login-row">
              <label className="flex items-center gap-2 text-sm text-white/90">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-white/10"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>
            </div>

            {error && <p className="auth-login-error">{error}</p>}

            <button type="submit" className="auth-scenic-button auth-login-submit py-4 text-lg">
              Continue
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdminPanelScreen = ({
  courses,
  notes,
  quizzes,
  sliders,
  users,
  authSession,
  onRefresh,
  onLogout
}: {
  courses: Course[],
  notes: Note[],
  quizzes: Quiz[],
  sliders: SliderItem[],
  users: AdminUser[],
  authSession: AdminSession,
  onRefresh: () => Promise<void>,
  onLogout: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'slider' | 'course' | 'lesson' | 'note' | 'quiz' | 'question' | 'user' | 'access'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingSlider, setUploadingSlider] = useState(false);
  const [editingSliderId, setEditingSliderId] = useState('');
  const [sliderForm, setSliderForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    sort_order: '0',
    is_active: true,
  });
  const [sliderImageFile, setSliderImageFile] = useState<File | null>(null);
  const [sliderPreviewUrl, setSliderPreviewUrl] = useState('');

  const [courseForm, setCourseForm] = useState({
    title: '',
    lessons: '0',
    image: '',
    price: '999',
    oldPrice: '2999',
    type: 'premium',
    category: 'Chemistry',
  });
  const [lessonForm, setLessonForm] = useState({
    course_id: '',
    title: '',
    duration: '',
    note_content: '',
    note_url: '',
    video_url: '',
  });
  const [noteForm, setNoteForm] = useState({
    title: '',
    lessons: '1',
    category: 'Chemistry',
    type: 'free',
    url: '',
    content: '',
  });
  const [quizForm, setQuizForm] = useState({
    topic: '',
    type: 'free',
  });
  const [questionForm, setQuestionForm] = useState({
    id: '',
    quiz_id: '',
    text: '',
    optionsText: '',
    correctAnswer: '0',
    explanation: '',
    image_url: '',
  });
  const [questionImportQuizId, setQuestionImportQuizId] = useState('');
  const [questionImportFile, setQuestionImportFile] = useState<File | null>(null);
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreviewUrl, setQuestionImagePreviewUrl] = useState('');
  const [editingCourseId, setEditingCourseId] = useState('');
  const [editingLessonId, setEditingLessonId] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingQuizId, setEditingQuizId] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => getStoredAdminAccounts());
  const [adminAccountForm, setAdminAccountForm] = useState({ username: '', password: '' });
  const [noteCategories, setNoteCategories] = useState<string[]>(() => getStoredNoteCategories());
  const [newNoteCategory, setNewNoteCategory] = useState('');
  const [customerAccessForm, setCustomerAccessForm] = useState({ userId: '', courseId: '' });
  const [generatedCustomerCode, setGeneratedCustomerCode] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [accessStudentSearchQuery, setAccessStudentSearchQuery] = useState('');
  const [accessCourseSearchQuery, setAccessCourseSearchQuery] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { id: 'slider', label: 'Sliders', icon: <Eye size={18} /> },
    { id: 'course', label: 'Courses', icon: <BookOpen size={18} /> },
    { id: 'lesson', label: 'Videos', icon: <Play size={18} /> },
    { id: 'note', label: 'Notes', icon: <FileText size={18} /> },
    { id: 'quiz', label: 'Quizzes', icon: <HelpCircle size={18} /> },
    { id: 'question', label: 'Questions', icon: <MessageSquare size={18} /> },
    { id: 'user', label: 'Users', icon: <User size={18} /> },
    { id: 'access', label: 'Premium Access', icon: <Lock size={18} /> },
  ] as const;

  const cardClass = 'admin-card admin-surface-card p-5 sm:p-6';
  const lessons = courses.flatMap((course) => course.lessonList || []);
  const questions = quizzes.flatMap((quiz) => quiz.questions.map((question) => ({ ...question, topic: quiz.topic })));
  const normalizedStudentSearch = studentSearchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((userItem) => {
    if (!normalizedStudentSearch) {
      return true;
    }
    return [
      userItem.name,
      userItem.email,
      userItem.id,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedStudentSearch));
  });
  const normalizedAccessStudentSearch = accessStudentSearchQuery.trim().toLowerCase();
  const accessUsers = users.filter((userItem) => {
    if (!normalizedAccessStudentSearch) {
      return true;
    }
    return [
      userItem.name,
      userItem.email,
      userItem.id,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedAccessStudentSearch));
  });
  const normalizedAccessCourseSearch = accessCourseSearchQuery.trim().toLowerCase();
  const premiumCourses = courses.filter((course) => course.type === 'premium');
  const filteredPremiumCourses = premiumCourses.filter((course) => {
    if (!normalizedAccessCourseSearch) {
      return true;
    }
    return [
      course.title,
      course.category,
      course.id,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedAccessCourseSearch));
  });
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Dashboard';
  const adminDisplayName = authSession.username || users[0]?.name || 'RBS Admin';
  const adminInitials = adminDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'AD';
  const activeSliderCount = sliders.filter((slider) => slider.is_active).length;
  const premiumCourseCount = courses.filter((course) => course.type === 'premium').length;
  const freeNoteCount = notes.filter((note) => (note.type || 'free') === 'free').length;
  const alertCount = Math.max(0, premiumCourseCount - activeSliderCount);
  const dashboardStats = [
    { label: 'Total Courses', value: courses.length.toLocaleString(), note: `This month +${Math.max(1, Math.min(12, courses.length))}`, tone: 'slate' },
    { label: 'Lessons Live', value: lessons.length.toLocaleString(), note: `This month +${Math.max(2, Math.min(18, lessons.length))}`, tone: 'teal' },
    { label: 'New Students', value: users.length.toLocaleString(), note: `This month +${Math.max(1, Math.min(25, users.length))}`, tone: 'green' },
    { label: 'Alert', value: `${alertCount}`, note: alertCount ? 'Pending homepage updates' : 'Everything looks good', tone: 'danger' },
  ] as const;
  const chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const overviewSeries = [
    {
      label: 'Sales',
      color: '#3b82f6',
      values: [
        Math.max(2, courses.length - 3),
        Math.max(3, courses.length - 1),
        Math.max(3, courses.length),
        Math.max(4, courses.length + 1),
        Math.max(5, courses.length + 2),
        Math.max(5, courses.length + 1),
        Math.max(6, courses.length + 3),
      ],
    },
    {
      label: 'Revenue',
      color: '#43a047',
      values: [
        Math.max(1, premiumCourseCount),
        Math.max(2, premiumCourseCount + 1),
        Math.max(2, premiumCourseCount + 1),
        Math.max(3, premiumCourseCount + 2),
        Math.max(4, premiumCourseCount + 3),
        Math.max(5, premiumCourseCount + 5),
        Math.max(4, premiumCourseCount + 4),
      ],
    },
  ] as const;
  const chartHeight = 220;
  const chartWidth = 560;
  const chartMax = Math.max(...overviewSeries.flatMap((series) => series.values), 8);
  const buildChartPath = (values: readonly number[]) =>
    values.map((value, index) => {
      const x = (index / (values.length - 1)) * chartWidth;
      const y = chartHeight - (value / chartMax) * (chartHeight - 20);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  const recentItems = [
    { id: courses[0]?.id || '10234', title: courses[0]?.title || 'Science Masterclass', status: 'Published', metric: `${courses[0]?.lessons || 0} lessons`, tone: 'green' },
    { id: quizzes[0]?.id || '10233', title: quizzes[0]?.topic || 'Weekly Quiz Pack', status: 'Processing', metric: `${quizzes[0]?.questions.length || 0} questions`, tone: 'blue' },
    { id: notes[0]?.id || '10232', title: notes[0]?.title || 'Revision Notes', status: 'Delivered', metric: `${notes[0]?.lessons || 0} units`, tone: 'green' },
    { id: sliders[0]?.id || '10231', title: sliders[0]?.title || 'Homepage Banner', status: activeSliderCount ? 'Live' : 'Pending', metric: `${activeSliderCount} active`, tone: activeSliderCount ? 'amber' : 'orange' },
  ];
  const spotlightItems = [
    { label: 'Courses', value: Math.max(24, courses.length * 18) },
    { label: 'Premium', value: Math.max(18, premiumCourseCount * 24) },
    { label: 'Notes', value: Math.max(16, freeNoteCount * 14) },
  ];
  const adminMessages = [
    `${adminDisplayName}: Review new course uploads before publishing.`,
    `${users[1]?.name || 'Priya'}: Student access requests need approval.`,
  ];
  const isSuperAdmin = authSession.role === 'superadmin';
  const adminControlCards: Array<{
    id: typeof activeTab;
    title: string;
    description: string;
    count: string;
    tone: string;
    icon: React.ReactNode;
  }> = [
    { id: 'course', title: 'Courses', description: 'Create, price, edit, and remove premium chemistry courses.', count: `${courses.length} live`, tone: 'blue', icon: <BookOpen size={22} /> },
    { id: 'lesson', title: 'Videos', description: 'Attach video lessons, durations, notes, and resources to any course.', count: `${lessons.length} lessons`, tone: 'green', icon: <Play size={22} /> },
    { id: 'access', title: 'Premium Access', description: 'Generate student-specific access codes for locked courses.', count: `${premiumCourses.length} premium`, tone: 'amber', icon: <Lock size={22} /> },
    { id: 'slider', title: 'Homepage Slider', description: 'Upload banners and control what appears first for students.', count: `${activeSliderCount} active`, tone: 'violet', icon: <Eye size={22} /> },
    { id: 'note', title: 'Notes', description: 'Publish downloadable notes and organize study material categories.', count: `${notes.length} notes`, tone: 'slate', icon: <FileText size={22} /> },
    { id: 'quiz', title: 'Quizzes', description: 'Create quiz sets and manage quiz visibility by topic.', count: `${quizzes.length} quizzes`, tone: 'rose', icon: <HelpCircle size={22} /> },
    { id: 'question', title: 'Questions', description: 'Add MCQs, import JSON question banks, and review answers.', count: `${questions.length} questions`, tone: 'cyan', icon: <MessageSquare size={22} /> },
    { id: 'user', title: 'Students', description: 'Search student records and check unlocked course access.', count: `${users.length} students`, tone: 'emerald', icon: <User size={22} /> },
  ];

  useEffect(() => {
    if (sliderImageFile) {
      const objectUrl = URL.createObjectURL(sliderImageFile);
      setSliderPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setSliderPreviewUrl(sliderForm.image_url || '');
  }, [sliderImageFile, sliderForm.image_url]);

  useEffect(() => {
    if (questionImageFile) {
      const objectUrl = URL.createObjectURL(questionImageFile);
      setQuestionImagePreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setQuestionImagePreviewUrl(questionForm.image_url || '');
  }, [questionImageFile, questionForm.image_url]);

  useEffect(() => {
    setAdminAccounts(getStoredAdminAccounts());
  }, []);

  useEffect(() => {
    const mergedCategories = Array.from(new Set([
      ...getStoredNoteCategories(),
      ...notes.map((note) => note.category).filter(Boolean),
    ]));
    setNoteCategories(mergedCategories);
    saveStoredNoteCategories(mergedCategories);
  }, [notes]);

  const submitAction = async (action: string, payload: Record<string, unknown>, reset: () => void) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await apiPost(action, payload);
      const data = await readJsonResponse(response);
      if (!data.success) {
        setMessage(data.message || 'Request failed');
        setLoading(false);
        return;
      }
      reset();
      try {
        await onRefresh();
      } catch (error) {
        console.error(`${action} succeeded but dashboard refresh failed:`, error);
      }
      setMessage(data.message || 'Saved successfully');
    } catch (error) {
      setMessage('Unable to save data');
    } finally {
      setLoading(false);
    }
  };

  const submitSlider = async () => {
    if (!sliderForm.title.trim() || !sliderForm.subtitle.trim()) {
      setMessage('Slider title and subtitle are required');
      return;
    }

    if (!sliderImageFile && !sliderForm.image_url.trim()) {
      setMessage('Upload a slider image or provide an image URL');
      return;
    }

    setLoading(true);
    setUploadingSlider(true);
    setMessage('');

    try {
      const payload: Record<string, unknown> = {
        ...(editingSliderId ? { id: editingSliderId } : {}),
        title: sliderForm.title,
        subtitle: sliderForm.subtitle,
        image_url: sliderForm.image_url,
        sort_order: Number(sliderForm.sort_order || 0),
        is_active: sliderForm.is_active ? 'true' : 'false',
      };

      if (sliderImageFile) {
        payload.imageData = await fileToDataUrl(sliderImageFile);
        payload.fileName = sliderImageFile.name;
        payload.mimeType = sliderImageFile.type || 'image/jpeg';
      }

      const action = editingSliderId ? 'updateSlider' : 'createSlider';
      const response = await apiPost(action, payload);
      const data = await readJsonResponse(response);

      if (!data.success) {
        setMessage(data.message || 'Unable to save slider');
        return;
      }

      setSliderForm({ title: '', subtitle: '', image_url: '', sort_order: '0', is_active: true });
      setSliderImageFile(null);
      setSliderPreviewUrl('');
      setEditingSliderId('');
      await onRefresh();
      setMessage('Slider saved successfully');
    } catch (error) {
      setMessage(
        sliderImageFile
          ? 'Unable to upload slider image. Check Vercel Blob storage or Apps Script configuration.'
          : 'Unable to upload slider image'
      );
    } finally {
      setLoading(false);
      setUploadingSlider(false);
    }
  };

  const submitQuestionImport = async () => {
    if (!questionImportQuizId) {
      setMessage('Select a quiz before importing questions');
      return;
    }

    if (!questionImportFile) {
      setMessage('Choose a JSON file to import');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const rawText = await fileToText(questionImportFile);
      const parsedJson = JSON.parse(rawText);
      const importedQuestions = normalizeImportedQuestions(parsedJson);
      const response = await apiPost('importQuestions', {
        quiz_id: questionImportQuizId,
        questions: importedQuestions,
      });
      const data = await readJsonResponse(response);
      if (!data.success) {
        throw new Error(data.message || 'Unable to import questions');
      }

      setQuestionImportFile(null);
      setQuestionImportQuizId('');
      await onRefresh();
      setMessage(`${importedQuestions.length} questions imported successfully`);
    } catch (error) {
      try {
        const rawText = await fileToText(questionImportFile);
        const parsedJson = JSON.parse(rawText);
        const importedQuestions = normalizeImportedQuestions(parsedJson);

        for (const question of importedQuestions) {
          const response = await apiPost('createQuestion', {
            quiz_id: questionImportQuizId,
            text: question.text,
            options: question.options,
            option_images: question.option_images || [],
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            image_url: question.image_url,
          });
          const data = await readJsonResponse(response);
          if (!data.success) {
            throw new Error(data.message || 'Unable to import questions');
          }
        }

        setQuestionImportFile(null);
        setQuestionImportQuizId('');
        await onRefresh();
        setMessage('Questions imported successfully');
      } catch (fallbackError) {
        setMessage(fallbackError instanceof Error ? fallbackError.message : 'Unable to import questions');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitQuestion = async () => {
    const options = questionForm.optionsText.split('\n').map((item) => item.trim()).filter(Boolean);
    const correctAnswer = Number(questionForm.correctAnswer || 0);

    if (!questionForm.quiz_id || !questionForm.text.trim() || options.length < 2) {
      setMessage('Quiz, question text, and at least 2 options are required');
      return;
    }

    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
      setMessage('Correct answer index must match one of the provided options');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const payload: Record<string, unknown> = {
        ...(editingQuestionId ? { id: editingQuestionId } : {}),
        quiz_id: questionForm.quiz_id,
        text: questionForm.text.trim(),
        options,
        option_images: [],
        correctAnswer,
        explanation: questionForm.explanation.trim(),
        image_url: questionForm.image_url.trim(),
      };

      if (questionImageFile) {
        payload.questionImageData = await fileToDataUrl(questionImageFile);
      }

      const response = await apiPost(editingQuestionId ? 'updateQuestion' : 'createQuestion', payload);
      const data = await readJsonResponse(response);
      if (!data.success) {
        setMessage(data.message || 'Unable to save question');
        return;
      }

      setQuestionForm({ id: '', quiz_id: '', text: '', optionsText: '', correctAnswer: '0', explanation: '', image_url: '' });
      setQuestionImageFile(null);
      setQuestionImagePreviewUrl('');
      setEditingQuestionId('');
      await onRefresh();
      setMessage(editingQuestionId ? 'Question updated successfully' : 'Question created successfully');
    } catch (error) {
      setMessage('Unable to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdminAccount = () => {
    setAdminAccountForm({ username: '', password: '' });
    setMessage('Admin credentials are now managed by secure server environment variables.');
  };

  const handleDeleteAdminAccount = (accountId: string) => {
    const nextAccounts = getStoredAdminAccounts().filter((account) => account.id !== accountId);
    saveStoredAdminAccounts(nextAccounts);
    setAdminAccounts(nextAccounts);
    setMessage('Local legacy admin account removed');
  };

  const handleAddNoteCategory = () => {
    const category = newNoteCategory.trim();
    if (!category) {
      setMessage('Category name is required');
      return;
    }

    if (noteCategories.some((item) => item.toLowerCase() === category.toLowerCase())) {
      setMessage('Category already exists');
      return;
    }

    const nextCategories = [...noteCategories, category];
    setNoteCategories(nextCategories);
    saveStoredNoteCategories(nextCategories);
    setNoteForm((current) => ({ ...current, category }));
    setNewNoteCategory('');
    setMessage('Note category added successfully');
  };

  const handleGenerateCustomerAccessCode = async () => {
    if (!customerAccessForm.userId || !customerAccessForm.courseId) {
      setMessage('Select a student and premium course first');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await apiPost('grantCourseAccess', {
        userId: customerAccessForm.userId,
        courseId: customerAccessForm.courseId,
      });
      const data = await readJsonResponse(response);
      if (!data.success) {
        setMessage(data.message || 'Unable to generate customer access code');
        return;
      }

      setGeneratedCustomerCode(String(data.accessCode || ''));
      try {
        await onRefresh();
      } catch (error) {
        console.error('Access code generated but dashboard refresh failed:', error);
      }
      setMessage('Customer access code generated successfully');
    } catch {
      setMessage('Unable to generate customer access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-panel min-h-screen w-full">
      <div className="admin-dashboard-wrap">
        <div className="admin-panel-layout">
          <aside className="admin-sidebar-shell">
            <div className="admin-sidebar-brand">
              <div className="admin-sidebar-brand-mark">RBS</div>
              <div>
                <div className="admin-sidebar-brand-title">RBS Academy</div>
                <div className="admin-sidebar-brand-subtitle">Admin Dashboard</div>
              </div>
            </div>

            <nav className="admin-sidebar-nav">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMessage('');
                  }}
                  className={`admin-sidebar-link ${activeTab === tab.id ? 'admin-sidebar-link--active' : ''}`}
                >
                  <span className="admin-sidebar-link-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="admin-sidebar-footer">
              <button onClick={onRefresh} className="admin-sidebar-link">
                <span className="admin-sidebar-link-icon"><ShieldCheck size={18} /></span>
                <span>{activeTabLabel}</span>
              </button>
              <button onClick={onLogout} className="admin-sidebar-link">
                <span className="admin-sidebar-link-icon"><LogOut size={18} /></span>
                <span>Logout</span>
              </button>
            </div>
          </aside>

          <section className="admin-content-shell">
            <header className="admin-reference-topbar">
              <div className="admin-reference-search">
                <Search size={22} />
                <input type="text" placeholder="Search..." aria-label="Search admin dashboard" />
              </div>
              <div className="admin-reference-actions">
                <button type="button" className="admin-bell-button" onClick={onRefresh} aria-label="Refresh dashboard">
                  <Bell size={24} />
                  <span className="admin-bell-badge">{Math.max(1, alertCount || 2)}</span>
                </button>
                <div className="admin-reference-user">
                  <div className="admin-avatar admin-avatar--small">{adminInitials}</div>
                  <span>{adminDisplayName}</span>
                  <ChevronDown size={18} />
                </div>
              </div>
            </header>

            <main className="admin-main space-y-5">

            {message && (
              <div className={`${cardClass} ${message.includes('success') || message.includes('Saved') ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="admin-reference-kpis">
            {dashboardStats.map((item) => (
              <div key={item.label} className={`admin-reference-kpi admin-reference-kpi--${item.tone}`}>
                <div className="admin-reference-kpi-label">{item.label}</div>
                <div className="admin-reference-kpi-value">{item.value}</div>
                <div className="admin-reference-kpi-note">{item.note}</div>
              </div>
            ))}
          </div>

          <div className="admin-control-center">
            <div className="admin-control-center-head">
              <div>
                <p className="admin-control-eyebrow">Single Admin Control</p>
                <h2>Manage everything from one page</h2>
                <span>Courses, videos, notes, quizzes, students, sliders, and premium access stay one click away.</span>
              </div>
              <button type="button" onClick={onRefresh} className="admin-control-refresh">
                <ShieldCheck size={18} />
                Refresh Data
              </button>
            </div>

            <div className="admin-control-grid">
              {adminControlCards.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`admin-control-card admin-control-card--${item.tone}`}
                >
                  <span className="admin-control-icon">{item.icon}</span>
                  <span className="admin-control-copy">
                    <strong>{item.title}</strong>
                    <em>{item.description}</em>
                  </span>
                  <span className="admin-control-count">{item.count}</span>
                  <ChevronRight size={18} className="admin-control-arrow" />
                </button>
              ))}
            </div>
          </div>

          <div className="admin-reference-grid">
            <div className="admin-reference-panel admin-reference-panel--chart">
              <div className="admin-reference-panel-head">
                <h3>Sales Overview</h3>
                <div className="admin-reference-legend">
                  {overviewSeries.map((series) => (
                    <span key={series.label}>
                      <i style={{ backgroundColor: series.color }} />
                      {series.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-line-chart">
                <div className="admin-line-chart-y">
                  {['80k', '60k', '40k', '20k', '0k'].map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="admin-line-chart-canvas">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="admin-line-chart-svg">
                    {[0, 1, 2, 3, 4].map((line) => (
                      <line key={line} x1="0" y1={line * (chartHeight / 4)} x2={chartWidth} y2={line * (chartHeight / 4)} className="admin-chart-grid-line" />
                    ))}
                    {overviewSeries.map((series) => (
                      <path
                        key={series.label}
                        d={buildChartPath(series.values)}
                        fill="none"
                        stroke={series.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {overviewSeries.map((series) =>
                      series.values.map((value, index) => {
                        const x = (index / (series.values.length - 1)) * chartWidth;
                        const y = chartHeight - (value / chartMax) * (chartHeight - 20);
                        return <circle key={`${series.label}-${chartLabels[index]}`} cx={x} cy={y} r="6" fill={series.color} />;
                      })
                    )}
                  </svg>
                  <div className="admin-line-chart-labels">
                    {chartLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-reference-summary">
                <div>
                  <span>Today's Sales</span>
                  <strong>{courses.length + notes.length}</strong>
                </div>
                <div>
                  <span>Weekly Revenue</span>
                  <strong>{questions.length + quizzes.length}</strong>
                </div>
              </div>
            </div>

            <div className="admin-reference-side">
              <div className="admin-reference-panel">
                <div className="admin-reference-panel-head">
                  <h3>Recent Orders</h3>
                  <button type="button" onClick={onRefresh}>View All</button>
                </div>
                <div className="admin-reference-table">
                  <div className="admin-reference-table-head">
                    <span>Order ID</span>
                    <span>Title</span>
                    <span>Status</span>
                    <span>Total</span>
                  </div>
                  {recentItems.map((item) => (
                    <div key={item.id} className="admin-reference-table-row">
                      <span>#{item.id}</span>
                      <span>{item.title}</span>
                      <span><em className={`admin-status-pill admin-status-pill--${item.tone}`}>{item.status}</em></span>
                      <span>{item.metric}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-reference-panel">
                <div className="admin-reference-panel-head">
                  <h3>Customer Messages</h3>
                </div>
                <div className="admin-reference-messages">
                  {adminMessages.map((messageItem) => (
                    <div key={messageItem} className="admin-reference-message">
                      <div className="admin-reference-message-icon">
                        <MessageSquare size={18} />
                      </div>
                      <p>{messageItem}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-reference-bottom">
            <div className="admin-reference-panel">
              <div className="admin-reference-panel-head">
                <h3>Top Products</h3>
              </div>
              <div className="admin-progress-list">
                {spotlightItems.map((item, index) => (
                  <div key={item.label} className="admin-progress-item">
                    <div className="admin-progress-meta">
                      <span>{item.label}</span>
                      <strong>{item.value}%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <div className={`admin-progress-bar admin-progress-bar--${index + 1}`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-reference-panel">
              <div className="admin-reference-panel-head">
                <h3>Quick Actions</h3>
                <button type="button" onClick={() => setActiveTab('course')}>View All</button>
              </div>
              <div className="admin-quick-actions">
                <button onClick={() => setActiveTab('course')} className="admin-quick-action-card">
                  <BookOpen size={20} />
                  <span>Manage Courses</span>
                </button>
                <button onClick={() => setActiveTab('quiz')} className="admin-quick-action-card">
                  <HelpCircle size={20} />
                  <span>Create Quiz</span>
                </button>
                <button onClick={() => setActiveTab('slider')} className="admin-quick-action-card">
                  <Eye size={20} />
                  <span>Update Slider</span>
                </button>
                <button onClick={() => setActiveTab('user')} className="admin-quick-action-card">
                  <User size={20} />
                  <span>Student Data</span>
                </button>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="admin-card p-5">
                <div className="admin-section-head">
                  <div>
                    <h3 className="font-bold text-gray-800">Create Admin</h3>
                    <p className="text-xs text-gray-500 mt-1">Admin credentials are configured securely on the server.</p>
                  </div>
                  <div className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                    Super Admin Only
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                    placeholder="Admin username"
                    value={adminAccountForm.username}
                    onChange={(e) => setAdminAccountForm((current) => ({ ...current, username: e.target.value }))}
                  />
                  <input
                    type="password"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                    placeholder="Admin password"
                    value={adminAccountForm.password}
                    onChange={(e) => setAdminAccountForm((current) => ({ ...current, password: e.target.value }))}
                  />
                  <button type="button" onClick={handleCreateAdminAccount} className="admin-primary-button px-5 py-3 text-sm font-bold">
                    Clear Form
                  </button>
                </div>
              </div>

              <div className="admin-card p-5">
                <div className="admin-section-head">
                  <div>
                    <h3 className="font-bold text-gray-800">Manage Admin Accounts</h3>
                    <p className="text-xs text-gray-500 mt-1">Legacy browser-only admin accounts are no longer trusted for login.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                    {adminAccounts.length} admins
                  </div>
                </div>
                <div className="space-y-3">
                  {adminAccounts.map((account) => (
                    <div key={account.id} className="admin-list-card p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900">{account.username}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Legacy local account
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAdminAccount(account.id)}
                        className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="hidden">
            <div className="admin-card p-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                <h3 className="text-2xl font-black text-slate-900">Manage Courses</h3>
                <button onClick={() => setActiveTab('course')} className="admin-primary-button px-4 py-2 text-sm font-bold">
                  + Add Course
                </button>
              </div>
              <div className="space-y-3">
                {courses.slice(0, 4).map((course) => (
                  <div key={course.id} className="admin-list-card p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <img src={course.image} alt={course.title} className="w-28 h-16 object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <div className="font-bold text-lg text-slate-900 truncate">{course.title}</div>
                        <div className="text-sm text-slate-500 mt-1">{course.category} • {course.type} • {course.lessons} lessons</div>
                      </div>
                    </div>
                    <button onClick={() => {
                      setActiveTab('course');
                      setEditingCourseId(course.id);
                      setCourseForm({
                        title: course.title,
                        lessons: String(course.lessons || 0),
                        image: course.image,
                        price: String(course.price || 0),
                        oldPrice: String(course.oldPrice || 0),
                        type: course.type,
                        category: course.category,
                      });
                    }} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-bold">
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="admin-card p-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                  <h3 className="text-2xl font-black text-slate-900">Quiz Activity</h3>
                  <button onClick={() => setActiveTab('quiz')} className="admin-primary-button px-4 py-2 text-sm font-bold">
                    + Create Quiz
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="admin-soft-panel p-4">
                    <div className="text-sm text-slate-500 mb-1">Quizzes</div>
                    <div className="text-3xl font-black text-slate-900">{quizzes.length}</div>
                  </div>
                  <div className="admin-soft-panel p-4">
                    <div className="text-sm text-slate-500 mb-1">Questions</div>
                    <div className="text-3xl font-black text-slate-900">{questions.length}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {quizzes.slice(0, 5).map((quiz) => (
                    <div key={quiz.id} className="admin-list-card p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900">{quiz.topic}</div>
                        <div className="text-sm text-slate-500 mt-1">{quiz.questions.length} questions</div>
                      </div>
                      <button onClick={() => setActiveTab('question')} className="text-sm font-bold text-primary">
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-card p-5">
                <h3 className="text-2xl font-black text-slate-900 mb-5">Publishing Snapshot</h3>
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Active sliders</span>
                    <span className="font-black text-slate-900">{sliders.filter((slider) => slider.is_active).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Free notes published</span>
                    <span className="font-black text-slate-900">{notes.filter((note) => (note.type || 'free') === 'free').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Premium courses</span>
                    <span className="font-black text-slate-900">{courses.filter((course) => course.type === 'premium').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Video lessons</span>
                    <span className="font-black text-slate-900">{lessons.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'slider' && (
        <div className="space-y-4">
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">{editingSliderId ? 'Edit Slider' : 'Create Slider'}</h3>
                <p className="text-xs text-gray-500 mt-1">Uploaded slider images are saved to Google Drive through Apps Script and shown on the home slider.</p>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-primary">
                Drive Sync
              </div>
            </div>
            <div className="space-y-3">
              <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Slider title" value={sliderForm.title} onChange={(e) => setSliderForm({ ...sliderForm, title: e.target.value })} />
              <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-24" placeholder="Slider subtitle" value={sliderForm.subtitle} onChange={(e) => setSliderForm({ ...sliderForm, subtitle: e.target.value })} />
              <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Existing image URL (optional)" value={sliderForm.image_url} onChange={(e) => setSliderForm({ ...sliderForm, image_url: e.target.value })} />
              {sliderPreviewUrl && (
                <div className="border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Preview</div>
                  <img src={sliderPreviewUrl} alt="Slider preview" className="w-full h-44 object-cover bg-white" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Sort order" value={sliderForm.sort_order} onChange={(e) => setSliderForm({ ...sliderForm, sort_order: e.target.value })} />
                <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  Active on homepage
                  <input type="checkbox" checked={sliderForm.is_active} onChange={(e) => setSliderForm({ ...sliderForm, is_active: e.target.checked })} />
                </label>
              </div>
              <label className="block rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                <span className="block font-bold text-gray-700 mb-2">Upload slider image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) {
                      setSliderImageFile(null);
                      return;
                    }

                    if (!file.type.startsWith('image/')) {
                      setMessage('Please choose a valid image file');
                      e.target.value = '';
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      setMessage('Slider image must be 5 MB or smaller');
                      e.target.value = '';
                      return;
                    }

                    setMessage('');
                    setSliderImageFile(file);
                  }}
                  className="block w-full text-sm"
                />
                <span className="block mt-2 text-xs">{sliderImageFile ? `${sliderImageFile.name} • ${(sliderImageFile.size / 1024 / 1024).toFixed(2)} MB` : 'Choose JPG, PNG, WEBP, or GIF up to 5 MB'}</span>
              </label>
              <button
                disabled={loading || uploadingSlider}
                onClick={submitSlider}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold"
              >
                {loading || uploadingSlider ? 'Uploading...' : editingSliderId ? 'Update Slider' : 'Save Slider'}
              </button>
              {editingSliderId && (
                <button
                  onClick={() => {
                    setEditingSliderId('');
                    setSliderImageFile(null);
                    setSliderPreviewUrl('');
                    setSliderForm({ title: '', subtitle: '', image_url: '', sort_order: '0', is_active: true });
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-bold text-gray-800 mb-4">Manage Homepage Sliders</h3>
            <div className="space-y-3">
              {sliders.length ? [...sliders].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((slider) => (
                <div key={slider.id} className="admin-list-card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <img src={slider.image_url} alt={slider.title} className="w-28 h-20 rounded-2xl object-cover bg-gray-100" referrerPolicy="no-referrer" />
                    <div className="min-w-0">
                      <div className="font-bold text-base text-gray-800 truncate">{slider.title}</div>
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">{slider.subtitle}</div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                        <span>Order {slider.sort_order}</span>
                        <span className={`rounded-full px-2 py-1 font-bold ${slider.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {slider.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingSliderId(slider.id);
                        setSliderImageFile(null);
                        setSliderForm({
                          title: slider.title,
                          subtitle: slider.subtitle,
                          image_url: slider.image_url,
                          sort_order: String(slider.sort_order || 0),
                          is_active: slider.is_active,
                        });
                        setMessage('');
                      }}
                      className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => submitAction('deleteSlider', { id: slider.id }, () => {})}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                  No sliders found yet. Add the first homepage banner from this tab.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'course' && (
        <div className="space-y-4">
          <div className={cardClass}>
            <h3 className="font-bold text-gray-800 mb-4">{editingCourseId ? 'Edit Course' : 'Add Course'}</h3>
            <div className="space-y-3">
              <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Course title" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
              <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Thumbnail image URL" value={courseForm.image} onChange={(e) => setCourseForm({ ...courseForm, image: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Lesson count" value={courseForm.lessons} onChange={(e) => setCourseForm({ ...courseForm, lessons: e.target.value })} />
                <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  <span>Premium Course</span>
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Price" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} />
                <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Old price" value={courseForm.oldPrice} onChange={(e) => setCourseForm({ ...courseForm, oldPrice: e.target.value })} />
              </div>
              <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Category" value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} />
              {courseForm.type === 'premium' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                  Premium access codes are now generated per student from the dashboard card, not stored once on the course.
                </div>
              )}
              <button
                disabled={loading}
                onClick={() => submitAction(editingCourseId ? 'updateCourse' : 'createCourse', {
                  ...(editingCourseId ? { id: editingCourseId } : {}),
                  ...courseForm,
                  type: 'premium',
                  lessons: Number(courseForm.lessons || 0),
                  price: Number(courseForm.price || 0),
                  oldPrice: Number(courseForm.oldPrice || 0),
                }, () => {
                  setCourseForm({ title: '', lessons: '0', image: '', price: '999', oldPrice: '2999', type: 'premium', category: 'Chemistry' });
                  setEditingCourseId('');
                })}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold"
              >
                {loading ? 'Saving...' : editingCourseId ? 'Update Course' : 'Save Course'}
              </button>
              {editingCourseId && (
                <button onClick={() => {
                  setEditingCourseId('');
                  setCourseForm({ title: '', lessons: '0', image: '', price: '999', oldPrice: '2999', type: 'premium', category: 'Chemistry' });
                }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-bold text-gray-800 mb-4">Manage Courses</h3>
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-gray-800">{course.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{course.category} • {course.type}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingCourseId(course.id);
                        setCourseForm({
                          title: course.title,
                          lessons: String(course.lessons || 0),
                          image: course.image,
                          price: String(course.price || 0),
                          oldPrice: String(course.oldPrice || 0),
                          type: 'premium',
                          category: course.category,
                        });
                        setActiveTab('course');
                      }} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Edit</button>
                      <button onClick={() => submitAction('deleteCourse', { id: course.id }, () => {})} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lesson' && (
        <div className="space-y-4">
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">{editingLessonId ? 'Edit Lesson' : 'Add Lesson'}</h3>
          <div className="space-y-3">
            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={lessonForm.course_id} onChange={(e) => setLessonForm({ ...lessonForm, course_id: e.target.value })}>
              <option value="">Select course</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Lesson title" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Duration e.g. 20:15" value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} />
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Direct video URL or embed URL" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} />
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Lesson note URL (optional)" value={lessonForm.note_url} onChange={(e) => setLessonForm({ ...lessonForm, note_url: e.target.value })} />
            <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-28" placeholder="Lesson note content (optional)" value={lessonForm.note_content} onChange={(e) => setLessonForm({ ...lessonForm, note_content: e.target.value })} />
            <button
              disabled={loading}
              onClick={() => submitAction(editingLessonId ? 'updateLesson' : 'createLesson', {
                ...(editingLessonId ? { id: editingLessonId } : {}),
                ...lessonForm
              }, () => {
                setLessonForm({ course_id: '', title: '', duration: '', note_content: '', note_url: '', video_url: '' });
                setEditingLessonId('');
              })}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold"
            >
              {loading ? 'Saving...' : editingLessonId ? 'Update Lesson' : 'Save Lesson'}
            </button>
            {editingLessonId && (
              <button onClick={() => {
                setEditingLessonId('');
                setLessonForm({ course_id: '', title: '', duration: '', note_content: '', note_url: '', video_url: '' });
              }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                Cancel Edit
              </button>
            )}
          </div>
        </div>
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">Manage Lessons</h3>
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-gray-800">{lesson.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{courses.find((course) => course.id === lesson.course_id)?.title || lesson.course_id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingLessonId(lesson.id);
                      setLessonForm({
                        course_id: lesson.course_id,
                        title: lesson.title,
                        duration: lesson.duration,
                        note_content: lesson.note_content,
                        note_url: lesson.note_url || '',
                        video_url: lesson.video_url || '',
                      });
                      setActiveTab('lesson');
                    }} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Edit</button>
                    <button onClick={() => submitAction('deleteLesson', { id: lesson.id }, () => {})} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'note' && (
        <div className="space-y-4">
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">{editingNoteId ? 'Edit Note' : 'Add Note'}</h3>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-800">Note Categories</div>
                  <div className="text-xs text-slate-500">Create category once, then select it while adding notes.</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600">
                  {noteCategories.length} total
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm"
                  placeholder="Add new category"
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddNoteCategory}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
                >
                  Add Category
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {noteCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setNoteForm((current) => ({ ...current, category }))}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      noteForm.category === category ? 'bg-primary text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Note title" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Lesson count" value={noteForm.lessons} onChange={(e) => setNoteForm({ ...noteForm, lessons: e.target.value })} />
              <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={noteForm.category} onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}>
              {noteCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Hosted note URL (optional)" value={noteForm.url} onChange={(e) => setNoteForm({ ...noteForm, url: e.target.value })} />
            <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-28" placeholder="Note content markdown/text (optional)" value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
            <button
              disabled={loading}
              onClick={() => submitAction(editingNoteId ? 'updateNote' : 'createNote', { ...(editingNoteId ? { id: editingNoteId } : {}), ...noteForm, lessons: Number(noteForm.lessons || 0) }, () => {
                setNoteForm({ title: '', lessons: '1', category: 'Chemistry', type: 'free', url: '', content: '' });
                setEditingNoteId('');
              })}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold"
            >
              {loading ? 'Saving...' : editingNoteId ? 'Update Note' : 'Save Note'}
            </button>
            {editingNoteId && (
              <button onClick={() => {
                setEditingNoteId('');
                setNoteForm({ title: '', lessons: '1', category: 'Chemistry', type: 'free', url: '', content: '' });
              }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                Cancel Edit
              </button>
            )}
          </div>
        </div>
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">Manage Notes</h3>
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-gray-800">{note.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{note.category} • {note.type || 'free'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingNoteId(note.id);
                      setNoteForm({
                        title: note.title,
                        lessons: String(note.lessons || 1),
                        category: note.category,
                        type: note.type || 'free',
                        url: note.url || '',
                        content: note.content || '',
                      });
                      setActiveTab('note');
                    }} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Edit</button>
                    <button onClick={() => submitAction('deleteNote', { id: note.id }, () => {})} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="space-y-4">
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">{editingQuizId ? 'Edit Quiz' : 'Add Quiz'}</h3>
          <div className="space-y-3">
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Quiz topic" value={quizForm.topic} onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })} />
            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={quizForm.type} onChange={(e) => setQuizForm({ ...quizForm, type: e.target.value })}>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
            <button
              disabled={loading}
              onClick={() => submitAction(editingQuizId ? 'updateQuiz' : 'createQuiz', { ...(editingQuizId ? { id: editingQuizId } : {}), ...quizForm }, () => {
                setQuizForm({ topic: '', type: 'free' });
                setEditingQuizId('');
              })}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold"
            >
              {loading ? 'Saving...' : editingQuizId ? 'Update Quiz' : 'Save Quiz'}
            </button>
            {editingQuizId && (
              <button onClick={() => {
                setEditingQuizId('');
                setQuizForm({ topic: '', type: 'free' });
              }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                Cancel Edit
              </button>
            )}
          </div>
        </div>
          <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">Manage Quizzes</h3>
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="admin-list-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-gray-800">{quiz.topic}</div>
                    <div className="text-xs text-gray-500 mt-1">{quiz.questions.length} questions</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingQuizId(quiz.id);
                      setQuizForm({ topic: quiz.topic, type: (quiz as any).type || 'free' });
                      setActiveTab('quiz');
                    }} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Edit</button>
                    <button onClick={() => submitAction('deleteQuiz', { id: quiz.id }, () => {})} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'question' && (
        <div className="space-y-4">
        <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4">
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">Import Questions From JSON</h3>
          <div className="space-y-3">
            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={questionImportQuizId} onChange={(e) => setQuestionImportQuizId(e.target.value)}>
              <option value="">Select quiz for import</option>
              {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.topic}</option>)}
            </select>
            <label className="block rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
              <span className="block font-bold text-gray-700 mb-2">Upload JSON file</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => setQuestionImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              <span className="block mt-2 text-xs">
                {questionImportFile ? questionImportFile.name : 'Upload a JSON file with an array of questions'}
              </span>
            </label>
            <div className="admin-soft-panel px-4 py-3 text-xs text-gray-600 whitespace-pre-wrap">
              {`Supported JSON format:
[
  {
    "text": "Question text",
    "options": [
      { "text": "Option 1", "image_url": "https://example.com/option-1.png" },
      { "text": "Option 2", "image_url": "https://example.com/option-2.png" }
    ],
    "correctAnswer": 1,
    "explanation": "Optional explanation",
    "image_url": "https://example.com/question-image.png"
  }
]

Questions will be imported into the selected quiz subject sheet, for example "Chemistry Quiz".`}
            </div>
            <button
              disabled={loading}
              onClick={submitQuestionImport}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold"
            >
              {loading ? 'Importing...' : 'Import Questions'}
            </button>
          </div>
        </div>
        <div className={cardClass}>
          <h3 className="font-bold text-gray-800 mb-4">{editingQuestionId ? 'Edit Question' : 'Add Question'}</h3>
          <div className="space-y-3">
            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={questionForm.quiz_id} onChange={(e) => setQuestionForm({ ...questionForm, quiz_id: e.target.value })}>
              <option value="">Select quiz</option>
              {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.topic}</option>)}
            </select>
            <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-24" placeholder="Question text" value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} />
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Question image URL (optional)" value={questionForm.image_url} onChange={(e) => setQuestionForm({ ...questionForm, image_url: e.target.value })} />
            <label className="block rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
              <span className="block font-bold text-gray-700 mb-2">Upload question image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    setQuestionImageFile(null);
                    return;
                  }
                  if (!file.type.startsWith('image/')) {
                    setMessage('Please choose a valid question image');
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setMessage('Question image must be 5 MB or smaller');
                    return;
                  }
                  setQuestionImageFile(file);
                  setMessage('');
                }}
                className="block w-full text-sm"
              />
              <span className="block mt-2 text-xs">
                {questionImageFile ? questionImageFile.name : 'Choose an image if this question needs a diagram or visual'}
              </span>
            </label>
            {questionImagePreviewUrl && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <img src={questionImagePreviewUrl} alt="Question preview" className="w-full max-h-56 object-contain bg-slate-50" referrerPolicy="no-referrer" />
              </div>
            )}
            <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-28" placeholder={'Options, one per line\nOption 1\nOption 2\nOption 3\nOption 4'} value={questionForm.optionsText} onChange={(e) => setQuestionForm({ ...questionForm, optionsText: e.target.value })} />
            <input className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" placeholder="Correct answer index (0-3)" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })} />
            <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-24" placeholder="Explanation" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} />
            <button
              disabled={loading}
              onClick={submitQuestion}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold"
            >
              {loading ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save Question'}
            </button>
            {editingQuestionId && (
              <button onClick={() => {
                setEditingQuestionId('');
                setQuestionForm({ id: '', quiz_id: '', text: '', optionsText: '', correctAnswer: '0', explanation: '', image_url: '' });
                setQuestionImageFile(null);
                setQuestionImagePreviewUrl('');
              }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                Cancel Edit
              </button>
            )}
          </div>
        </div>
        </div>
        <div className={cardClass}>
          <div className="admin-section-head">
            <div>
              <h3 className="font-bold text-gray-800">Manage Questions</h3>
              <p className="text-xs text-gray-500 mt-1">Review question text, images, quiz mapping, and edit actions in one place.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
              {questions.length} total
            </div>
          </div>
          <div className="space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="admin-list-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-gray-800">{question.text}</div>
                    <div className="text-xs text-gray-500 mt-1">{(question as any).topic}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.options.map((option, index) => (
                        <div
                          key={`${question.id}-${index}`}
                          className={`rounded-2xl px-3 py-2 text-[11px] font-bold ${index === question.correctAnswer ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          <div>{String.fromCharCode(65 + index)}. {option}</div>
                          {question.option_images?.[index] && (
                            <img
                              src={question.option_images[index]}
                              alt={`${option} option`}
                              className="mt-2 w-full max-w-[120px] rounded-xl border border-gray-100 object-contain bg-white"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {question.image_url && (
                      <img src={question.image_url} alt={question.text} className="mt-3 w-full max-w-xs rounded-2xl border border-gray-100 object-contain bg-slate-50" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingQuestionId(question.id);
                      setQuestionForm({
                        id: question.id,
                        quiz_id: question.quiz_id,
                        text: question.text,
                        optionsText: question.options.join('\n'),
                        correctAnswer: String(question.correctAnswer),
                        explanation: question.explanation || '',
                        image_url: question.image_url || '',
                      });
                      setQuestionImageFile(null);
                      setActiveTab('question');
                    }} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Edit</button>
                    <button onClick={() => submitAction('deleteQuestion', { id: question.id }, () => {})} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'user' && (
        <div className="space-y-4">
          <div className={cardClass}>
            <div className="admin-section-head">
              <div>
                <h3 className="font-bold text-gray-800">Student Data</h3>
                <p className="text-xs text-gray-500 mt-1">View all registered students currently available from the academy database.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                {users.length} students
              </div>
            </div>

            <div className="mb-4">
              <input
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                placeholder="Search student by name, email, or ID"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="admin-soft-panel px-4 py-6 text-sm text-slate-500">
                  {users.length === 0 ? 'No student data found yet.' : 'No student matched your search.'}
                </div>
              ) : (
                filteredUsers.map((userItem) => (
                  <div key={userItem.id} className="admin-list-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-bold text-base text-slate-900 truncate">{userItem.name}</div>
                        <div className="text-sm text-slate-500 mt-1 break-all">{userItem.email}</div>
                        <div className="text-xs text-slate-400 mt-2">Student ID: {userItem.id}</div>
                        {userItem.password && (
                          <div className="text-xs text-slate-400 mt-1">Password: {String(userItem.password)}</div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(userItem)
                            .filter(([key, value]) => !['id', 'name', 'email', 'password', 'grantedCourseIds'].includes(key) && value !== '' && value !== null && value !== undefined)
                            .map(([key, value]) => (
                              <span key={`${userItem.id}-${key}`} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                                {key}: {String(value)}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                        {userItem.grantedCourseIds?.length || 0} courses unlocked
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="space-y-4">
          <div className={cardClass}>
            <div className="admin-section-head">
              <div>
                <h3 className="font-bold text-gray-800">Customer Premium Access</h3>
                <p className="text-xs text-gray-500 mt-1">Generate a unique premium course code for one student at a time.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                {premiumCourses.length} premium courses
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 mb-3">
              <input
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                placeholder="Search student for premium access"
                value={accessStudentSearchQuery}
                onChange={(e) => setAccessStudentSearchQuery(e.target.value)}
              />
              <input
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                placeholder="Search premium course"
                value={accessCourseSearchQuery}
                onChange={(e) => setAccessCourseSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                value={customerAccessForm.userId}
                onChange={(e) => {
                  setCustomerAccessForm((current) => ({ ...current, userId: e.target.value }));
                  setGeneratedCustomerCode('');
                }}
              >
                <option value="">Select student</option>
                {accessUsers.map((userItem) => (
                  <option key={userItem.id} value={userItem.id}>
                    {userItem.name} ({userItem.email})
                  </option>
                ))}
              </select>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm"
                value={customerAccessForm.courseId}
                onChange={(e) => {
                  setCustomerAccessForm((current) => ({ ...current, courseId: e.target.value }));
                  setGeneratedCustomerCode('');
                }}
              >
                <option value="">Select premium course</option>
                {filteredPremiumCourses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleGenerateCustomerAccessCode}
                disabled={loading}
                className="admin-primary-button px-5 py-3 text-sm font-bold"
              >
                {loading ? 'Generating...' : 'Generate Customer Code'}
              </button>
              {generatedCustomerCode && (
                <div className="rounded-2xl bg-slate-900 px-4 py-3 font-mono text-sm font-bold tracking-[0.18em] text-white">
                  {generatedCustomerCode}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`${cardClass} mt-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Current Content Snapshot</h3>
          <button onClick={onRefresh} className="text-primary text-sm font-bold">Refresh</button>
        </div>
        <div className="admin-soft-panel px-4 py-4 text-xs text-gray-500 space-y-2">
          <p>{courses.length} courses loaded from Sheets</p>
          <p>{quizzes.length} quizzes loaded from Sheets</p>
          <p>{users.length} students loaded from database</p>
          {courses.slice(0, 5).map((course) => (
            <div key={course.id} className="flex justify-between gap-3">
              <span className="truncate">{course.title}</span>
              <span className="uppercase">{course.type}</span>
            </div>
          ))}
        </div>
      </div>
            </main>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

const NoteViewerScreen = ({ 
  onBack, 
  lesson 
}: { 
  onBack: () => void, 
  lesson: Lesson | null
}) => {
  if (!lesson) return null;

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#e9eef6]"
    >
      <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#17304f_0%,#22486d_100%)] px-4 py-3 text-white shadow-lg shadow-slate-300/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 transition-colors hover:bg-white/20">
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h3 className="truncate text-base font-black sm:text-lg">{lesson.title}</h3>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">Study Material</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lesson.note_url && (
              <button
                type="button"
                onClick={() => openExternalResource(lesson.note_url)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-sm font-bold hover:bg-white/18"
              >
                <ExternalLink size={16} />
                Open Link
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        <div className="h-full overflow-y-auto rounded-[28px] border border-white/75 bg-white/80 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-black text-slate-900">{lesson.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {lesson.note_url ? 'This note opens in Google Drive or your external document link.' : 'Full screen study note reader'}
            </p>
          </div>
          {lesson.note_url ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                <ExternalLink size={24} />
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900">Open Study Material</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Embedded PDF viewer remove kar diya gaya hai. Is note ka Google Drive ya external link direct open hoga.
              </p>
              <button
                type="button"
                onClick={() => openExternalResource(lesson.note_url)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100"
              >
                <ExternalLink size={16} />
                Open Note Link
              </button>
            </div>
          ) : (
            <div className="markdown-body prose prose-sm max-w-none">
              <ReactMarkdown>{lesson.note_content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isSuperAdminRoute = pathname === '/adminlogin/adminsachin' || pathname === '/superadmin';
  const isAdminRoute = pathname === '/adminlogin' || pathname === '/admin';
  const isManagementRoute = isAdminRoute || isSuperAdminRoute;
  const cachedAppData = getCachedAppData();
  const cachedAdminUsers = getCachedAdminUsers();
  const [screen, setScreenState] = useState<Screen>('home');
  const screenRef = useRef<Screen>('home');
  const historyReadyRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const setScreen = (nextScreen: Screen) => {
    setScreenState((currentScreen) => currentScreen === nextScreen ? currentScreen : nextScreen);
  };
  const [sliders, setSliders] = useState<SliderItem[]>(normalizeSliders(cachedAppData?.sliders));
  const [courses, setCourses] = useState<Course[]>(filterChemistryAppData({
    courses: cachedAppData?.courses || [],
    notes: [],
    quizzes: [],
  }).courses);
  const [notes, setNotes] = useState<Note[]>(filterChemistryAppData({
    courses: [],
    notes: cachedAppData?.notes || [],
    quizzes: [],
  }).notes);
  const [quizzes, setQuizzes] = useState<Quiz[]>(filterChemistryAppData({
    courses: [],
    notes: [],
    quizzes: cachedAppData?.quizzes || fallbackQuizzes,
  }).quizzes);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(cachedAdminUsers);
  const [loading, setLoading] = useState(!cachedAppData);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredSessionUser());
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => getAdminSession());
  const [darkModeEnabled, setDarkModeEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });
  const [coursesInitialTab, setCoursesInitialTab] = useState<'free' | 'premium'>('free');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>(() => getStoredSessionUser()?.grantedCourseIds || []);
  const [selectedCourseForUnlock, setSelectedCourseForUnlock] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedQuizTopic, setSelectedQuizTopic] = useState<Quiz | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');

  const fetchAppData = async () => {
    try {
      const [slidersData, coursesData, notesData, quizzesData] = await Promise.all([
        withTimeout(
          loadJsonResource<SliderItem[]>('sliders', fallbackSliders),
          sliders.length ? sliders : fallbackSliders
        ),
        withTimeout(
          loadJsonResource<Course[]>('courses', cachedAppData?.courses || []),
          courses.length ? courses : (cachedAppData?.courses || [])
        ),
        withTimeout(
          loadJsonResource<Note[]>('notes', cachedAppData?.notes || []),
          notes.length ? notes : (cachedAppData?.notes || [])
        ),
        withTimeout(
          loadJsonResource<Quiz[]>('quizzes', cachedAppData?.quizzes || fallbackQuizzes),
          quizzes.length ? quizzes : (cachedAppData?.quizzes || fallbackQuizzes)
        ),
      ]);

      const nextSliders = Array.isArray(slidersData) && slidersData.length
        ? normalizeSliders(slidersData)
        : sliders.length
          ? normalizeSliders(sliders)
          : fallbackSliders;
      const nextCourses = Array.isArray(coursesData) && coursesData.length
        ? coursesData
        : courses.length
          ? courses
          : (cachedAppData?.courses || []);
      const nextNotes = Array.isArray(notesData) && notesData.length
        ? notesData
        : notes.length
          ? notes
          : (cachedAppData?.notes || []);
      const nextQuizzes = Array.isArray(quizzesData) && quizzesData.length
        ? mergeQuizzes(quizzesData)
        : quizzes.length
          ? quizzes
          : mergeQuizzes(cachedAppData?.quizzes || fallbackQuizzes);

      const chemistryOnlyData = filterChemistryAppData({
        courses: nextCourses,
        notes: nextNotes,
        quizzes: nextQuizzes,
      });

      setSliders(nextSliders);
      setCourses(chemistryOnlyData.courses);
      setNotes(chemistryOnlyData.notes);
      setQuizzes(chemistryOnlyData.quizzes);
      saveCachedAppData({
        sliders: nextSliders,
        courses: chemistryOnlyData.courses,
        notes: chemistryOnlyData.notes,
        quizzes: chemistryOnlyData.quizzes,
      });
      if (isManagementRoute) {
        const nextAdminUsers = await fetchAdminUsers();
        setAdminUsers(nextAdminUsers);
        if (nextAdminUsers.length) {
          saveCachedAdminUsers(nextAdminUsers);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setSliders(fallbackSliders);
      setCourses([]);
      setNotes([]);
      setQuizzes(filterChemistryAppData({ courses: [], notes: [], quizzes: fallbackQuizzes }).quizzes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isManagementRoute) {
      return;
    }

    const state = { rbsAcademyScreen: screen };
    if (!historyReadyRef.current) {
      window.history.replaceState(state, '', window.location.href);
      historyReadyRef.current = true;
      screenRef.current = screen;
      return;
    }

    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      screenRef.current = screen;
      return;
    }

    if (screenRef.current !== screen) {
      window.history.pushState(state, '', window.location.href);
      screenRef.current = screen;
    }
  }, [screen, isManagementRoute]);

  useEffect(() => {
    if (typeof window === 'undefined' || isManagementRoute) {
      return;
    }

    const handlePopState = (event: PopStateEvent) => {
      const nextScreen = (event.state as { rbsAcademyScreen?: Screen } | null)?.rbsAcademyScreen;
      if (nextScreen) {
        restoringHistoryRef.current = true;
        setScreenState(nextScreen);
        return;
      }

      if (screenRef.current !== 'home') {
        restoringHistoryRef.current = true;
        window.history.replaceState({ rbsAcademyScreen: 'home' }, '', window.location.href);
        setScreenState('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isManagementRoute]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(THEME_STORAGE_KEY, darkModeEnabled ? 'dark' : 'light');
  }, [darkModeEnabled]);

  useEffect(() => {
    const loadUserAccess = async () => {
      if (!user) {
        return;
      }

      try {
        const response = await apiGet('users');
        const users = await readLenientJsonResponse(response);
        const matchedUser = (users || []).find((item: AdminUser) => item.id === user.id);
        const nextGrantedCourseIds = matchedUser?.grantedCourseIds || [];
        setUnlockedCourseIds(nextGrantedCourseIds);
        saveSessionUser({
          ...normalizeAuthUser(user),
          grantedCourseIds: nextGrantedCourseIds,
        });
      } catch (error) {
        console.error('Error loading user access:', error);
      }
    };

    loadUserAccess();
  }, [user]);

  const handleLogin = (userData: AuthUser) => {
    const normalizedUser = normalizeAuthUser(userData);
    setUser(normalizedUser);
    saveSessionUser(normalizedUser);
    setUnlockedCourseIds(normalizedUser.grantedCourseIds || []);
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    saveSessionUser(null);
    setUnlockedCourseIds([]);
    setScreen('home');
    setIsDrawerOpen(false);
  };

  const handleProfileUpdate = async ({ name, password }: { name: string; password?: string }) => {
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const updatedUser = { ...user, name };

    try {
      if (APPS_SCRIPT_URL) {
        const response = await apiPost('updateProfile', {
          id: user.id,
          name,
          password
        });
        const data = await response.json();

        if (!data.success) {
          return { success: false, message: data.message || 'Unable to update profile' };
        }

        const normalizedUser = normalizeAuthUser(data.user || updatedUser, updatedUser);
        setUser(normalizedUser);
        saveSessionUser(normalizedUser);
        updateStoredUserCredentials({
          id: normalizedUser.id,
          name: normalizedUser.name,
          password
        });
        return { success: true, message: 'Profile updated successfully' };
      }

      updateStoredUserCredentials({
        id: updatedUser.id,
        name: updatedUser.name,
        password
      });
      setUser(updatedUser);
      saveSessionUser(updatedUser);
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      updateStoredUserCredentials({
        id: updatedUser.id,
        name: updatedUser.name,
        password
      });
      setUser(updatedUser);
      saveSessionUser(updatedUser);
      return { success: true, message: 'Profile updated locally' };
    }
  };

  const handleAdminLogin = (session: AdminSession) => {
    setAdminSession(session);
    saveAdminSession(session);
    setScreen('admin');
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    saveAdminSession(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleUnlockCourse = async (code: string) => {
    if (!selectedCourseForUnlock) {
      return { success: false, message: 'No course selected' };
    }

    try {
      const response = await apiPost('verifyCourseAccess', {
        courseId: selectedCourseForUnlock.id,
        accessCode: code,
        userId: user?.id || ''
      });
      const data = await response.json();

      if (!data.success) {
        return { success: false, message: data.message || 'Invalid access code' };
      }

      const nextUnlockedCourseIds = unlockedCourseIds.includes(selectedCourseForUnlock.id)
        ? unlockedCourseIds
        : [...unlockedCourseIds, selectedCourseForUnlock.id];
      setUnlockedCourseIds(nextUnlockedCourseIds);
      if (user) {
        const nextUser = {
          ...normalizeAuthUser(user),
          grantedCourseIds: nextUnlockedCourseIds,
        };
        setUser(nextUser);
        saveSessionUser(nextUser);
      }
      setSelectedCourseForUnlock(null);
      setScreen('video-player');
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Invalid Access Code. Please contact admin on WhatsApp.' };
    }
  };

  const handleOpenCoursesTab = (tab: 'free' | 'premium') => {
    setCoursesInitialTab(tab);
    setScreen('courses');
  };

  const renderScreen = () => {
    if (isManagementRoute) {
      const requiredRole: AdminRole = isSuperAdminRoute ? 'superadmin' : 'admin';
      if (!adminSession || adminSession.role !== requiredRole) {
        return <AdminLoginScreen mode={requiredRole} onLogin={handleAdminLogin} />;
      }
      return <AdminPanelScreen courses={courses} notes={notes} quizzes={quizzes} sliders={sliders} users={adminUsers} authSession={adminSession} onRefresh={fetchAppData} onLogout={handleAdminLogout} />;
    }

    if (loading) return <Loading />;
    if (!user) return <LoginScreen onLogin={handleLogin} />;

    switch (screen) {
      case 'home': return (
        <HomeScreen 
          setScreen={setScreen} 
          sliders={sliders}
          courses={courses} 
          notes={notes}
          quizzes={quizzes}
          unlockedCourseIds={unlockedCourseIds}
          onOpenCoursesTab={handleOpenCoursesTab}
          onBuyClick={(course) => setSelectedCourseForUnlock(course)}
          onCourseSelect={(course) => setSelectedCourse(course)}
        />
      );
      case 'courses': return (
        <CoursesScreen 
          setScreen={setScreen} 
          courses={courses} 
          unlockedCourseIds={unlockedCourseIds}
          initialTab={coursesInitialTab}
          onBuyClick={(course) => setSelectedCourseForUnlock(course)}
          onCourseSelect={(course) => setSelectedCourse(course)}
        />
      );
      case 'notes': return (
        <NotesScreen 
          notes={notes} 
          onViewNote={(note) => {
            if (openExternalResource(note.url)) {
              return;
            }
            setSelectedLesson({
              id: note.id,
              course_id: '',
              title: note.title,
              duration: '',
              note_content: note.content || 'This is a detailed study material for ' + note.title,
              note_url: note.url
            });
            setPreviousScreen('notes');
            setScreen('note-viewer');
          }}
        />
      );
      case 'quiz': return <QuizScreen quizzes={quizzes} initialQuiz={selectedQuizTopic} />;
      case 'support-chat': return <SupportChatScreen />;
      case 'about-us': return <AboutUsScreen />;
      case 'about-developer': return <AboutDeveloperScreen />;
      case 'privacy-policy': return <PrivacyPolicyScreen />;
      case 'profile': return (
        <ProfileScreen
          user={user}
          onLogout={handleLogout}
          onOpenSettings={() => setScreen('settings')}
          onOpenProfileInfo={() => setScreen('profile-edit')}
          onOpenMyCourses={() => setScreen('my-courses')}
          onOpenOfflineNotes={() => setScreen('offline-notes')}
        />
      );
      case 'settings': return (
        <SettingsScreen
          user={user}
          darkModeEnabled={darkModeEnabled}
          onToggleDarkMode={() => setDarkModeEnabled((prev) => !prev)}
          onOpenProfileInfo={() => setScreen('profile-edit')}
          onOpenHelpCenter={() => setScreen('help-center')}
        />
      );
      case 'profile-edit': return user ? <ProfileEditScreen user={user} onSave={handleProfileUpdate} /> : null;
      case 'help-center': return <HelpCenterScreen />;
      case 'my-courses': return (
        <MyCoursesScreen
          courses={courses}
          unlockedCourseIds={unlockedCourseIds}
          onCourseSelect={(course) => {
            setSelectedCourse(course);
            setScreen('course-details');
          }}
        />
      );
      case 'offline-notes': return <OfflineNotesScreen />;
      case 'admin': return <HomeScreen 
        setScreen={setScreen} 
        sliders={sliders}
        courses={courses} 
        notes={notes}
        quizzes={quizzes}
        unlockedCourseIds={unlockedCourseIds}
        onOpenCoursesTab={handleOpenCoursesTab}
        onBuyClick={(course) => setSelectedCourseForUnlock(course)}
        onCourseSelect={(course) => setSelectedCourse(course)}
      />;
      case 'video-player': return (
        <VideoPlayerScreen 
          onBack={() => setScreen('courses')} 
          course={selectedCourse}
          onLessonSelect={(lesson) => setSelectedLesson(lesson)}
          onViewNotes={(lesson) => {
            if (openExternalResource(lesson.note_url)) {
              return;
            }
            setSelectedLesson(lesson);
            setPreviousScreen('video-player');
            setScreen('note-viewer');
          }}
        />
      );
      case 'note-viewer': return (
        <NoteViewerScreen 
          onBack={() => setScreen(previousScreen)} 
          lesson={selectedLesson} 
        />
      );
      case 'course-details': return (
        <CourseDetailsScreen 
          course={selectedCourse}
          onBack={() => setScreen('courses')}
          onStartLearning={() => {
            if (selectedCourse) {
              const isUnlocked = unlockedCourseIds.includes(selectedCourse.id);
              if (isUnlocked) {
                setScreen('video-player');
              } else {
                setSelectedCourseForUnlock(selectedCourse);
              }
            }
          }}
          onViewNotes={(lesson) => {
            if (openExternalResource(lesson.note_url)) {
              return;
            }
            setSelectedLesson(lesson);
            setPreviousScreen('course-details');
            setScreen('note-viewer');
          }}
          onTakeQuiz={() => {
            const quiz = quizzes.find(q => q.topic.toLowerCase().includes(selectedCourse?.category.toLowerCase() || ''));
            setSelectedQuizTopic(quiz || null);
            setScreen('quiz');
          }}
          isUnlocked={!!selectedCourse && unlockedCourseIds.includes(selectedCourse.id)}
        />
      );
      default: return (
        <HomeScreen 
          setScreen={setScreen} 
          sliders={sliders}
          courses={courses} 
          notes={notes}
          quizzes={quizzes}
          unlockedCourseIds={unlockedCourseIds}
          onOpenCoursesTab={handleOpenCoursesTab}
          onBuyClick={(course) => setSelectedCourseForUnlock(course)}
          onCourseSelect={(course) => setSelectedCourse(course)}
        />
      );
    }
  };

  const getTitle = () => {
    switch (screen) {
      case 'home': return 'RBS Academy';
      case 'courses': return 'Courses';
      case 'notes': return 'Notes';
      case 'quiz': return 'Practice Quiz';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      case 'profile-edit': return 'Profile Information';
      case 'help-center': return 'Help Center';
      case 'support-chat': return 'Support Chat';
      case 'about-us': return 'About Us';
      case 'about-developer': return 'About Developer';
      case 'privacy-policy': return 'Privacy Policy';
      case 'my-courses': return 'My Courses';
      case 'offline-notes': return 'Download Note Offline';
      case 'video-player': return 'Video Player';
      case 'course-details': return 'Course Details';
      default: return 'RBS Academy';
    }
  };

  const getBackScreen = () => {
    switch (screen) {
      case 'settings':
      case 'profile':
        return 'home';
      case 'profile-edit':
      case 'help-center':
      case 'support-chat':
        return 'settings';
      case 'about-us':
      case 'about-developer':
      case 'privacy-policy':
        return 'home';
      case 'my-courses':
      case 'offline-notes':
        return 'profile';
      default:
        return 'home';
    }
  };

  return (
    <div className={isManagementRoute ? 'admin-shell' : `mobile-container ${darkModeEnabled ? 'dark-mode' : ''}`}>
      {!isManagementRoute && screen !== 'video-player' && screen !== 'note-viewer' && screen !== 'course-details' && (
        <Header 
          title={getTitle()} 
          showBack={screen !== 'home'} 
          onBack={() => setScreen(getBackScreen())} 
          onMenuClick={() => setIsDrawerOpen(true)}
          onNotificationClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = 'http://action_notifications';
            }
          }}
        />
      )}
      
      {!isManagementRoute && (
        <SideDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          user={user}
          setScreen={setScreen}
        />
      )}

      <AccessCodeModal 
        isOpen={!!selectedCourseForUnlock}
        onClose={() => setSelectedCourseForUnlock(null)}
        onUnlock={handleUnlockCourse}
        courseTitle={selectedCourseForUnlock?.title || ''}
      />

      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>

      {!isManagementRoute && screen !== 'video-player' && screen !== 'note-viewer' && screen !== 'course-details' && (
        <BottomNav 
          activeScreen={screen} 
          setScreen={setScreen} 
          onQuizClick={() => {
            setSelectedQuizTopic(null);
            setScreen('quiz');
          }}
        />
      )}
    </div>
  );
}
