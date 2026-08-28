#!/bin/bash
# Build APK projeto-dnd via Capacitor + Gradle
#
# Uso:
#   ./build-apk.sh                          -> APK debug (assinado com debug.keystore, instalável)
#   BUILD_TYPE=release DND_STORE_PASS=senha ./build-apk.sh   -> APK release assinado
#   DND_KEYSTORE=/caminho/keystore DND_KEY_ALIAS=alias ...   -> opcional
set -e
cd "$(dirname "$0")"

PROJECT_DIR="5etools-src-translation-main"
ANDROID_SDK="${ANDROID_HOME:-/home/jack/Android/Sdk}"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"
BUILD_TYPE="${BUILD_TYPE:-debug}"
KEYSTORE="${DND_KEYSTORE:-$PWD/5etools-release.keystore}"

echo "========================================="
echo " projeto-dnd APK Builder (tipo: $BUILD_TYPE)"
echo "========================================="
echo ""

if [ ! -d "$ANDROID_SDK" ]; then
    echo "ERRO: Android SDK nao encontrado em: $ANDROID_SDK"
    echo "Defina ANDROID_HOME ou instale o SDK."
    exit 1
fi
if [ ! -x "$JAVA_HOME/bin/java" ]; then
    echo "ERRO: JAVA_HOME invalido ou java nao encontrado em $JAVA_HOME"
    exit 1
fi
echo "Android SDK: $ANDROID_SDK"
echo "Java: $JAVA_HOME"

echo ""
echo "Gerando android-nav.js (bundled)..."
cd "$PROJECT_DIR"
node node/build-android-nav.mjs prod

echo ""
echo "Copiando assets para web/ (dentro de $PROJECT_DIR)..."
# IMPORTANTE: permanecer dentro de PROJECT_DIR — o webDir do Capacitor é "web"
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
./node_modules/.bin/capacitor sync android

export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
java -version 2>&1 | head -1

cd android
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"

if [ "$BUILD_TYPE" = "release" ]; then
    if [ -z "$DND_STORE_PASS" ]; then
        echo "ERRO: DND_STORE_PASS nao definido (senha do keystore)."
        echo "Use: DND_STORE_PASS=senha BUILD_TYPE=release ./build-apk.sh"
        exit 1
    fi
    if [ ! -f "$KEYSTORE" ]; then
        echo "ERRO: keystore nao encontrado em: $KEYSTORE"
        exit 1
    fi
    echo ""
    echo "Executando build Gradle (release)..."
    ./gradlew assembleRelease --no-daemon
    UNSIGNED="app/build/outputs/apk/release/app-release-unsigned.apk"
    if [ ! -f "$UNSIGNED" ]; then
        echo "ERRO: APK unsigned nao encontrado: $UNSIGNED"
        exit 1
    fi
    BT="$ANDROID_SDK/build-tools/36.0.0"
    "$BT/zipalign" -f -p 4 "$UNSIGNED" app/build/outputs/apk/release/app-release-aligned.apk
    if [ -n "$DND_KEY_ALIAS" ]; then
        "$BT/apksigner" sign --ks "$KEYSTORE" --ks-pass "pass:$DND_STORE_PASS" \
            --ks-key-alias "$DND_KEY_ALIAS" \
            --out app/build/outputs/apk/release/app-release.apk \
            app/build/outputs/apk/release/app-release-aligned.apk
    else
        "$BT/apksigner" sign --ks "$KEYSTORE" --ks-pass "pass:$DND_STORE_PASS" \
            --out app/build/outputs/apk/release/app-release.apk \
            app/build/outputs/apk/release/app-release-aligned.apk
    fi
    "$BT/apksigner" verify app/build/outputs/apk/release/app-release.apk
    APK="app/build/outputs/apk/release/app-release.apk"
else
    echo ""
    echo "Executando build Gradle (debug)..."
    ./gradlew assembleDebug --no-daemon
    APK="app/build/outputs/apk/debug/app-debug.apk"
fi

if [ -f "$APK" ]; then
    APK_SIZE=$(du -h "$APK" | cut -f1)
    cp "$APK" "../../projeto-dnd.apk"
    echo ""
    echo "========================================="
    echo "BUILD SUCESSO!"
    echo "APK: $(cd ../.. && pwd)/projeto-dnd.apk"
    echo "Tamanho: $APK_SIZE"
    echo "========================================="
else
    echo "Falha ao gerar APK"
    exit 1
fi
