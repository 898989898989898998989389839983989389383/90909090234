# 🎯 Play Console Mein Setup Kaha Hai? (Screenshots Guide)

## 📱 Step-by-Step Navigation

### Step 1: Play Console Login Karo

**URL:** https://play.google.com/console

**Login karo** apne Google account se (jisse app publish kiya tha)

---

### Step 2: App Select Karo

**Dashboard pe 2 sections dikhenge:**

```
┌─────────────────────────────────────┐
│  All apps                           │
├─────────────────────────────────────┤
│  📱 RBS Academy                     │  ← YEH CLICK KARO
│     com.rbsacademy.app              │
│     Status: Published               │
└─────────────────────────────────────┘
```

**Click karo:** RBS Academy app pe

---

### Step 3: Left Sidebar Mein "Setup" Dhundo

App open hone ke baad **LEFT SIDE** mein menu dikhega:

```
┌─────────────────────────┐
│ 📊 Dashboard            │
│                         │
│ 🚀 Release              │
│   ├─ Production         │
│   ├─ Open testing       │
│   └─ Closed testing     │
│                         │
│ 👥 Users and feedback   │
│                         │
│ 🎨 Grow                 │
│   ├─ Store presence     │
│   └─ Store settings     │
│                         │
│ 💰 Monetize             │
│                         │
│ ⚙️ Setup                │  ← YEH HAI SETUP!
│   ├─ App signing        │  ← YAHAAN JAO!
│   ├─ App integrity      │
│   ├─ Advanced settings  │
│   └─ API access         │
│                         │
│ 📈 Policy               │
└─────────────────────────┘
```

---

### Step 4: Setup → App signing Pe Click Karo

**Path:** Setup → **App signing**

**Screen khulega:**

```
┌──────────────────────────────────────────────────┐
│  App signing                                      │
├──────────────────────────────────────────────────┤
│                                                   │
│  ✅ App signing by Google Play is enabled        │
│                                                   │
│  App signing key certificate                     │
│  ┌──────────────────────────────────────┐       │
│  │ SHA-1 certificate fingerprint:        │       │
│  │ XX:XX:XX:XX:XX:XX:XX:XX:XX:XX        │       │
│  │                                       │       │
│  │ SHA-256 certificate fingerprint:      │       │
│  │ XX:XX:XX:XX:XX:XX:XX:XX:XX:XX        │       │
│  └──────────────────────────────────────┘       │
│                                                   │
│  Upload key certificate                          │
│  ┌──────────────────────────────────────┐       │
│  │ [ No upload key ]                     │       │
│  │                                       │       │
│  │ [Upload new certificate] button       │  ← YAHAAN!
│  └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Agar "Setup" Nahi Dikh Raha?

### Option 1: Scroll Down Karo
Left sidebar mein scroll down karo, neeche hoga

### Option 2: Search Use Karo
Top pe **search box** mein type karo: "App signing"

### Option 3: Direct URL
Browser mein yeh URL dalao:

```
https://play.google.com/console/u/0/developers/[YOUR_DEVELOPER_ID]/app/[YOUR_APP_ID]/app-signing
```

Ya simple:
```
https://play.google.com/console → Your App → Left menu → Setup → App signing
```

---

## 📸 Visual Guide:

### Screen 1: Dashboard (After Login)
```
┌───────────────────────────────────────────────────┐
│  Google Play Console                               │
├───────────────────────────────────────────────────┤
│                                                    │
│  All apps (1)                                      │
│                                                    │
│  ┌──────────────────────────────────────┐        │
│  │  📱 RBS Academy                       │        │
│  │  com.rbsacademy.app                  │        │
│  │  Production • Published               │        │
│  │                                       │        │
│  │  [View app] button                   │   ← CLICK
│  └──────────────────────────────────────┘        │
└───────────────────────────────────────────────────┘
```

### Screen 2: App Dashboard (After Selecting App)
```
┌────────────┬──────────────────────────────────────┐
│ Dashboard  │  RBS Academy Overview                 │
│            │                                       │
│ Release ▼  │  Statistics, ratings, etc...          │
│  Production│                                       │
│            │                                       │
│ Grow ▼     │                                       │
│            │                                       │
│ Setup ▼    │  ← LEFT MEIN YEH HAI!                │
│  App sign..│                                       │
│            │                                       │
└────────────┴──────────────────────────────────────┘
```

### Screen 3: Setup Menu Expanded
```
┌─────────────────────────┐
│ ⚙️ Setup               │
│   ├─ 🔑 App signing    │ ← YAHAAN CLICK KARO
│   ├─ 🛡️ App integrity  │
│   ├─ ⚡ Advanced sett.. │
│   └─ 🔌 API access     │
└─────────────────────────┘
```

---

## ✅ App Signing Page Pe Kya Dikhega?

### Section 1: App Signing Status
```
✅ App signing by Google Play is enabled
```
**Matlab:** Google manage kar raha hai production signing

### Section 2: App Signing Key Certificate
```
SHA-1: XX:XX:XX:XX...
SHA-256: YY:YY:YY:YY...
```
**Yeh hai:** Production signing key (Google ke paas hai)

### Section 3: Upload Key Certificate
```
┌─────────────────────────────────────────┐
│ Upload key certificate                   │
│                                          │
│ [ No upload key registered ]             │
│                                          │
│ Or showing existing upload key details   │
│                                          │
│ [Upload new certificate] button          │
│ [Request upload key reset] button        │
└─────────────────────────────────────────┘
```

**Yahaan aapko certificate upload karna hai!**

---

## 🔄 Agar Upload Key Already Registered Hai?

Agar upload key section mein already certificate hai:

### Option A: Same Key Use Karo
Agar aapke paas wo keystore file hai, use karo

### Option B: Reset Request Karo
1. **"Request upload key reset"** button click karo
2. Reason select karo: "Lost upload key"
3. Submit karo
4. Google review karega (24-48 hours)
5. Approve hone pe naya certificate upload karo

---

## 🆘 Agar Kuch Nahi Dikh Raha?

### Check 1: Correct Account?
- Jo account se app publish kiya tha, wahi login hai?
- Top-right corner mein account check karo

### Check 2: App Access?
- Aapko is app ka access hai?
- Owner/Admin role hai?

### Check 3: Browser Issue?
- Try different browser (Chrome recommended)
- Clear cache & cookies
- Try incognito mode

---

## 📞 Quick Help Commands

### Navigate Directly:
1. Go to: https://play.google.com/console
2. Click: Your app name
3. Left menu: Click **"Setup"** (scroll down if needed)
4. Click: **"App signing"**

### Alternative Search:
1. Top search bar mein type karo: `app signing`
2. First result click karo

---

## 🎯 Next Steps After Finding Setup:

1. ✅ Verify: "App signing by Google Play is enabled"
2. 📤 Upload: Your `upload_certificate.pem` file
3. ⏳ Wait: 15-30 minutes for verification
4. 🚀 Upload: Your `app-release.aab` file

---

## 💡 Pro Tip:

**Bookmark this URL pattern:**
```
https://play.google.com/console/u/0/apps
```

Directly apke apps list pe le jayega!

---

**Setup mil gaya? Batao! 🚀**
