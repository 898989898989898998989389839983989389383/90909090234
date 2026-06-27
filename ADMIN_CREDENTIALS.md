# 🔐 RBS Academy Admin Panel - Login Details

## 📋 Admin Credentials Overview

Your RBS Academy app has **TWO types of admin accounts**:

---

## 👤 Regular Admin Account

### Login Details:
```
Username: admin
Password: admin123
Role: Admin
```

### Access Level:
✅ Manage courses (create, edit, delete)
✅ Manage students/users
✅ Manage notes and PDFs
✅ Manage quizzes and questions
✅ Manage sliders/banners
✅ Manage live classes
✅ Grant premium access
✅ Send push notifications
✅ View app control settings
✅ View dashboard analytics

❌ Cannot change app-wide security settings
❌ Cannot modify system configuration
❌ Limited admin management access

**Best for**: Daily content management and user support

---

## 👑 Super Admin Account

### Login Details:
```
Username: adminsachin
Password: admin123
Role: Superadmin
```

### Access Level:
✅ **ALL regular admin permissions** +
✅ Full app control settings
✅ Maintenance mode toggle
✅ Force update control
✅ Screenshot protection settings
✅ System-wide configuration
✅ Manage other admin accounts
✅ Advanced security settings
✅ Complete system access

**Best for**: System configuration and advanced settings

---

## 🌐 How to Access Admin Panel

### Method 1: Direct URL
```
http://localhost:3001/admin
```
or production:
```
https://rbs-academy-current-b2y4td9q7-devamobg-3608s-projects.vercel.app/admin
```

### Method 2: From App
1. Open the app
2. Click on your profile (if logged in as student)
3. Look for "Admin Panel" or go to `/admin` route

---

## 🔒 Security Information

### Where Credentials are Stored:

**1. Environment Variables (`.env` file):**
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SUPER_ADMIN_USERNAME=adminsachin
SUPER_ADMIN_PASSWORD=admin123
```

**2. Database (Hashed):**
- Passwords are hashed using `scrypt` algorithm
- Format: `scrypt:[salt]:[hash]`
- Cannot be reversed

**3. Session Storage:**
- Admin sessions expire after **12 hours**
- Stored in `localStorage` as `rbs-academy-admin-session`
- Session token format: JWT-style signed token

### Important Security Notes:

⚠️ **These are DEFAULT credentials** - You should change them!

**Current Issues:**
1. ❌ Weak passwords (`admin123` is too simple)
2. ❌ Stored in `.env` file (can be exposed)
3. ❌ Same password for both admin and superadmin
4. ❌ No password complexity requirements

---

## 🔐 Recommended Security Changes

### 1. Change Admin Passwords Immediately

**Update `.env` file:**
```env
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password-here-min-12-chars
SUPER_ADMIN_USERNAME=your-superadmin-username  
SUPER_ADMIN_PASSWORD=your-very-secure-password-here
```

**Strong Password Requirements:**
- Minimum 12 characters
- Mix of uppercase, lowercase
- Include numbers
- Include special characters
- Example: `Rb$@cad3my2026!Admin`

### 2. Use Environment-Specific Credentials

**Development:**
```env
ADMIN_USERNAME=dev-admin
ADMIN_PASSWORD=dev-password-123
```

**Production:**
```env
ADMIN_USERNAME=prod-admin-secure
ADMIN_PASSWORD=super-secure-prod-password-2026!
```

### 3. Secure `.env` File

**In `.gitignore` (already added):**
```
.env
.env.local
.env.*.local
```

**Never commit `.env` to Git!**

### 4. Add Multi-Factor Authentication (Future)

Consider adding:
- OTP via email
- Google Authenticator
- SMS verification
- Biometric on mobile

---

## 📱 Mobile App Admin Access

The admin panel is **web-based only** and accessible through:

### Android App:
1. Open app in browser mode
2. Navigate to `/admin` route
3. Login with credentials
4. Full admin functionality available

### Capacitor WebView:
- Admin panel loads in WebView
- All features work
- No native app required

---

## 🔄 How to Reset Admin Password

### Method 1: Via `.env` file
1. Stop the server
2. Update password in `.env`
3. Restart server
4. New password takes effect immediately

### Method 2: Via Database (if forgotten)
1. Connect to Supabase database
2. Run SQL:
```sql
-- Delete old credentials
DELETE FROM admin_credentials WHERE username = 'admin';

