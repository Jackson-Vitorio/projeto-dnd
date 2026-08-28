#!/bin/bash
# Build APK projeto-dnd via Capacitor + Gradle
set -e
cd "$(dirname "$0")"

PROJECT_DIR="5etools-src-translation-main"
ANDROID_SDK="${ANDROID_HOME:-/home/jack/Android/Sdk}"

echo "========================================="
echo " projeto-dnd APK Builder"
echo "========================================="
echo ""

if [ ! -d "$ANDROID_SDK" ]; then
    echo "ERRO: Android SDK nao encontrado em: $ANDROID_SDK"
    echo "Defina ANDROID_HOME ou instale o SDK."
    exit 1
fi
echo "Android SDK: $ANDROID_SDK"

echo ""
echo "Gerando android-nav.js (bundled)..."
cd "$PROJECT_DIR"
node node/build-android-nav.mjs prod
cd ..
rm -rf web/
mkdir -p web

rsync -a \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='web' \
    --exclude='android' \
    --exclude='.github' \
    --exclude='test' \
    --exclude='scss' \
    --exclude='*.zip' \
    --exclude='NOTES_*' \
    --exclude='CONTRIBUTING.md' \
    --exclude='ISSUE_TEMPLATE.md' \
    --exclude='.dockerignore' \
    --exclude='Dockerfile' \
    --exclude='.editorconfig' \
    --exclude='.eslintignore' \
    --exclude='.eslintrc.cjs' \
    --exclude='.gitattributes' \
    --exclude='.gitignore' \
    --exclude='.node-version' \
    --exclude='.prettierrc.js' \
    --exclude='.stylelintrc.json' \
    --exclude='cspell.json' \
    --exclude='jsconfig.json' \
    --exclude='LICENSE.md' \
    --exclude='README.md' \
    --exclude='jest.config.json' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='spellcheck' \
    --exclude='.temp' \
    ./ web/

echo "Assets copiados ($(du -sh web/ | cut -f1))"

echo ""
echo "Sincronizando Capacitor..."
CAP_BIN="$PROJECT_DIR/node_modules/.bin/capacitor"
CAP_PATH="$(pwd)/$CAP_BIN"
if [ -x "$CAP_PATH" ]; then
  cd "$PROJECT_DIR"
  "$CAP_PATH" sync android 2>/dev/null || "$CAP_PATH" copy android
  cd ..
else
  echo "ERRO: capacitor bin nao encontrado em $CAP_PATH"
  exit 1
fi
echo "Capacitor sincronizado"

JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk}"

if [ ! -x "$JAVA_HOME/bin/java" ]; then
    echo "ERRO: JAVA_HOME invalido ou java nao encontrado em $JAVA_HOME"
    exit 1
fi
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
echo "Java: $JAVA_HOME"
java -version 2>&1 | head -1

echo ""
echo "Executando build Gradle (release)..."
cd "$PROJECT_DIR/android"
JAVA_HOME="$JAVA_HOME" ANDROID_HOME="$ANDROID_SDK" ANDROID_SDK_ROOT="$ANDROID_SDK" \
    ./gradlew assembleRelease --no-daemon

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    cp "$APK_PATH" ../../projeto-dnd.apk
    echo ""
    echo "========================================="
    echo "BUILD SUCESSO!"
    echo "APK: ../../projeto-dnd.apk"
    echo "Tamanho: $APK_SIZE"
    echo "========================================="
else
    echo "Falha ao gerar APK"
    exit 1
fi
