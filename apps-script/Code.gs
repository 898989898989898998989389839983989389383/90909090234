const SHEET_NAMES = {
  users: 'Users',
  enrollments: 'Enrollments',
  sliders: 'Sliders',
  courses: 'Courses',
  lessons: 'Lessons',
  notes: 'Notes',
  quizzes: 'Quizzes',
  questions: 'Questions',
};

const SHEET_HEADERS = {
  Users: ['id', 'name', 'email', 'password'],
  Enrollments: ['id', 'user_id', 'course_id', 'access_code', 'granted_at'],
  Sliders: ['id', 'title', 'subtitle', 'image_url', 'drive_file_id', 'sort_order', 'is_active'],
  Courses: ['id', 'title', 'lessons', 'image', 'price', 'oldPrice', 'type', 'category', 'access_code'],
  Lessons: ['id', 'course_id', 'title', 'duration', 'note_content', 'note_url', 'video_url'],
  Notes: ['id', 'title', 'lessons', 'category', 'type', 'url', 'content'],
  Quizzes: ['id', 'topic', 'type', 'sheet_name'],
  Questions: ['id', 'quiz_id', 'text', 'options', 'correctAnswer', 'explanation', 'image_url', 'option_images'],
};

const QUESTION_SHEET_HEADERS = ['id', 'quiz_id', 'text', 'options', 'correctAnswer', 'explanation', 'image_url', 'option_images'];

function initializeSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }

    ensureHeaders_(sheet, SHEET_HEADERS[sheetName]);
  });

  return jsonOutput({
    success: true,
    message: 'Sheets initialized successfully',
  });
}

function doGet(e) {
  try {
    ensureAppSheets_();
    const resource = (e && e.parameter && e.parameter.resource) || '';

    switch (resource) {
      case 'users':
        return jsonOutput(getUsers_());
      case 'userAccess':
        return jsonOutput(getUserAccess_(e.parameter.userId));
      case 'courses':
        return jsonOutput(getCourses_());
      case 'sliders':
        return jsonOutput(getSliders_());
      case 'notes':
        return jsonOutput(getNotes_());
      case 'quizzes':
        return jsonOutput(getQuizzes_());
      default:
        return jsonOutput({
          success: false,
          message: 'Unsupported resource',
        });
    }
  } catch (error) {
    return jsonOutput({
      success: false,
      message: error.message || 'Unexpected error',
    });
  }
}

function doPost(e) {
  try {
    ensureAppSheets_();
    const body = parseRequestBody_(e);
    const action = String(body.action || (e && e.parameter && e.parameter.action) || '').trim();

    switch (action) {
      case 'login':
        return jsonOutput(login_(body));
      case 'signup':
        return jsonOutput(signup_(body));
      case 'updateProfile':
        return jsonOutput(updateProfile_(body));
      case 'grantCourseAccess':
        return jsonOutput(grantCourseAccess_(body));
      case 'revokeCourseAccess':
        return jsonOutput(revokeCourseAccess_(body));
      case 'verifyCourseAccess':
        return jsonOutput(verifyCourseAccess_(body));
      case 'updateCourseAccess':
        return jsonOutput(updateCourseAccess_(body));
      case 'createCourse':
        return jsonOutput(createCourse_(body));
      case 'createSlider':
        return jsonOutput(createSlider_(body));
      case 'updateSlider':
        return jsonOutput(updateSlider_(body));
      case 'deleteSlider':
        return jsonOutput(deleteSlider_(body));
      case 'updateCourse':
        return jsonOutput(updateCourse_(body));
      case 'deleteCourse':
        return jsonOutput(deleteCourse_(body));
      case 'createLesson':
        return jsonOutput(createLesson_(body));
      case 'updateLesson':
        return jsonOutput(updateLesson_(body));
      case 'deleteLesson':
        return jsonOutput(deleteLesson_(body));
      case 'createNote':
        return jsonOutput(createNote_(body));
      case 'updateNote':
        return jsonOutput(updateNote_(body));
      case 'deleteNote':
        return jsonOutput(deleteNote_(body));
      case 'createQuiz':
        return jsonOutput(createQuiz_(body));
      case 'updateQuiz':
        return jsonOutput(updateQuiz_(body));
      case 'deleteQuiz':
        return jsonOutput(deleteQuiz_(body));
      case 'createQuestion':
        return jsonOutput(createQuestion_(body));
      case 'importQuestions':
        return jsonOutput(importQuestions_(body));
      case 'updateQuestion':
        return jsonOutput(updateQuestion_(body));
      case 'deleteQuestion':
        return jsonOutput(deleteQuestion_(body));
      default:
        return jsonOutput({
          success: false,
          message: 'Unsupported action',
        });
    }
  } catch (error) {
    return jsonOutput({
      success: false,
      message: error.message || 'Unexpected error',
    });
  }
}

