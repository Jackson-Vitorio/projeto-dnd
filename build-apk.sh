#!/bin/bash
# Build APK 5eTools via Capacitor + Gradle
set -e
cd "$(dirname "$0")"

PROJECT_DIR="5etools-src-translation-main"
ANDROID_SDK="${ANDROID_HOME:-/home/jack/Android/Sdk}"

echo "========================================="
echo " 5eTools APK Builder"
echo "========================================="
echo ""

if [ ! -d "$ANDROID_SDK" ]; then
    echo "ERRO: Android SDK nao encontrado em: $ANDROID_SDK"
    echo "Defina ANDROID_HOME ou instale o SDK."
    exit 1
fi
echo "Android SDK: $ANDROID_SDK"

echo ""
echo "Copiando assets web..."
cd "$PROJECT_DIR"
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
npx cap sync android 2>/dev/null || npx cap copy android
echo "Capacitor sincronizado"

echo ""
echo "Executando build Gradle (release)..."
cd android
ANDROID_HOME="$ANDROID_SDK" ANDROID_SDK_ROOT="$ANDROID_SDK" \
    ./gradlew assembleRelease --no-daemon

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    cp "$APK_PATH" ../../5etools-app.apk
    echo ""
    echo "========================================="
    echo "BUILD SUCESSO!"
    echo "APK: ../../5etools-app.apk"
    echo "Tamanho: $APK_SIZE"
    echo "========================================="
else
    echo "Falha ao gerar APK"
    exit 1
fi
