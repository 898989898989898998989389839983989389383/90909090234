# Google Apps Script Setup

## 1. Open Apps Script from your Google Sheet

1. Open the Google Sheet
2. Go to `Extensions > Apps Script`
3. Replace the default code with `apps-script/Code.gs`
4. Save the project

The script now auto-creates all required tabs and headers.
You can also run `initializeSheets()` once manually from the Apps Script editor.
If you already have old mixed quiz data in the `Questions` sheet, run `migrateQuestionsToSubjectSheets()` once to split it into subject-wise sheets.

## 2. Auto-created headers

### `Users`
`id | name | email | password`

### `Sliders`
`id | title | subtitle | image_url | drive_file_id | sort_order | is_active`

### `Courses`
`id | title | lessons | image | price | oldPrice | type | category | access_code`

### `Lessons`
`id | course_id | title | duration | note_content | note_url | video_url`

### `Notes`
`id | title | lessons | category | type | url | content`

### `Quizzes`
`id | topic | type | sheet_name`

### `Questions`
`id | quiz_id | text | options | correctAnswer | explanation | image_url | option_images`

`options` should be stored as JSON, for example:
`["Option 1","Option 2","Option 3","Option 4"]`

## Sheet meaning

- `Sliders.image_url`:
  - this is automatically filled when admin uploads a slider image
- `Sliders.drive_file_id`:
  - stores the Google Drive file ID for cleanup/update tracking
- `Sliders.sort_order`:
  - lower number shows first in the home slider
- `Sliders.is_active`:
  - use `true` or `false`
- `type`:
  - use `free` or `premium`
- `Quizzes.sheet_name`:
  - auto-created when a quiz topic is created
  - each subject quiz gets its own sheet like `Chemistry Quiz` or `Math Quiz`
- subject quiz sheets:
  - are auto-created with headers:
  - `id | quiz_id | text | options | correctAnswer | explanation | image_url | option_images`
- `access_code`:
  - only needed for premium courses
- `url` in `Notes`:
  - use a PDF/view/share URL if you want the note to open from a hosted file
- `note_url` in `Lessons`:
  - optional hosted note link for lesson-wise notes
- `video_url` in `Lessons`:
  - use embeddable YouTube/video URLs

## 3. Deploy as web app

1. Click `Deploy > New deployment`
2. Choose `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Deploy and copy the web app URL

## 3.1 Optional Google Drive folder for slider uploads

If you want slider images stored in a specific Google Drive folder:

1. Create a folder in Google Drive
2. In Apps Script open `Project Settings`
3. Add a script property:

`SLIDER_UPLOAD_FOLDER_ID=your_google_drive_folder_id`

If this property is not set, slider images are uploaded to the script owner's root Drive.

## 4. Connect frontend

Create a `.env` file in the project root:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/your-web-app-id/exec
```

Then restart the frontend/dev server.

## 5. Supported actions

### GET
- `?resource=sliders`
- `?resource=courses`
- `?resource=notes`
- `?resource=quizzes`
- `?resource=users`

## 6. One-time migration for old question data

If your old data is still stored in the shared `Questions` sheet:

1. Open Apps Script
2. Save the latest `Code.gs`
3. Run `initializeSheets()`
4. Run `migrateQuestionsToSubjectSheets()`
5. Check your spreadsheet for new tabs like:
   - `Chemistry Quiz`
   - `Math Quiz`
   - `Physics Quiz`

This migration copies data into subject sheets and does not delete your old `Questions` sheet rows.

### POST
- `action=login`
- `action=signup`
- `action=updateProfile`
- `action=verifyCourseAccess`
- `action=updateCourseAccess`
- `action=createCourse`
- `action=createSlider`
- `action=updateSlider`
- `action=deleteSlider`
- `action=updateCourse`
- `action=deleteCourse`
- `action=createLesson`
- `action=updateLesson`
- `action=deleteLesson`
- `action=createNote`
- `action=updateNote`
- `action=deleteNote`
- `action=createQuiz`
- `action=updateQuiz`
- `action=deleteQuiz`
- `action=createQuestion`
- `action=importQuestions`
- `action=updateQuestion`
- `action=deleteQuestion`

For POST requests, send JSON in the request body.