function parseRequestBody_(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  var parsed = {};

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      parsed = {};
    }
  }

  var params = (e && e.parameter) || {};
  var merged = {};
  Object.keys(params).forEach(function(key) {
    merged[key] = params[key];
  });
  Object.keys(parsed).forEach(function(key) {
    merged[key] = parsed[key];
  });

  return merged;
}

function login_(body) {
  validateRequired_(body, ['email', 'password']);

  const users = readSheetObjects_(SHEET_NAMES.users);
  const matchedUser = users.find(function(user) {
    return normalize_(user.email) === normalize_(body.email) && String(user.password) === String(body.password);
  });

  if (!matchedUser) {
    return { success: false, message: 'Invalid credentials' };
  }

  return {
    success: true,
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      grantedCourseIds: getGrantedCourseIds_(matchedUser.id),
    },
  };
}

function signup_(body) {
  validateRequired_(body, ['name', 'email', 'password']);

  const usersSheet = getSheet_(SHEET_NAMES.users);
  const users = readSheetObjects_(SHEET_NAMES.users);
  const existingUser = users.find(function(user) {
    return normalize_(user.email) === normalize_(body.email);
  });

  if (existingUser) {
    return { success: false, message: 'Email already registered' };
  }

  const newUser = {
    id: createId_('u'),
    name: body.name,
    email: body.email,
    password: body.password,
  };

  appendObjectRow_(usersSheet, ['id', 'name', 'email', 'password'], newUser);

  return {
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      grantedCourseIds: [],
    },
  };
}

function updateProfile_(body) {
  validateRequired_(body, ['id', 'name']);

  const updates = {
    name: body.name,
  };

  if (body.password) {
    updates.password = body.password;
  }

  updateRowById_(SHEET_NAMES.users, body.id, updates);

  const users = readSheetObjects_(SHEET_NAMES.users);
  const matchedUser = users.find(function(user) {
    return String(user.id) === String(body.id);
  });

  if (!matchedUser) {
    return { success: false, message: 'User not found' };
  }

  return {
    success: true,
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      grantedCourseIds: getGrantedCourseIds_(matchedUser.id),
    },
  };
}

function createCourse_(body) {
  validateRequired_(body, ['title', 'lessons', 'image', 'price', 'oldPrice', 'type', 'category']);

  const course = {
    id: createId_('c'),
    title: body.title,
    lessons: body.lessons,
    image: body.image,
    price: body.price,
    oldPrice: body.oldPrice,
    type: body.type,
    category: body.category,
    access_code: body.access_code || '',
  };

  appendObjectRow_(getSheet_(SHEET_NAMES.courses), ['id', 'title', 'lessons', 'image', 'price', 'oldPrice', 'type', 'category', 'access_code'], course);
  return { success: true, course: course };
}

function createSlider_(body) {
  validateRequired_(body, ['title', 'subtitle']);

  var uploaded = saveSliderImage_(body);
  var slider = {
    id: createId_('sl'),
    title: body.title,
    subtitle: body.subtitle,
    image_url: uploaded.imageUrl || body.image_url || '',
    drive_file_id: uploaded.driveFileId || '',
    sort_order: Number(body.sort_order || 0),
    is_active: String(body.is_active || 'true'),
  };

  appendObjectRow_(getSheet_(SHEET_NAMES.sliders), SHEET_HEADERS.Sliders, slider);
  return { success: true, slider: slider };
}

