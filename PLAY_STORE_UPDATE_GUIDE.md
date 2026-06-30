# 🚀 RBS Academy - Play Store Update Guide

## Current Situation
- **Existing App:** Published on Play Store (using no-code platform)
- **Package Name:** `com.rbsacademy.app` ✅ (Same)
- **Signing Key:** Not available from previous platform
- **Google Play App Signing:** Likely enabled (automatic)

---

## ✅ Solution: Google Play App Signing

When you first uploaded your app, Google Play automatically enrolled it in **App Signing by Google Play**. This means:

✅ Google manages the production signing key  
✅ You can upload with any **upload key**  
✅ Google re-signs it with the original key automatically

---

## 📋 Step-by-Step Instructions

### Step 1: Verify Google Play App Signing Status

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your **RBS Academy** app
3. Go to: **Setup → App signing**
4. Check if you see: "App signing by Google Play is enabled" ✅

**If YES:** Follow Step 2 below  
**If NO:** You need the original signing key (contact previous platform support)

---

### Step 2: Generate New Upload Keystore (For This Project)

Since you don't have the original keystore, we'll create a **new upload key** and register it with Google Play Console.

Run this command in your project directory:

```bash
# Navigate to android/app directory
cd android/app

# Generate upload keystore
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# You'll be asked these questions:
# Enter keystore password: [Create strong password, e.g., RBSAcademy@2024]
# Re-enter new password: [Same password]
# What is your first and last name?: [Your name]
# What is the name of your organizational unit?: RBS Academy
# What is the name of your organization?: RBS Academy
# What is the name of your City or Locality?: [Your city]
# What is the name of your State or Province?: [Your state]
# What is the two-letter country code?: IN
# Is CN=..., correct?: yes
```

**IMPORTANT:** Save these details securely:
- Keystore file location: `android/app/upload-keystore.jks`
- Keystore password: ________________
- Key alias: `upload`
- Key password: [Same as keystore password]

---

### Step 3: Configure Gradle to Use Keystore

Create a file: `android/key.properties`

```properties
storePassword=[YOUR_KEYSTORE_PASSWORD]
keyPassword=[YOUR_KEY_PASSWORD]
keyAlias=upload
storeFile=upload-keystore.jks
```

Update `android/app/build.gradle`:

```gradle
// Add this BEFORE 'android {' block
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    // Add this inside 'android {' block
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### Step 4: Update Version Code

**IMPORTANT:** Version code must be higher than the current published version.

In `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.rbsacademy.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 14  // Increase from 13 → 14
    versionName "1.14"  // Update version name
    ...
}
```

---

### Step 5: Build the Web Assets

```bash
# Build React/Vite project
npm run build

# Copy to Android
npx cap sync android
```

---

### Step 6: Build AAB File

**Option A: Using Gradle (Command Line)**

```bash
cd android
./gradlew bundleRelease
```

**Option B: Using Android Studio**

1. Open `android` folder in Android Studio
2. Go to: **Build → Generate Signed Bundle / APK**
3. Select **Android App Bundle**
4. Choose keystore: `android/app/upload-keystore.jks`
5. Enter passwords
6. Select **release** build variant
7. Click **Finish**

**Output Location:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

### Step 7: Register New Upload Key with Google Play (FIRST TIME ONLY)

Since this is a new upload key, you need to register it:

#### A. Extract Upload Certificate

```bash
cd android/app
keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem
```

#### B. Upload to Google Play Console

1. Go to: **Play Console → Setup → App signing**
2. Scroll to: **Upload key certificate**
3. Click: **Request upload key reset** (if needed) OR **Upload new certificate**
4. Upload the `upload_certificate.pem` file
5. Confirm the process

**Note:** First upload with new key might need manual review by Google (24-48 hours).

---

### Step 8: Upload AAB to Play Console

1. Go to: **Play Console → Production**
2. Click: **Create new release**
3. Upload: `app-release.aab`
4. Add **Release notes** (What's new)
5. Review and **Roll out to Production**

---

## 🔒 Security Checklist

✅ Add to `.gitignore`:
```
android/key.properties
android/app/upload-keystore.jks
android/app/upload_certificate.pem
*.jks
*.keystore
```

✅ **Backup your keystore file securely** (USB drive, password manager, cloud backup)

✅ **Never share** keystore password publicly

---

## 🆘 Troubleshooting

### Error: "Upload key certificate doesn't match"

**Solution:** You need to register the new upload key (Step 7)

### Error: "Version code already exists"

**Solution:** Increase `versionCode` in build.gradle

### Error: "Package name mismatch"

**Solution:** Verify `applicationId` is exactly `com.rbsacademy.app`

### Error: "Signing key not configured"

**Solution:** Check `android/key.properties` file exists and paths are correct

---

## 📞 Need Help?

If you get stuck at any step, you can:
1. Check Play Console Help Center
2. Contact Google Play Support (from Play Console)
3. Check build logs: `android/app/build/outputs/logs/`

---

## 🎯 Quick Commands Summary

```bash
# 1. Generate keystore
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# 2. Build web assets
cd ../..
npm run build
npx cap sync android

# 3. Build AAB
cd android
./gradlew bundleRelease

# 4. Extract certificate (for first time upload key registration)
cd app
keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem
```

---

**Good Luck! 🚀**
