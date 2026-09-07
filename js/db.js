/* db.js — stockage local hors-ligne (IndexedDB), avec support photo_parcelle + signature */
(function (root) {
  'use strict';

  var NOM_BASE = 'recensement-wanianga';
  var VERSION = 2;
  var STORE = 'menages';
  var META = 'meta';
  var base = null;

  function ouvrir() {
    if (base) { return Promise.resolve(base); }
    return new Promise(function (resoudre, rejeter) {
      var req = indexedDB.open(NOM_BASE, VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var s = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          s.createIndex('groupement', 'groupement', { unique: false });
          s.createIndex('code', 'code', { unique: false });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: 'cle' });
        }
        // Ajouter l'index 'synchro_statut' si le store existe déjà (migr v1→v2)
        if (db.objectStoreNames.contains(STORE)) {
          var store = e.target.transaction.objectStore(STORE);
          if (!store.indexNames.contains('synchro_statut')) {
            store.createIndex('synchro_statut', 'synchro_statut', { unique: false });
          }
        }
      };
      req.onsuccess = function (e) { base = e.target.result; resoudre(base); };
      req.onerror = function () { rejeter(req.error); };
    });
  }

  function transaction(store, mode) {
    return ouvrir().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }

  function promesse(requete) {
    return new Promise(function (resoudre, rejeter) {
      requete.onsuccess = function () { resoudre(requete.result); };
      requete.onerror = function () { rejeter(requete.error); };
    });
  }

  /* Enregistrer un ménage — les champs photo_parcelle et signature (base64) sont stockés tels quels */
  function enregistrerMenage(menage) {
    menage.maj = Date.now();
    if (!menage.cree) { menage.cree = menage.maj; }
    // Si le ménage vient d'être synchronisé, ne pas le remettre en attente
    if (!menage.synchro_statut) {
      menage.synchro_statut = 'attente';
    }
    return transaction(STORE, 'readwrite').then(function (s) { return promesse(s.put(menage)); });
  }

  /* Lire les ménages en attente de synchronisation */
  function menagesEnAttente() {
    return transaction(STORE, 'readonly').then(function (s) {
      return promesse(s.index('synchro_statut').getAll('attente'));
    });
  }

  /* Marquer un ménage comme synchronisé */
  function marquerSynchro(code) {
    return transaction(STORE, 'readonly').then(function (s) {
      return promesse(s.index('code').get(code));
    }).then(function (m) {
      if (!m) { return; }
      m.synchro_statut = 'synchro';
      m.synchro_le = new Date().toISOString();
      return transaction(STORE, 'readwrite').then(function (s) { return promesse(s.put(m)); });
    });
  }

  var DB = {
    tous: function () {
      return transaction(STORE, 'readonly').then(function (s) { return promesse(s.getAll()); })
        .then(function (liste) {
          liste.sort(function (a, b) { return (b.maj || 0) - (a.maj || 0); });
          return liste;
        });
    },
    lire: function (id) {
      return transaction(STORE, 'readonly').then(function (s) { return promesse(s.get(Number(id))); });
    },
    enregistrer: enregistrerMenage,
    supprimer: function (id) {
      return transaction(STORE, 'readwrite').then(function (s) { return promesse(s.delete(Number(id))); });
    },
    viderTout: function () {
      return transaction(STORE, 'readwrite').then(function (s) { return promesse(s.clear()); });
    },
    compter: function () {
      return transaction(STORE, 'readonly').then(function (s) { return promesse(s.count()); });
    },
    /* paramètres simples : nom de l'agent, groupement par défaut, compteur, config sync */
    lireParam: function (cle, defaut) {
      return transaction(META, 'readonly').then(function (s) { return promesse(s.get(cle)); })
        .then(function (r) { return r ? r.valeur : defaut; });
    },
    ecrireParam: function (cle, valeur) {
      return transaction(META, 'readwrite').then(function (s) {
        return promesse(s.put({ cle: cle, valeur: valeur }));
      });
    },
    prochaineSequence: function () {
      return DB.lireParam('sequence', 0).then(function (n) {
        var suivant = Number(n) + 1;
        return DB.ecrireParam('sequence', suivant).then(function () { return suivant; });
      });
    },
    importer: function (liste, remplacer) {
      var etape = remplacer ? DB.viderTout() : Promise.resolve();
      return etape.then(function () {
        return liste.reduce(function (chaine, m) {
          return chaine.then(function () {
            var copie = JSON.parse(JSON.stringify(m));
            delete copie.id;
            return enregistrerMenage(copie);
          });
        }, Promise.resolve());
      }).then(function () { return liste.length; });
    },
    /* Synchronisation : ménages en attente + marquage */
    menagesEnAttente: menagesEnAttente,
    marquerSynchro: marquerSynchro
  };

  root.DB = DB;
}(typeof self !== 'undefined' ? self : this));