function updateSlider_(body) {
  validateRequired_(body, ['id', 'title', 'subtitle']);

  var currentSlider = readSheetObjects_(SHEET_NAMES.sliders).find(function(item) {
    return String(item.id) === String(body.id);
  });

  if (!currentSlider) {
    return { success: false, message: 'Slider not found' };
  }

  var uploaded = saveSliderImage_(body);

  updateRowById_(SHEET_NAMES.sliders, body.id, {
    title: body.title,
    subtitle: body.subtitle,
    image_url: uploaded.imageUrl || body.image_url || currentSlider.image_url || '',
    drive_file_id: uploaded.driveFileId || currentSlider.drive_file_id || '',
    sort_order: Number(body.sort_order || 0),
    is_active: String(body.is_active || 'true'),
  });

  return { success: true, message: 'Slider updated' };
}

function deleteSlider_(body) {
  validateRequired_(body, ['id']);

  var slider = readSheetObjects_(SHEET_NAMES.sliders).find(function(item) {
    return String(item.id) === String(body.id);
  });

  if (slider && slider.drive_file_id) {
    trashDriveFile_(slider.drive_file_id);
  }

  deleteRowById_(SHEET_NAMES.sliders, body.id);
  return { success: true, message: 'Slider deleted' };
}

function updateCourse_(body) {
  validateRequired_(body, ['id', 'title', 'lessons', 'image', 'price', 'oldPrice', 'type', 'category']);

  updateRowById_(SHEET_NAMES.courses, body.id, {
    title: body.title,
    lessons: body.lessons,
    image: body.image,
    price: body.price,
    oldPrice: body.oldPrice,
    type: body.type,
    category: body.category,
    access_code: body.access_code || '',
  });

  return { success: true, message: 'Course updated' };
}

function deleteCourse_(body) {
  validateRequired_(body, ['id']);
  deleteRowById_(SHEET_NAMES.courses, body.id);
  deleteRowsByField_(SHEET_NAMES.lessons, 'course_id', body.id);
  return { success: true, message: 'Course deleted' };
}

function createLesson_(body) {
  validateRequired_(body, ['course_id', 'title', 'duration', 'video_url']);

  const lesson = {
    id: createId_('l'),
    course_id: body.course_id,
    title: body.title,
    duration: body.duration,
    note_content: body.note_content || '',
    note_url: body.note_url || '',
    video_url: body.video_url,
  };

  appendObjectRow_(getSheet_(SHEET_NAMES.lessons), ['id', 'course_id', 'title', 'duration', 'note_content', 'note_url', 'video_url'], lesson);
  return { success: true, lesson: lesson };
}

function updateLesson_(body) {
  validateRequired_(body, ['id', 'course_id', 'title', 'duration', 'video_url']);

  updateRowById_(SHEET_NAMES.lessons, body.id, {
    course_id: body.course_id,
    title: body.title,
    duration: body.duration,
    note_content: body.note_content || '',
    note_url: body.note_url || '',
    video_url: body.video_url,
  });

  return { success: true, message: 'Lesson updated' };
}

function deleteLesson_(body) {
  validateRequired_(body, ['id']);
  deleteRowById_(SHEET_NAMES.lessons, body.id);
  return { success: true, message: 'Lesson deleted' };
}

function createNote_(body) {
  validateRequired_(body, ['title', 'lessons', 'category']);

  const note = {
    id: createId_('n'),
    title: body.title,
    lessons: body.lessons,
    category: body.category,
    type: body.type || 'free',
    url: body.url || '',
    content: body.content || '',
  };

  appendObjectRow_(getSheet_(SHEET_NAMES.notes), ['id', 'title', 'lessons', 'category', 'type', 'url', 'content'], note);
  return { success: true, note: note };
}

function updateNote_(body) {
  validateRequired_(body, ['id', 'title', 'lessons', 'category']);

  updateRowById_(SHEET_NAMES.notes, body.id, {
    title: body.title,
    lessons: body.lessons,
    category: body.category,
    type: body.type || 'free',
    url: body.url || '',
    content: body.content || '',
  });

  return { success: true, message: 'Note updated' };
}

function deleteNote_(body) {
  validateRequired_(body, ['id']);
  deleteRowById_(SHEET_NAMES.notes, body.id);
  return { success: true, message: 'Note deleted' };
}

function createQuiz_(body) {
  validateRequired_(body, ['topic']);

  const sheetName = ensureQuizSheet_(body.topic);

  const quiz = {
    id: createId_('q'),
    topic: body.topic,
    type: body.type || 'free',
    sheet_name: sheetName,
  };

  appendObjectRow_(getSheet_(SHEET_NAMES.quizzes), ['id', 'topic', 'type', 'sheet_name'], quiz);
  return { success: true, quiz: quiz };
}