-- Restart app to seed new credentials from .env
```

### Method 3: Create New Admin (Future Feature)
You can add a password reset endpoint:
```typescript
// POST /api/admin/reset-password
// Requires current password or recovery token
```

---

## 🎯 Admin Panel Features Breakdown

### Dashboard Tab
- System health score
- Total courses, students, notes
- Recent activity
- Quick stats

### App Control Tab
- App name
- Welcome message
- Maintenance mode
- Force update
- Screenshot protection
- Push notifications
- Offline page settings

### Courses Tab
- Add/edit/delete courses
- Upload thumbnails
- Set pricing (free/premium)
- Manage lessons
- YouTube playlist import

### Students Tab
- View all users
- Search/filter students
- Grant premium access
- Block/unblock users
- View student details

### Notes Tab
- Upload PDF notes
- Create text notes
- Categorize notes
- Set free/premium

### Quiz Tab
- Create quizzes
- Add questions
- Upload question images
- Set correct answers

### Live Classes Tab
- Schedule Google Meet/Zoom
- Set access (free/premium)
- Choose audience
- Manage live sessions

### Push Notifications Tab
- Send to all users
- Target specific students
- Schedule notifications
- View notification history

---

## 🚨 What to Do If Locked Out

### If you forgot admin password:

**Option 1: Check `.env` file**
```bash
cat .env | grep ADMIN
```

**Option 2: Reset via Database**
```sql
-- Connect to database
-- Delete admin credentials
DELETE FROM admin_credentials;
-- Restart app to re-seed
```

**Option 3: Create Recovery Script**
```bash
# Add to package.json
"scripts": {
  "reset-admin": "node scripts/reset-admin.js"
}
```

### Emergency Access:
If completely locked out:
1. Stop the app
2. Edit `.env` with known password
3. Clear database admin_credentials table
4. Restart app
5. Login with `.env` credentials

---

## 💡 Best Practices

### ✅ Do's:
- ✅ Use strong, unique passwords
- ✅ Change default credentials immediately
- ✅ Keep `.env` file secure
- ✅ Use different passwords for dev/prod
- ✅ Rotate passwords periodically (every 90 days)
- ✅ Use superadmin only when needed
- ✅ Log out after admin work
- ✅ Monitor admin activity logs

### ❌ Don'ts:
- ❌ Don't commit `.env` to Git
- ❌ Don't share credentials in chat/email
- ❌ Don't use same password everywhere
- ❌ Don't stay logged in on shared computers
- ❌ Don't expose admin URLs publicly
- ❌ Don't use weak passwords
- ❌ Don't give superadmin to everyone

---

## 📊 Current Admin Setup Summary

**Environment**: Local Development + Vercel Production

**Database**: Supabase PostgreSQL

**Authentication Method**: Username/Password with scrypt hashing

**Session Duration**: 12 hours

**Storage**: 
- Credentials: `.env` + database
- Sessions: localStorage

**Security Level**: ⚠️ **Medium** (needs improvement)

**Recommended Actions**:
1. 🔴 Change passwords immediately
2. 🟡 Add rate limiting to admin login
3. 🟡 Add login attempt logging
4. 🟢 Keep `.env` out of Git (already done)
5. 🔴 Add MFA for production

---

## 🔧 Quick Reference Commands

### View current credentials:
```bash
# In terminal
cat .env | grep ADMIN
```

### Test admin login:
```bash
# curl to admin endpoint
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'
```

### Clear admin session:
```javascript
// In browser console
localStorage.removeItem('rbs-academy-admin-session');
```

---

## 📞 Support

If you need help with admin access:
1. Check this document first
2. Verify `.env` file has correct values
3. Check database `admin_credentials` table
4. Try clearing browser cache/localStorage
5. Restart the development server

---

## 🎯 Next Steps

**Immediate (Critical):**
1. ⚠️ **Change default passwords** - Do this first!
2. Verify admin panel loads on localhost
3. Test both admin and superadmin logins

**Short-term (This Week):**
1. Add password complexity requirements
2. Add rate limiting (5 attempts, then 15min lockout)
3. Add admin activity logging
4. Set up different prod/dev passwords

**Long-term (Future):**
1. Multi-factor authentication
2. Role-based permissions (custom roles)
3. Admin invitation system
4. Password reset via email
5. Audit log for all admin actions

---

## ✅ Quick Start Checklist

- [ ] Locate `.env` file in project root
- [ ] Find admin credentials (username: `admin`, password: `admin123`)
- [ ] Open http://localhost:3001/admin
- [ ] Login with credentials
- [ ] Verify dashboard loads
- [ ] Change password to something secure
- [ ] Test superadmin login (username: `adminsachin`)
- [ ] Bookmark admin URL
- [ ] Save new credentials securely (password manager)

---

**Last Updated**: Right now! 
**Your Current Credentials**: See top of document
**Need to change passwords?**: Edit `.env` file then restart server

🎉 You're all set! Login and start managing your academy!
