import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('[configure-android] Configuring Android project...');

// 1. Configure AndroidManifest.xml
const manifestPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let content = fs.readFileSync(manifestPath, 'utf8');

  const permissions = [
    '    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
    '    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
    '    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
    '    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
    '    <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />',
    '    <uses-permission android:name="moe.shizuku.manager.permission.API_V23" />'
  ].join('\n');

  if (!content.includes('READ_MEDIA_VIDEO')) {
    content = content.replace('<application', `${permissions}\n    <application android:requestLegacyExternalStorage="true"`);
    fs.writeFileSync(manifestPath, content, 'utf8');
    console.log('[configure-android] Injected Android permissions & legacy storage flag into AndroidManifest.xml');
  }
} else {
  console.warn('[configure-android] AndroidManifest.xml not found at:', manifestPath);
}

// 2. Configure android/app/build.gradle to exclude duplicate kotlin-stdlib-jdk7/8
const appGradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
if (fs.existsSync(appGradlePath)) {
  const gradleSnippet = `
configurations.all {
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
}
`;
  let gradleContent = fs.readFileSync(appGradlePath, 'utf8');
  if (!gradleContent.includes("module: 'kotlin-stdlib-jdk7'")) {
    gradleContent += gradleSnippet;
    fs.writeFileSync(appGradlePath, gradleContent, 'utf8');
    console.log('[configure-android] Added kotlin-stdlib-jdk7/8 exclusion to android/app/build.gradle');
  }
}

// 3. Configure ~/.gradle/init.gradle to ensure duplicate classes are excluded globally
const gradleHome = path.join(os.homedir(), '.gradle');
if (!fs.existsSync(gradleHome)) {
  fs.mkdirSync(gradleHome, { recursive: true });
}
const initGradlePath = path.join(gradleHome, 'init.gradle');
const initGradleContent = `
allprojects {
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
`;
fs.writeFileSync(initGradlePath, initGradleContent, 'utf8');
console.log('[configure-android] Created ~/.gradle/init.gradle');

console.log('[configure-android] Android configuration complete!');