function updateQuiz_(body) {
  validateRequired_(body, ['id', 'topic']);

  var currentQuiz = readSheetObjects_(SHEET_NAMES.quizzes).find(function(item) {
    return String(item.id) === String(body.id);
  });
  var nextSheetName = currentQuiz && currentQuiz.sheet_name
    ? renameQuizSheet_(currentQuiz.sheet_name, body.topic)
    : ensureQuizSheet_(body.topic);

  updateRowById_(SHEET_NAMES.quizzes, body.id, {
    topic: body.topic,
    type: body.type || 'free',
    sheet_name: nextSheetName,
  });

  return { success: true, message: 'Quiz updated' };
}

function deleteQuiz_(body) {
  validateRequired_(body, ['id']);
  var quiz = readSheetObjects_(SHEET_NAMES.quizzes).find(function(item) {
    return String(item.id) === String(body.id);
  });
  deleteRowById_(SHEET_NAMES.quizzes, body.id);
  deleteRowsByField_(SHEET_NAMES.questions, 'quiz_id', body.id);
  if (quiz && quiz.sheet_name) {
    clearQuizSheet_(quiz.sheet_name);
  }
  return { success: true, message: 'Quiz deleted' };
}

function verifyCourseAccess_(body) {
  validateRequired_(body, ['courseId', 'userId']);

  const courses = readSheetObjects_(SHEET_NAMES.courses);
  const course = courses.find(function(item) {
    return String(item.id) === String(body.courseId);
  });

  if (!course) {
    return { success: false, message: 'Course not found' };
  }

  if (String(course.type).toLowerCase() === 'free') {
    return { success: true };
  }

  validateRequired_(body, ['accessCode']);

  var enrollment = readSheetObjects_(SHEET_NAMES.enrollments).find(function(item) {
    return String(item.user_id) === String(body.userId) && String(item.course_id) === String(body.courseId);
  });
  var expectedCode = String(enrollment && enrollment.access_code || '').trim().toUpperCase();

  if (!expectedCode || expectedCode !== String(body.accessCode || '').trim().toUpperCase()) {
    return { success: false, message: 'Invalid access code' };
  }

  return { success: true };
}

function grantCourseAccess_(body) {
  validateRequired_(body, ['userId', 'courseId']);
  var generatedCode = String(body.accessCode || generateEnrollmentCode_()).trim().toUpperCase();
  ensureEnrollment_(body.userId, body.courseId, generatedCode);
  return { success: true, message: 'Course access granted', accessCode: generatedCode };
}

function revokeCourseAccess_(body) {
  validateRequired_(body, ['userId', 'courseId']);
  deleteEnrollment_(body.userId, body.courseId);
  return { success: true, message: 'Course access revoked' };
}

function updateCourseAccess_(body) {
  validateRequired_(body, ['courseId', 'accessCode']);

  const sheet = getSheet_(SHEET_NAMES.courses);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return { success: false, message: 'No courses available' };
  }

  const headers = values[0];
  const idIndex = headers.indexOf('id');
  const accessIndex = headers.indexOf('access_code');

  for (var row = 1; row < values.length; row++) {
    if (String(values[row][idIndex]) === String(body.courseId)) {
      sheet.getRange(row + 1, accessIndex + 1).setValue(body.accessCode);
      return { success: true, message: 'Access code updated' };
    }
  }

  return { success: false, message: 'Course not found' };
}

function createQuestion_(body) {
  validateRequired_(body, ['quiz_id', 'text', 'options', 'correctAnswer', 'explanation']);

  var quiz = getQuizById_(body.quiz_id);
  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const question = {
    id: createId_('qn'),
    quiz_id: body.quiz_id,
    text: body.text,
    options: JSON.stringify(body.options),
    correctAnswer: body.correctAnswer,
    explanation: body.explanation,
    image_url: body.image_url || '',
    option_images: JSON.stringify(Array.isArray(body.option_images) ? body.option_images : []),
  };

  appendObjectRow_(getQuestionSheet_(quiz), QUESTION_SHEET_HEADERS, question);
  return { success: true, question: question };
}

