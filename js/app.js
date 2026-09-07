/* app.js — navigation, saisie, statistiques, export, photo, signature, carte, supervision, synchronisation */
(function () {
  'use strict';
  var C = self.Core, DB = self.DB, UI = self.UI;
  var Photo = self.Photo, Signature = self.Signature, Carte = self.Carte, Supervision = self.Supervision, Synchroniseur = self.Synchroniseur;
  var el = UI.el;
  var etat = { menageCourant: null, membres: [], parametres: {}, signatureObj: null, photoCourante: null };

  function q(id) { return document.getElementById(id); }

  function notifier(message) {
    var n = q('notification');
    n.textContent = message;
    n.classList.remove('cachee');
    clearTimeout(notifier.t);
    notifier.t = setTimeout(function () { n.classList.add('cachee'); }, 2600);
  }

  var VUES = ['accueil', 'liste', 'fiche', 'stats', 'carte', 'supervision', 'sync', 'donnees'];

  function afficherVue(nom) {
    VUES.forEach(function (v) {
      q('vue-' + v).classList.toggle('cachee', v !== nom);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.onglet'), function (b) {
      b.classList.toggle('actif', b.dataset.vue === nom);
    });
    window.scrollTo(0, 0);
    if (nom === 'accueil') { rendreAccueil(); }
    if (nom === 'liste') { rendreListe(); }
    if (nom === 'stats') { rendreStats(); }
    if (nom === 'carte') { rendreCarte(); }
    if (nom === 'supervision') { rendreSupervision(); }
    if (nom === 'sync') { rendreSync(); }
    if (nom === 'fiche' && !etat.menageCourant) { nouvelleFiche(); }
  }

  /* ---------- Fiche ménage ---------- */

  function ajouterMembre(donnees) {
    var index = etat.membres.length;
    etat.membres.push(donnees || {});
    var bloc = el('div', 'membre');
    bloc.dataset.index = String(index);
    var entete = el('div', 'membre-entete');
    entete.appendChild(el('strong', null, 'Membre ' + (index + 1)));
    var supprimer = el('button', 'bouton fantome mini', 'Retirer');
    supprimer.type = 'button';
    supprimer.addEventListener('click', function () {
      bloc.remove();
      etat.membres[index] = null;
      majCompteurMembres();
    });
    entete.appendChild(supprimer);
    bloc.appendChild(entete);
    var champs = el('div');
    UI.groupe(champs, UI.DEFS.membre, donnees || {});
    bloc.appendChild(champs);
    q('liste-membres').appendChild(bloc);
    majCompteurMembres();
  }

  function majCompteurMembres() {
    q('nb-membres').textContent = String(q('liste-membres').querySelectorAll('.membre').length);
  }

  function collecterFiche() {
    var m = etat.menageCourant || {};
    ['champs-localisation', 'champs-menage', 'champs-habitat', 'champs-agent'].forEach(function (id) {
      UI.lireGroupe(q(id), m);
    });
    m.membres = [];
    Array.prototype.forEach.call(q('liste-membres').querySelectorAll('.membre'), function (bloc) {
      m.membres.push(UI.lireGroupe(bloc, {}));
    });
    // Photo de la parcelle
    if (etat.photoCourante && etat.photoCourante.base64) {
      m.photo_parcelle = etat.photoCourante.base64;
    }
    // Signature du chef de ménage
    if (etat.signatureObj && !etat.signatureObj.estVide()) {
      m.signature = etat.signatureObj.obtenirBase64();
    }
    return m;
  }

  function nouvelleFiche() {
    etat.menageCourant = {
      groupement: etat.parametres.groupement_defaut || '',
      agent: etat.parametres.agent_defaut || '',
      date_recensement: new Date().toISOString().slice(0, 10)
    };
    etat.membres = [];
    etat.photoCourante = null;
    q('titre-fiche').textContent = 'Nouvelle fiche de ménage';
    q('affiche-code').textContent = 'Code attribué à l\u2019enregistrement';
    q('info-gps').textContent = '';
    q('zone-erreurs').classList.add('cachee');
    remplirFiche(etat.menageCourant);
    initialiserPhoto();
    initialiserSignature();
    ajouterMembre({ lien: 'Chef de ménage' });
  }

  function remplirFiche(m) {
    UI.groupe(q('champs-localisation'), UI.DEFS.localisation, m);
    UI.groupe(q('champs-menage'), UI.DEFS.menage, m);
    UI.groupe(q('champs-habitat'), UI.DEFS.habitat, m);
    UI.groupe(q('champs-agent'), UI.DEFS.agent, m);
    q('liste-membres').textContent = '';
    majCompteurMembres();
  }

  function ouvrirFiche(id) {
    DB.lire(id).then(function (m) {
      if (!m) { return; }
      etat.menageCourant = m;
      q('titre-fiche').textContent = 'Modifier la fiche';
      q('affiche-code').textContent = m.code || '';
      q('info-gps').textContent = m.latitude ? 'GPS : ' + m.latitude + ', ' + m.longitude : '';
      q('zone-erreurs').classList.add('cachee');
      remplirFiche(m);
      // Charger photo existante
      if (m.photo_parcelle) {
        etat.photoCourante = { base64: m.photo_parcelle };
        Photo.afficherVignette(q('zone-photo'), m.photo_parcelle, function () {
          etat.photoCourante = null;
          Photo.afficherVignette(q('zone-photo'), null);
        });
      } else {
        initialiserPhoto();
      }
      // Charger signature existante
      initialiserSignature();
      if (m.signature) {
        etat.signatureObj.charger(m.signature);
      }
      (m.membres || []).forEach(function (p) { ajouterMembre(p); });
      afficherVue('fiche');
    });
  }

  function initialiserPhoto() {
    q('zone-photo').textContent = '';
    Photo.afficherVignette(q('zone-photo'), null);
  }

  function capturerPhoto() {
    Photo.capturer({ qualite: 0.7, largeurMax: 1280 }).then(function (resultat) {
      if (!resultat) { return; }
      etat.photoCourante = resultat;
      Photo.afficherVignette(q('zone-photo'), resultat.base64, function () {
        etat.photoCourante = null;
        Photo.afficherVignette(q('zone-photo'), null);
        notifier('Photo supprimée');
      });
      notifier('Photo capturée ✔');
    });
  }

  function initialiserSignature() {
    q('zone-signature').textContent = '';
    etat.signatureObj = Signature.creer(q('zone-signature'), { hauteur: 120 });
  }

  function afficherErreurs(liste) {
    var zone = q('zone-erreurs');
    zone.textContent = '';
    zone.appendChild(el('strong', null, 'Corrigez les points suivants :'));
    var ul = el('ul');
    liste.forEach(function (e) { ul.appendChild(el('li', null, e)); });
    zone.appendChild(ul);
    zone.classList.remove('cachee');
    zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function enregistrerFiche(evt) {
    evt.preventDefault();
    var m = collecterFiche();
    var erreurs = C.validerMenage(m);
    if (erreurs.length) { afficherErreurs(erreurs); return; }
    q('zone-erreurs').classList.add('cachee');
    var prealable = m.code ? Promise.resolve(m.code)
      : DB.prochaineSequence().then(function (n) { return C.genererCode(m.groupement, n); });
    prealable.then(function (code) {
      m.code = code;
      return DB.enregistrer(m);
    }).then(function (resultat) {
      // Planifier la synchronisation
      var id = resultat && resultat.id ? resultat.id : (etat.menageCourant && etat.menageCourant.id);
      Synchroniseur.planifier(id, m.code);
      notifier('Ménage ' + m.code + ' enregistré ✔');
      etat.menageCourant = null;
      afficherVue('accueil');
    }).catch(function (e) { notifier('Erreur d\u2019enregistrement : ' + e); });
  }

  /* ---------- Listes ---------- */

  function elementMenage(m) {
    var bloc = el('div', 'element');
    var synchro = m.synchro_le ? ' ☁' : ' 📱';
    bloc.appendChild(el('div', 'titre', (m.chef_nom || '(sans nom)') + synchro));
    var meta = [m.code, m.groupement, m.localite, (m.membres || []).length + ' personne(s)']
      .filter(Boolean).join(' • ');
    bloc.appendChild(el('div', 'meta', meta));
    if (m.photo_parcelle) {
      var badge = el('span', 'puce', '📷');
      bloc.appendChild(badge);
    }
    var boutons = el('div', 'boutons');
    var modifier = el('button', 'bouton secondaire mini', 'Ouvrir');
    modifier.type = 'button';
    modifier.addEventListener('click', function () { ouvrirFiche(m.id); });
    var supprimer = el('button', 'bouton fantome mini', 'Supprimer');
    supprimer.type = 'button';
    supprimer.addEventListener('click', function () {
      if (!window.confirm('Supprimer le ménage ' + (m.code || '') + ' ?')) { return; }
      DB.supprimer(m.id).then(function () { notifier('Ménage supprimé'); rendreListe(); rendreAccueil(); });
    });
    boutons.appendChild(modifier);
    boutons.appendChild(supprimer);
    bloc.appendChild(boutons);
    return bloc;
  }

  function rendreAccueil() {
    DB.tous().then(function (liste) {
      var st = C.calculerStatistiques(liste);
      var resume = q('resume-accueil');
      resume.textContent = '';
      resume.appendChild(UI.carte(st.menages, 'Ménages recensés'));
      resume.appendChild(UI.carte(st.personnes, 'Personnes'));
      resume.appendChild(UI.carte(st.taille_moyenne, 'Taille moyenne'));
      resume.appendChild(UI.carte(Object.keys(st.par_groupement).filter(function (g) { return g !== 'Non renseigné'; }).length, 'Groupements couverts'));

      // Info synchronisation sur l'accueil
      var syncInfo = q('sync-accueil-info');
      syncInfo.textContent = '';
      Synchroniseur.lireConfig().then(function (cfg) {
        if (cfg.serveur_url && cfg.jeton_api) {
          Synchroniseur.enAttente().then(function (n) {
            if (n > 0) {
              var p = el('p', 'info', n + ' fiche(s) en attente de synchronisation');
              syncInfo.appendChild(p);
            }
          });
        }
      });

      var derniers = q('derniers-menages');
      derniers.textContent = '';
      if (!liste.length) {
        derniers.appendChild(el('p', 'vide', 'Aucun ménage enregistré. Commencez par une nouvelle fiche.'));
        return;
      }
      liste.slice(0, 5).forEach(function (m) { derniers.appendChild(elementMenage(m)); });
    });
  }

  function rendreListe() {
    DB.tous().then(function (liste) {
      var terme = q('recherche').value.trim().toLowerCase();
      var g = q('filtre-groupement').value;
      var filtree = liste.filter(function (m) {
        var texte = [m.code, m.chef_nom, m.localite, m.village].join(' ').toLowerCase();
        return (!terme || texte.indexOf(terme) !== -1) && (!g || m.groupement === g);
      });
      q('compteur-liste').textContent = filtree.length + ' ménage(s) • ' +
        filtree.reduce(function (t, m) { return t + (m.membres || []).length; }, 0) + ' personne(s)';
      var c = q('liste-menages');
      c.textContent = '';
      if (!filtree.length) {
        c.appendChild(el('p', 'vide', 'Aucun résultat.'));
        return;
      }
      filtree.forEach(function (m) { c.appendChild(elementMenage(m)); });
    });
  }

  function rendreStats() {
    DB.tous().then(function (liste) {
      var st = C.calculerStatistiques(liste);
      var cles = q('stats-cles');
      cles.textContent = '';
      cles.appendChild(UI.carte(st.personnes, 'Population totale'));
      cles.appendChild(UI.carte(st.hommes, 'Hommes'));
      cles.appendChild(UI.carte(st.femmes, 'Femmes'));
      cles.appendChild(UI.carte(st.ratio_masculinite, 'Hommes pour 100 femmes'));
      cles.appendChild(UI.carte(st.taille_moyenne, 'Personnes par ménage'));
      cles.appendChild(UI.carte(st.chefs_femmes, 'Ménages dirigés par une femme'));
      cles.appendChild(UI.carte(st.taux_scolarisation + ' %', 'Scolarisation (6-17 ans)'));
      cles.appendChild(UI.carte(st.handicap, 'Personnes en situation de handicap'));
      var g = q('stats-graphiques');
      g.textContent = '';
      g.appendChild(UI.pyramide(st.par_sexe_tranche));
      g.appendChild(UI.barres('Ménages par groupement', st.par_groupement));
      g.appendChild(UI.barres('Population par tranche d\u2019âge', st.par_tranche));
      g.appendChild(UI.barres('Niveau d\u2019instruction', st.par_instruction));
      g.appendChild(UI.barres('Activité principale des ménages', st.par_activite));
      g.appendChild(UI.barres('Source d\u2019eau de boisson', st.par_eau));
      g.appendChild(UI.barres('Source d\u2019énergie', st.par_energie));
      g.appendChild(UI.barres('Statut de résidence', st.par_residence));
    });
  }

  /* ---------- Carte géolocalisée ---------- */

  function rendreCarte() {
    DB.tous().then(function (liste) {
      Carte.rendre(q('carte-container'), liste, {
        onClic: function (m) { ouvrirFiche(m.id); }
      });
    });
  }

  /* ---------- Supervision ---------- */

  function rendreSupervision() {
    DB.tous().then(function (liste) {
      Supervision.rendre(q('supervision-container'), liste, etat.parametres);
    });
  }

  /* ---------- Synchronisation ---------- */

  var DEFS_SYNC = [
    { nom: 'serveur_url', libelle: 'URL du serveur', placeholder: 'https://recensement.wanianga.cd', requis: true },
    { nom: 'jeton_api', libelle: 'Jeton de l\'agent (API)', placeholder: 'Colllez le jeton fourni par le superviseur', requis: true },
    { nom: 'auto', libelle: 'Synchronisation automatique', type: 'checkbox' },
    { nom: 'intervalle_ms', libelle: 'Intervalle (secondes)', type: 'number', min: 30, max: 3600, placeholder: '60' }
  ];

  function rendreSync() {
    Synchroniseur.lireConfig().then(function (cfg) {
      // Ajuster l'intervalle pour affichage en secondes
      var cfgAffichage = {
        serveur_url: cfg.serveur_url,
        jeton_api: cfg.jeton_api,
        auto: cfg.auto,
        intervalle_ms: cfg.intervalle_ms ? Math.round(cfg.intervalle_ms / 1000) : 60
      };
      UI.groupe(q('champs-sync-config'), DEFS_SYNC, cfgAffichage);
      Synchroniseur.enAttente().then(function (n) {
        q('info-sync-attente').textContent = n + ' fiche(s) en attente d\'envoi.';
      });
      DB.lireParam('derniere_sync', '').then(function (d) {
        q('info-sync-derniere').textContent = d ? 'Dernière synchronisation : ' + new Date(d).toLocaleString('fr-FR') : 'Aucune synchronisation effectuée.';
      });
      q('info-sync-resultat').textContent = '';
    });
  }

  function sauverConfigSync() {
    var p = UI.lireGroupe(q('champs-sync-config'), {});
    Synchroniseur.configurer({
      serveur_url: p.serveur_url || '',
      jeton_api: p.jeton_api || '',
      auto: p.auto !== false,
      intervalle_ms: (parseInt(p.intervalle_ms, 10) || 60) * 1000
    }).then(function () {
      Synchroniseur.demarrerAuto();
      notifier('Configuration de synchronisation enregistrée ✔');
    });
  }

  function synchroniserManuel() {
    q('info-sync-resultat').textContent = 'Envoi en cours…';
    Synchroniseur.envoyer().then(function (resultat) {
      if (resultat.ok) {
        var msg = resultat.envoyes !== undefined
          ? resultat.envoyes + ' ménage(s) envoyé(s) ✔'
          : (resultat.message || 'Synchronisation terminée ✔');
        q('info-sync-resultat').textContent = msg;
        DB.ecrireParam('derniere_sync', Date.now());
        q('info-sync-derniere').textContent = 'Dernière synchronisation : ' + new Date().toLocaleString('fr-FR');
        notifier(msg);
      } else {
        q('info-sync-resultat').textContent = 'Échec : ' + (resultat.erreur || 'erreur inconnue');
        notifier('Échec de synchronisation');
      }
      Synchroniseur.enAttente().then(function (n) {
        q('info-sync-attente').textContent = n + ' fiche(s) en attente d\'envoi.';
      });
    });
  }

  /* ---------- Export / import ---------- */

  function telecharger(nom, contenu, type) {
    var blob = new Blob(['\ufeff' + contenu], { type: type + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function horodatage() {
    return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  }

  function exporter(genre) {
    DB.tous().then(function (liste) {
      if (!liste.length) { notifier('Aucune donnée à exporter'); return; }
      if (genre === 'menages') {
        telecharger('menages-wanianga-' + horodatage() + '.csv', C.menagesVersCSV(liste), 'text/csv');
      } else if (genre === 'personnes') {
        telecharger('personnes-wanianga-' + horodatage() + '.csv', C.personnesVersCSV(liste), 'text/csv');
      } else {
        var paquet = { application: 'recensement-wanianga', version: 2, exporte_le: new Date().toISOString(), menages: liste };
        telecharger('sauvegarde-wanianga-' + horodatage() + '.json', JSON.stringify(paquet, null, 2), 'application/json');
      }
      notifier('Export généré ✔');
    });
  }

  function importerFichier(fichier) {
    var lecteur = new FileReader();
    lecteur.onload = function () {
      try {
        var paquet = JSON.parse(String(lecteur.result).replace(/^\ufeff/, ''));
        var liste = Array.isArray(paquet) ? paquet : paquet.menages;
        if (!Array.isArray(liste)) { throw new Error('format inattendu'); }
        DB.importer(liste, false).then(function (n) {
          q('info-import').textContent = n + ' ménage(s) importé(s) et fusionné(s).';
          notifier(n + ' ménage(s) importé(s)');
          rendreAccueil();
        });
      } catch (e) {
        q('info-import').textContent = 'Fichier illisible : ' + e.message;
      }
    };
    lecteur.readAsText(fichier);
  }

  /* ---------- Paramètres, réseau, démarrage ---------- */

  function chargerParametres() {
    return Promise.all([
      DB.lireParam('agent_defaut', ''),
      DB.lireParam('groupement_defaut', '')
    ]).then(function (v) {
      etat.parametres = { agent_defaut: v[0], groupement_defaut: v[1] };
      UI.groupe(q('champs-parametres'), UI.DEFS.parametres, etat.parametres);
    });
  }

  function majEtatReseau() {
    var b = q('etat-reseau');
    var enLigne = navigator.onLine;
    b.textContent = enLigne ? 'en ligne' : 'hors-ligne';
    b.classList.toggle('en-ligne', enLigne);
    // Déclencher la synchronisation automatique quand le réseau revient
    if (enLigne) {
      Synchroniseur.lireConfig().then(function (cfg) {
        if (cfg.auto && cfg.serveur_url && cfg.jeton_api) {
          Synchroniseur.envoyer();
        }
      });
    }
  }

  function capturerGPS() {
    if (!navigator.geolocation) { q('info-gps').textContent = 'GPS non disponible sur cet appareil.'; return; }
    q('info-gps').textContent = 'Recherche du signal GPS…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude.toFixed(6), lon = pos.coords.longitude.toFixed(6);
      etat.menageCourant.latitude = lat;
      etat.menageCourant.longitude = lon;
      q('info-gps').textContent = 'GPS : ' + lat + ', ' + lon + ' (précision ±' + Math.round(pos.coords.accuracy) + ' m)';
    }, function () {
      q('info-gps').textContent = 'Position indisponible — activez la localisation.';
    }, { enableHighAccuracy: true, timeout: 15000 });
  }

  function initialiser() {
    var filtre = q('filtre-groupement');
    var tous = el('option', null, 'Tous les groupements');
    tous.value = '';
    filtre.appendChild(tous);
    C.GROUPEMENTS.forEach(function (g) {
      var o = el('option', null, g);
      o.value = g;
      filtre.appendChild(o);
    });

    Array.prototype.forEach.call(document.querySelectorAll('.onglet'), function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.vue === 'fiche') { nouvelleFiche(); }
        afficherVue(b.dataset.vue);
      });
    });
    q('btn-nouveau').addEventListener('click', function () { nouvelleFiche(); afficherVue('fiche'); });
    q('btn-ajouter-membre').addEventListener('click', function () { ajouterMembre({}); });
    q('btn-gps').addEventListener('click', capturerGPS);
    q('btn-photo').addEventListener('click', capturerPhoto);
    q('btn-annuler').addEventListener('click', function () { etat.menageCourant = null; afficherVue('accueil'); });
    q('formulaire-menage').addEventListener('submit', enregistrerFiche);
    q('recherche').addEventListener('input', rendreListe);
    q('filtre-groupement').addEventListener('change', rendreListe);
    q('btn-export-menages').addEventListener('click', function () { exporter('menages'); });
    q('btn-export-personnes').addEventListener('click', function () { exporter('personnes'); });
    q('btn-export-json').addEventListener('click', function () { exporter('json'); });
    q('fichier-import').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) { importerFichier(e.target.files[0]); }
    });
    q('btn-enregistrer-parametres').addEventListener('click', function () {
      var p = UI.lireGroupe(q('champs-parametres'), {});
      Promise.all([
        DB.ecrireParam('agent_defaut', p.agent_defaut),
        DB.ecrireParam('groupement_defaut', p.groupement_defaut)
      ]).then(function () {
        etat.parametres = p;
        notifier('Paramètres enregistrés ✔');
      });
    });
    q('btn-vider').addEventListener('click', function () {
      if (!window.confirm('Cette action supprime définitivement toutes les fiches de cet appareil. Avez-vous exporté une sauvegarde ?')) { return; }
      DB.viderTout().then(function () { notifier('Données locales supprimées'); rendreAccueil(); rendreListe(); });
    });

    // Synchronisation
    q('btn-sauver-config-sync').addEventListener('click', sauverConfigSync);
    q('btn-sync-manuel').addEventListener('click', synchroniserManuel);

    window.addEventListener('online', majEtatReseau);
    window.addEventListener('offline', majEtatReseau);
    majEtatReseau();

    chargerParametres().then(function () { afficherVue('accueil'); });

    // Démarrer la synchronisation automatique si configurée
    Synchroniseur.lireConfig().then(function (cfg) {
      if (cfg.auto && cfg.serveur_url && cfg.jeton_api) {
        Synchroniseur.demarrerAuto();
      }
    });

    if ('serviceWorker' in navigator && navigator.serviceWorker) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* fonctionnement dégradé sans cache */ });
    }
  }

  document.addEventListener('DOMContentLoaded', initialiser);
}());
