# 📱 Compilation Android — Recensement Wanianga

Ce dossier contient le projet Android TWA (Trusted Web Activity) qui encapsule la PWA en APK.

## ⚠️ AVANT DE POUSSER SUR GITHUB

Vous devez remplacer **VOTRE-USER** par votre nom d'utilisateur GitHub dans ces fichiers :

```
android/app/src/main/AndroidManifest.xml     (2 endroits)
android/app/src/main/res/values/strings.xml   (1 endroit)
```

### Commande rapide (remplacez VOTRE-USER) :

```bash
cd android/
sed -i 's/VOTRE-USER/VOTRE-USER/g' app/src/main/AndroidManifest.xml
sed -i 's/VOTRE-USER/VOTRE-USER/g' app/src/main/res/values/strings.xml
```

## 🔧 Compilation automatique via GitHub Actions

1. Poussez ce dépôt sur GitHub
2. Allez dans l'onglet **Actions**
3. Le workflow "Compiler l'APK Android" se lance automatiquement
4. Quand il est terminé (✅), cliquez dessus
5. En bas → **Artifacts** → **Recensement-Wanianga-APK**
6. Téléchargez le fichier ZIP → il contient **app-debug.apk**

## 🔧 Compilation manuelle (si vous avez Android Studio)

1. Ouvrez Android Studio
2. File → Open → sélectionnez ce dossier `android/`
3. Attendez "Gradle sync finished"
4. Build → Build Bundle(s) / APK(s) → Build APK(s)
5. L'APK est dans : `app/build/outputs/apk/debug/app-debug.apk`

## 📦 Structure du projet

```
android/
├── app/
│   ├── build.gradle              ← Config Gradle du module app
│   ├── proguard-rules.pro        ← Règles ProGuard
│   └── src/main/
│       ├── AndroidManifest.xml   ← Permissions + activité TWA
│       ├── java/cd/wanianga/... ← LauncherActivity (TWA)
│       └── res/
│           ├── drawable/splash.xml
│           ├── mipmap-*/ic_launcher.png
│           ├── values/{colors,strings,styles}.xml
│           └── xml/network_config.xml
├── build.gradle                 ← Config Gradle racine
├── settings.gradle               ← Nom du projet
├── gradle.properties             ← Propriétés Gradle
└── gradle/wrapper/               ← Wrapper Gradle
```

## 🔄 Fonctionnement

L'APK est une **Trusted Web Activity** (TWA) :
- L'app ouvre la PWA en plein écran (pas de barre de navigateur)
- Si pas de connexion → le Service Worker de la PWA fonctionne en hors-ligne
- Les données sont stockées localement dans IndexedDB
- La synchronisation se fait automatiquement quand le réseau revient