function importQuestions_(body) {
  validateRequired_(body, ['quiz_id', 'questions']);

  var quiz = getQuizById_(body.quiz_id);

  if (!quiz) {
    return { success: false, message: 'Quiz not found' };
  }

  var questions = normalizeImportedQuestions_(body.questions);
  var sheet = getQuestionSheet_(quiz);

  questions.forEach(function(item) {
    appendObjectRow_(sheet, QUESTION_SHEET_HEADERS, {
      id: createId_('qn'),
      quiz_id: body.quiz_id,
      text: item.text,
      options: JSON.stringify(item.options),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      image_url: item.image_url || '',
      option_images: JSON.stringify(item.option_images || []),
    });
  });

  return { success: true, message: questions.length + ' questions imported' };
}

function updateQuestion_(body) {
  validateRequired_(body, ['id', 'quiz_id', 'text', 'options', 'correctAnswer', 'explanation']);

  var questionSheetName = findQuestionSheetName_(body.id, body.quiz_id);
  updateRowById_(questionSheetName, body.id, {
    quiz_id: body.quiz_id,
    text: body.text,
    options: JSON.stringify(body.options),
    correctAnswer: body.correctAnswer,
    explanation: body.explanation,
    image_url: body.image_url || '',
    option_images: JSON.stringify(Array.isArray(body.option_images) ? body.option_images : []),
  });

  return { success: true, message: 'Question updated' };
}

function deleteQuestion_(body) {
  validateRequired_(body, ['id']);
  deleteRowById_(findQuestionSheetName_(body.id), body.id);
  return { success: true, message: 'Question deleted' };
}

function normalizeImportedQuestions_(questions) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new Error('Questions array is required');
  }

  return questions.map(function(item, index) {
    var normalizedOptions = normalizeQuestionOptions_(item);
    var options = normalizedOptions.options;
    var correctAnswer = Number(item.correctAnswer || 0);
    var text = String(item.text || '').trim();
    var explanation = String(item.explanation || '').trim();
    var imageUrl = String(item.image_url || item.image || item.questionImage || '').trim();

    if (!text || options.length < 2 || isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
      throw new Error('Invalid question at position ' + (index + 1));
    }

    return {
      text: text,
      options: options,
      correctAnswer: correctAnswer,
      explanation: explanation,
      image_url: imageUrl,
      option_images: normalizedOptions.option_images,
    };
  });
}

function getCourses_() {
  const courses = readSheetObjects_(SHEET_NAMES.courses);
  const lessons = readSheetObjects_(SHEET_NAMES.lessons);

  return courses.map(function(course) {
    return Object.assign({}, course, {
      lessons: Number(course.lessons || 0),
      price: Number(course.price || 0),
      oldPrice: Number(course.oldPrice || 0),
      access_code: undefined,
      lessonList: lessons.filter(function(lesson) {
        return String(lesson.course_id) === String(course.id);
      }),
    });
  });
}

function getSliders_() {
  return readSheetObjects_(SHEET_NAMES.sliders)
    .map(function(slider) {
      var driveFileId = String(slider.drive_file_id || '').trim();
      var imageUrl = String(slider.image_url || '').trim();
      return {
        id: slider.id,
        title: slider.title || '',
        subtitle: slider.subtitle || '',
        image_url: imageUrl || (driveFileId ? buildDriveImageUrl_(driveFileId) : ''),
        drive_file_id: driveFileId,
        sort_order: Number(slider.sort_order || 0),
        is_active: String(slider.is_active || 'true').toLowerCase() !== 'false',
      };
    })
    .sort(function(a, b) {
      return a.sort_order - b.sort_order;
    });
}

function getUsers_() {
  const users = readSheetObjects_(SHEET_NAMES.users);
  return users.map(function(user) {
    var resolvedId = coalesceObjectValue_(user, ['id', 'ID', 'Id', 'user_id', 'userId', 'User ID', 'Student ID', 'student_id']);
    var resolvedName = coalesceObjectValue_(user, ['name', 'Name', 'full_name', 'fullName', 'student_name', 'Student Name']);
    var resolvedEmail = coalesceObjectValue_(user, ['email', 'Email', 'email_address', 'emailAddress', 'Email Address']);
    var resolvedPassword = coalesceObjectValue_(user, ['password', 'Password', 'pass', 'Pass']);

    return Object.assign({}, user, {
      id: resolvedId || resolvedEmail || resolvedName || createId_('u'),
      name: resolvedName || resolvedEmail || 'Student',
      email: resolvedEmail || '',
      password: resolvedPassword || '',
      grantedCourseIds: getGrantedCourseIds_(resolvedId || resolvedEmail || resolvedName || ''),
    });
  }).filter(function(user) {
    return String(user.id || '').trim() || String(user.email || '').trim() || String(user.name || '').trim();
  });
}

