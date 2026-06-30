# 🔑 Manual Keystore Setup Guide

## ⚠️ Java/Keytool Not Found Issue

Aapke system mein Java installed nahi hai, isliye keystore generate nahi ho paa raha.

---

## ✅ Solution: Install Java JDK

### Option 1: Download & Install Java

**Download Link:** https://www.oracle.com/java/technologies/downloads/#jdk17-windows

**Steps:**
1. Download: **Windows x64 Installer** (jdk-17_windows-x64_bin.exe)
2. Install karo (double click)
3. Installation complete hone ka wait karo
4. Command Prompt **restart** karo

---

### Option 2: Check Android Studio Java

Agar Android Studio installed hai:

**Java Location:**
```
C:\Program Files\Android\Android Studio\jbr\bin
```

**Set Path Temporarily:**

Command Prompt mein run karo:
```cmd
set PATH=%PATH%;C:\Program Files\Android\Android Studio\jbr\bin
```

Phir keystore command run karo:
```cmd
cd "c:\Users\Sachin\Desktop\Task\Rbs Aacdemy\rbs-academy current\android\app"

keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload -storepass "RBSAcademy@2024" -keypass "RBSAcademy@2024" -dname "CN=RBS Academy, OU=RBS Academy, O=RBS Academy, L=India, ST=India, C=IN"
```

---

## 🔧 After Java Installation: Complete Steps

### Step 1: Generate Keystore

```cmd
cd "c:\Users\Sachin\Desktop\Task\Rbs Aacdemy\rbs-academy current\android\app"

keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**Answers:**
- Password: `RBSAcademy@2024`
- Re-enter: `RBSAcademy@2024`
- First and last name: [Your name]
- Organizational unit: `RBS Academy`
- Organization: `RBS Academy`
- City: [Your city]
- State: [Your state]
- Country: `IN`
- Correct?: `yes`

---

### Step 2: Create key.properties

File: `android/key.properties`

```properties
storePassword=RBSAcademy@2024
keyPassword=RBSAcademy@2024
keyAlias=upload
storeFile=app/upload-keystore.jks
```

---

### Step 3: Build AAB

```cmd
cd "c:\Users\Sachin\Desktop\Task\Rbs Aacdemy\rbs-academy current\android"

gradlew.bat bundleRelease
```

---

### Step 4: Find AAB File

Location:
```
android\app\build\outputs\bundle\release\app-release.aab
```

---

## 🚀 Alternative: Use Android Studio

### Method 1: Generate Signed Bundle via Android Studio

1. **Open Android Studio**
2. **Open project:** `android` folder
3. **Build menu** → **Generate Signed Bundle / APK**
4. Select: **Android App Bundle**
5. **Create new keystore:**
   - Key store path: `android/app/upload-keystore.jks`
   - Password: `RBSAcademy@2024`
   - Alias: `upload`
   - Key password: `RBSAcademy@2024`
   - Validity: 10000 days
   - Certificate:
     - First and Last Name: [Your name]
     - Organizational Unit: RBS Academy
     - Organization: RBS Academy
     - City/Locality: [Your city]
     - State/Province: [Your state]
     - Country Code: IN
6. **Next** → Select **release** → **Finish**

**Output:** AAB file ready! ✅

---

## 📱 Temporary Solution: Debug Build (NOT for Play Store)

Agar sirf testing ke liye chahiye:

```cmd
cd android
gradlew.bat assembleDebug
```

**Output:** `app-debug.apk` (Play Store pe upload NAHI ho sakta)

---

## 💡 Recommended: Install Java First

**Best solution:** Java install karo, phir keystore banao, phir AAB build karo.

**Fastest way:** Android Studio use karo (GUI-based signing)

---

**Questions? Let me know!** 🚀
