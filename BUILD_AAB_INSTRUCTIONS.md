# 🚀 RBS Academy - AAB Build करने के Instructions

## ✅ Setup Complete!

Maine automatically yeh changes kar diye hain:
- ✅ `versionCode` 13 → 14 update kiya
- ✅ `versionName` "1.13" → "1.14" update kiya  
- ✅ Signing configuration add kiya
- ✅ Security ke liye `.gitignore` update kiya

---

## 🔑 Step 1: Upload Keystore Generate Karo

**Terminal mein yeh commands run karo:**

```bash
cd android/app

keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**Yeh questions puchega - Answers:**

```
Enter keystore password: RBSAcademy@2024
Re-enter new password: RBSAcademy@2024
What is your first and last name?: [Apna naam]
What is the name of your organizational unit?: RBS Academy
What is the name of your organization?: RBS Academy
What is the name of your City or Locality?: [Aapka city]
What is the name of your State or Province?: [Aapka state]
What is the two-letter country code?: IN
Is CN=..., correct?: yes
```

**✅ File ban jayegi:** `android/app/upload-keystore.jks`

---

## 🔧 Step 2: key.properties File Banao

**File create karo:** `android/key.properties`

**Content (apne password daalo):**

```properties
storePassword=RBSAcademy@2024
keyPassword=RBSAcademy@2024
keyAlias=upload
storeFile=app/upload-keystore.jks
```

**⚠️ IMPORTANT:** Yeh file Git mein commit NAHI honi chahiye (already .gitignore mein add hai)

---

## 📦 Step 3: Web Assets Build Karo

```bash
npm run build
npx cap sync android
```

---

## 🏗️ Step 4: AAB File Build Karo

### Option A: Gradle Command (Recommended)

```bash
cd android
gradlew bundleRelease
```

Ya Windows mein:

```cmd
cd android
gradlew.bat bundleRelease
```

### Option B: Android Studio Se

1. Android Studio open karo
2. `android` folder open karo
3. **Build → Generate Signed Bundle / APK**
4. **Android App Bundle** select karo
5. Keystore select karo: `android/app/upload-keystore.jks`
6. Password daalo: `RBSAcademy@2024`
7. Alias: `upload`
8. **release** build variant select karo
9. **Finish**

---

## 📍 Output Location

AAB file yahaan banega:

```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🎯 Step 5: Upload Certificate Extract Karo (Pehli Baar Only)

Agar yeh **pehli baar** aap apna khud ka signing key use kar rahe ho:

```bash
cd android/app
keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem
```

Password enter karo: `RBSAcademy@2024`

---

## 📤 Step 6: Play Console Mein Upload Karo

### A. Pehli Baar New Key Register Karo

1. **Play Console** open karo
2. **Setup → App signing** pe jao
3. Check karo: "App signing by Google Play is enabled" ✅
4. Agar **Upload key certificate** section mein koi existing key nahi hai, to:
   - **Upload new certificate** click karo
   - `upload_certificate.pem` file upload karo
   - Confirm karo

### B. AAB Upload Karo

1. **Production** section pe jao
2. **Create new release** click karo
3. **Upload** pe click karke `app-release.aab` select karo
4. **Release notes** likho (Hindi/English):

```
🎉 What's New in Version 1.14:
- Improved performance and stability
- Bug fixes and optimizations
- Enhanced user experience
```

5. **Review** karo
6. **Roll out to Production** click karo

---

## ✅ Verification Checklist

Before uploading:

- [ ] Version code increased (13 → 14) ✅
- [ ] Package name same hai (`com.rbsacademy.app`) ✅
- [ ] Keystore file generated ✅
- [ ] key.properties configured ✅
- [ ] Web assets built (`npm run build`) ✅
- [ ] AAB file generated successfully ✅
- [ ] Upload certificate extracted (first time) ✅

---

## 🆘 Common Errors & Solutions

### Error: `keytool: command not found`

**Solution:** Java JDK install karo ya path set karo:

```bash
# Check Java
java -version

# Set JAVA_HOME (Windows)
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%PATH%;%JAVA_HOME%\bin
```

### Error: `Keystore file does not exist`

**Solution:** Path check karo `key.properties` mein:

```properties
storeFile=app/upload-keystore.jks
```

### Error: `Task 'bundleRelease' not found`

**Solution:** Android folder mein ho:

```bash
cd android
./gradlew bundleRelease
```

### Error: Version code already exists

**Solution:** Play Console mein dekho latest version kya hai, usse zyada dalo

---

## 🔒 Security Tips

1. **Keystore file backup karo** - USB drive, encrypted cloud
2. **Password share mat karo** - password manager mein save karo
3. **Git mein keystore commit mat karo** - already .gitignore mein hai ✅
4. **Production credentials separate rakho**

---

## 📞 Need Help?

Agar koi step mein problem aaye to mujhe batao:
1. Exact error message
2. Konsi step pe stuck ho
3. Screenshot (agar possible ho)

**All the best! 🚀**

---

## Quick Commands Summary

```bash
# 1. Generate keystore
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# 2. Create key.properties in android/ folder with your passwords

# 3. Build web + sync
npm run build
npx cap sync android

# 4. Build AAB
cd android
gradlew bundleRelease

# 5. Extract certificate (first time only)
cd app
keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem

# 6. Find AAB at: android/app/build/outputs/bundle/release/app-release.aab
```