function getUserAccess_(userId) {
  if (!userId) {
    return [];
  }
  return getGrantedCourseIds_(userId);
}

function getNotes_() {
  return readSheetObjects_(SHEET_NAMES.notes).map(function(note) {
    return Object.assign({}, note, {
      lessons: Number(note.lessons || 0),
    });
  });
}

function getQuizzes_() {
  const quizzes = readSheetObjects_(SHEET_NAMES.quizzes);

  return quizzes.map(function(quiz) {
    var questionSheet = getQuestionSheet_(quiz);
    var questions = readSheetObjects_(questionSheet.getName());
    return Object.assign({}, quiz, {
      questions: questions
        .filter(function(question) {
          return String(question.quiz_id) === String(quiz.id);
        })
        .map(function(question) {
          return {
            id: question.id,
            quiz_id: question.quiz_id,
            text: question.text,
            options: parseOptions_(question.options),
            correctAnswer: Number(question.correctAnswer || 0),
            explanation: question.explanation || '',
            image_url: question.image_url || '',
            option_images: parseOptions_(question.option_images),
          };
        }),
    });
  });
}

function parseOptions_(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return String(value).split('|').map(function(item) {
      return item.trim();
    }).filter(Boolean);
  }
}

function getSheet_(name) {
  ensureAppSheets_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  return sheet;
}

function getQuizById_(quizId) {
  return readSheetObjects_(SHEET_NAMES.quizzes).find(function(item) {
    return String(item.id) === String(quizId);
  });
}

function getQuestionSheet_(quiz) {
  var sheetName = quiz && quiz.sheet_name ? String(quiz.sheet_name) : ensureQuizSheet_(quiz.topic || 'Quiz');
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  ensureHeaders_(sheet, QUESTION_SHEET_HEADERS);
  return sheet;
}

function buildQuizSheetName_(topic) {
  var base = String(topic || 'Quiz').trim() || 'Quiz';
  var sanitized = base.replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
  sanitized = sanitized.substring(0, 85);
  return sanitized + ' Quiz';
}

function ensureQuizSheet_(topic) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var name = buildQuizSheetName_(topic);
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  ensureHeaders_(sheet, QUESTION_SHEET_HEADERS);
  return sheet.getName();
}

function renameQuizSheet_(currentName, topic) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var targetName = buildQuizSheetName_(topic);
  if (String(currentName) === targetName) {
    ensureQuizSheet_(targetName);
    return targetName;
  }

  var existingTarget = spreadsheet.getSheetByName(targetName);
  if (existingTarget) {
    ensureHeaders_(existingTarget, QUESTION_SHEET_HEADERS);
    return existingTarget.getName();
  }

  var currentSheet = spreadsheet.getSheetByName(currentName);
  if (!currentSheet) {
    return ensureQuizSheet_(topic);
  }

  currentSheet.setName(targetName);
  ensureHeaders_(currentSheet, QUESTION_SHEET_HEADERS);
  return currentSheet.getName();
}

function clearQuizSheet_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    return;
  }
  sheet.clear();
  ensureHeaders_(sheet, QUESTION_SHEET_HEADERS);
}

