# Recensement de la population — Secteur des Wanianga

Application mobile **hors-ligne** de collecte des données de recensement pour le Secteur des Wanianga (Territoire de Walikale, Province du Nord-Kivu, RDC).

Techniquement, il s'agit d'une **PWA** (application web progressive) : elle s'installe sur le téléphone comme une application Android/iOS, fonctionne **sans internet et sans serveur**, et stocke les données dans le téléphone de l'agent recenseur.

## Fonctionnalités

- **Fiche ménage complète** : groupement (les 10 groupements du secteur sont pré-chargés), localité, village, chef de ménage, statut de résidence (résident / déplacé / retourné / rapatrié), activité principale.
- **Conditions de vie** : type d'habitation, statut d'occupation, nombre de pièces, source d'eau, source d'énergie, latrine, moustiquaires.
- **Membres du ménage** (illimités) : nom, sexe, date de naissance ou âge, lien de parenté, état civil, niveau d'instruction, scolarisation, alphabétisation, profession, handicap, carte d'électeur.
- **Code ménage automatique** : `WNG-<groupement>-<numéro>` (ex. `WNG-IHA-0001`).
- **Coordonnées GPS** capturées d'un seul geste (fonctionne sans réseau).
- **Contrôles de saisie** : champs obligatoires et cohérence âge / date de naissance.
- **Recherche et filtre** par nom, code, localité, groupement ; modification et suppression des fiches.
- **Statistiques instantanées** : population totale, répartition par sexe, pyramide des âges, taille moyenne des ménages, ménages dirigés par une femme, taux de scolarisation (6-17 ans), niveau d'instruction, accès à l'eau et à l'énergie, par groupement.
- **Exports** : CSV des ménages, CSV des personnes (exploitables dans Excel), sauvegarde JSON complète.
- **Fusion des données** : le bureau du Secteur importe les sauvegardes JSON des différents agents pour consolider le recensement.

## Installation sur le téléphone

1. Placer le dossier sur un hébergement HTTPS (GitHub Pages, Netlify, Firebase Hosting, ou un serveur du secteur). L'installation PWA exige HTTPS.
2. Ouvrir l'adresse dans **Chrome** (Android) ou **Safari** (iPhone).
3. Menu ⋮ → **Ajouter à l'écran d'accueil** / **Installer l'application**.
4. Couper les données : l'application continue de fonctionner, la saisie reste possible en forêt comme en brousse.

### Test en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 depuis le navigateur
```

### Version APK (facultatif)

Pour obtenir un vrai fichier `.apk` distribuable hors Play Store, passer le site par **PWABuilder** (pwabuilder.com) ou l'encapsuler avec **Capacitor** :

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Recensement WNG" cd.wanianga.recensement --web-dir .
npx cap add android && npx cap open android   # puis Build > APK dans Android Studio
```

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 5 écrans (Accueil, Ménages, Saisie, Statistiques, Données) |
| `css/styles.css` | Interface mobile, ergonomie à une main |
| `js/core.js` | Logique métier : nomenclatures, validation, calcul des âges, statistiques, export CSV |
| `js/db.js` | Stockage local IndexedDB (ménages, paramètres, compteur de codes) |
| `js/ui.js` | Génération des formulaires et des graphiques |
| `js/app.js` | Navigation, enregistrement, recherche, exports, GPS |
| `sw.js` | Service worker : mise en cache pour le fonctionnement hors-ligne |
| `manifest.webmanifest` | Paramètres d'installation (nom, icônes, couleurs) |

## Protection des données

Les données sont **nominatives** : elles ne quittent jamais le téléphone tant que l'agent n'exporte pas de fichier. Recommandations d'usage :

- verrouiller le téléphone par code PIN ou empreinte ;
- exporter une sauvegarde JSON chaque soir et la remettre au superviseur ;
- ne partager les exports que par canal contrôlé (clé USB remise en main propre, messagerie du secteur) ;
- supprimer les données locales du téléphone après validation de la consolidation.

## Évolutions possibles

- Synchronisation automatique vers un serveur central (API + authentification des agents) lorsqu'un réseau est disponible.
- Photo de la parcelle et signature du chef de ménage.
- Carte des ménages géolocalisés (fonds de carte hors-ligne).
- Tableau de bord de supervision par groupement et par agent.