function migrateQuestionsToSubjectSheets() {
  ensureAppSheets_();

  var quizzes = readSheetObjects_(SHEET_NAMES.quizzes);
  var legacyQuestions = readSheetObjects_(SHEET_NAMES.questions);
  var migratedSheets = [];
  var migratedQuestions = 0;

  quizzes.forEach(function(quiz) {
    var sheetName = quiz.sheet_name ? String(quiz.sheet_name) : ensureQuizSheet_(quiz.topic);
    if (!quiz.sheet_name) {
      updateRowById_(SHEET_NAMES.quizzes, quiz.id, { sheet_name: sheetName });
    }

    var subjectSheet = getSheet_(sheetName);
    ensureHeaders_(subjectSheet, QUESTION_SHEET_HEADERS);

    var existingRows = readSheetObjects_(sheetName);
    var existingIds = {};
    existingRows.forEach(function(row) {
      existingIds[String(row.id)] = true;
    });

    legacyQuestions
      .filter(function(question) {
        return String(question.quiz_id) === String(quiz.id);
      })
      .forEach(function(question) {
        if (existingIds[String(question.id)]) {
          return;
        }

        appendObjectRow_(subjectSheet, QUESTION_SHEET_HEADERS, {
          id: question.id || createId_('qn'),
          quiz_id: question.quiz_id || quiz.id,
          text: question.text || '',
          options: question.options || '[]',
          correctAnswer: question.correctAnswer || 0,
          explanation: question.explanation || '',
          image_url: question.image_url || '',
          option_images: question.option_images || '[]',
        });
        migratedQuestions += 1;
      });

    migratedSheets.push(sheetName);
  });

  return {
    success: true,
    message: 'Migration completed',
    totalQuizSheets: migratedSheets.length,
    migratedQuestions: migratedQuestions,
    sheets: migratedSheets,
  };
}

function findQuestionSheetName_(questionId, quizId) {
  var quizzes = readSheetObjects_(SHEET_NAMES.quizzes);
  if (quizId) {
    var quiz = quizzes.find(function(item) {
      return String(item.id) === String(quizId);
    });
    if (quiz && quiz.sheet_name) {
      return String(quiz.sheet_name);
    }
  }

  for (var index = 0; index < quizzes.length; index++) {
    var quizSheetName = String(quizzes[index].sheet_name || '');
    if (!quizSheetName) continue;
    var questions = readSheetObjects_(quizSheetName);
    var matched = questions.find(function(item) {
      return String(item.id) === String(questionId);
    });
    if (matched) {
      return quizSheetName;
    }
  }

  return SHEET_NAMES.questions;
}

function normalizeQuestionOptions_(item) {
  var options = [];
  var optionImages = [];

  if (Array.isArray(item.options)) {
    item.options.forEach(function(option) {
      if (option && typeof option === 'object') {
        options.push(String(option.text || option.label || option.option || '').trim());
        optionImages.push(String(option.image_url || option.image || option.imageUrl || '').trim());
        return;
      }
      options.push(String(option || '').trim());
      optionImages.push('');
    });
  }

  if (!options.filter(Boolean).length) {
    ['option1', 'option2', 'option3', 'option4', 'option5', 'a', 'b', 'c', 'd', 'e'].forEach(function(key, index) {
      var optionValue = item[key];
      if (optionValue !== undefined && optionValue !== null && String(optionValue).trim()) {
        options.push(String(optionValue).trim());
        optionImages.push(String(item[key + '_image'] || item[key + 'Image'] || '').trim());
      }
    });
  }

  return {
    options: options.filter(Boolean),
    option_images: optionImages.slice(0, options.filter(Boolean).length),
  };
}

function readSheetObjects_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(header) {
    return String(header).trim();
  });

  return values.slice(1).filter(function(row) {
    return row.some(function(cell) { return cell !== ''; });
  }).map(function(row) {
    const item = {};
    headers.forEach(function(header, index) {
      item[header] = row[index];
    });
    return item;
  });
}

function appendObjectRow_(sheet, headers, item) {
  ensureHeaders_(sheet, headers);
  const row = headers.map(function(header) {
    return item[header] !== undefined ? item[header] : '';
  });
  sheet.appendRow(row);
}

function updateRowById_(sheetName, id, updates) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('No data available in ' + sheetName);
  }

  const headers = values[0];
  const idIndex = headers.indexOf('id');
  for (var row = 1; row < values.length; row++) {
    if (String(values[row][idIndex]) === String(id)) {
      headers.forEach(function(header, index) {
        if (Object.prototype.hasOwnProperty.call(updates, header)) {
          sheet.getRange(row + 1, index + 1).setValue(updates[header]);
        }
      });
      return;
    }
  }

  throw new Error(sheetName + ' item not found');
}

function deleteRowById_(sheetName, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('No data available in ' + sheetName);
  }

  const headers = values[0];
  const idIndex = headers.indexOf('id');
  for (var row = values.length - 1; row >= 1; row--) {
    if (String(values[row][idIndex]) === String(id)) {
      sheet.deleteRow(row + 1);
      return;
    }
  }

  throw new Error(sheetName + ' item not found');
}

function deleteRowsByField_(sheetName, fieldName, value) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0];
  const fieldIndex = headers.indexOf(fieldName);
  if (fieldIndex === -1) return;

  for (var row = values.length - 1; row >= 1; row--) {
    if (String(values[row][fieldIndex]) === String(value)) {
      sheet.deleteRow(row + 1);
    }
  }
}

function getGrantedCourseIds_(userId) {
  const enrollments = readSheetObjects_(SHEET_NAMES.enrollments);
  return enrollments
    .filter(function(item) {
      return String(item.user_id) === String(userId);
    })
    .map(function(item) {
      return String(item.course_id);
    });
}

function ensureEnrollment_(userId, courseId, accessCode) {
  const enrollments = readSheetObjects_(SHEET_NAMES.enrollments);
  const existing = enrollments.find(function(item) {
    return String(item.user_id) === String(userId) && String(item.course_id) === String(courseId);
  });

  if (existing) {
    if (accessCode) {
      updateRowById_(SHEET_NAMES.enrollments, existing.id, {
        access_code: String(accessCode).trim().toUpperCase(),
        granted_at: new Date().toISOString(),
      });
    }
    return;
  }

  appendObjectRow_(
    getSheet_(SHEET_NAMES.enrollments),
    SHEET_HEADERS.Enrollments,
    {
      id: createId_('en'),
      user_id: userId,
      course_id: courseId,
      access_code: String(accessCode || '').trim().toUpperCase(),
      granted_at: new Date().toISOString(),
    }
  );
}

function generateEnrollmentCode_() {
  return 'RBS-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function deleteEnrollment_(userId, courseId) {
  const sheet = getSheet_(SHEET_NAMES.enrollments);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0];
  const userIndex = headers.indexOf('user_id');
  const courseIndex = headers.indexOf('course_id');

  for (var row = values.length - 1; row >= 1; row--) {
    if (String(values[row][userIndex]) === String(userId) && String(values[row][courseIndex]) === String(courseId)) {
      sheet.deleteRow(row + 1);
    }
  }
}

function saveSliderImage_(body) {
  if (!body.imageData) {
    return {
      imageUrl: body.image_url || '',
      driveFileId: body.drive_file_id || '',
    };
  }

  var base64Data = String(body.imageData).split(',').pop();
  var bytes = Utilities.base64Decode(base64Data);
  var contentType = body.mimeType || 'image/jpeg';
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(contentType)) {
    throw new Error('Only JPG, PNG, WEBP, and GIF slider images are supported');
  }
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error('Slider image must be 5 MB or smaller');
  }
  var extension = getFileExtension_(contentType);
  var fileName = (body.fileName || ('slider-' + new Date().getTime() + extension)).replace(/[^\w.\- ]/g, '');
  var blob = Utilities.newBlob(bytes, contentType, fileName);
  var folder = getSliderUploadFolder_();
  var file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    imageUrl: buildDriveImageUrl_(file.getId()),
    driveFileId: file.getId(),
  };
}

function getSliderUploadFolder_() {
  var folderId = PropertiesService.getScriptProperties().getProperty('SLIDER_UPLOAD_FOLDER_ID');
  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  var folderName = 'RBS Academy Slider Uploads';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(folderName);
}

function buildDriveImageUrl_(fileId) {
  return 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(fileId) + '=w1600';
}

function trashDriveFile_(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (error) {}
}

function getFileExtension_(mimeType) {
  switch (String(mimeType || '').toLowerCase()) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function ensureAppSheets_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEET_HEADERS).forEach(function(sheetName) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    ensureHeaders_(sheet, SHEET_HEADERS[sheetName]);
  });
}

function validateRequired_(body, fields) {
  fields.forEach(function(field) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw new Error(field + ' is required');
    }
  });
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}

function coalesceObjectValue_(record, keys) {
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index];
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim()) {
      return String(record[key]).trim();
    }
  }
  return '';
}

function createId_(prefix) {
  return prefix + new Date().getTime();
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
