/* sync.js — synchronisation automatique vers le serveur central */
(function (root) {
  'use strict';

  var SYNC_STORE = 'sync_queue';
  var SYNC_META = 'sync_meta';

  /** Initialise le stockage de la file d'attente dans IndexedDB */
  function ouvrirSync() {
    return new Promise(function (resoudre, rejeter) {
      var req = indexedDB.open('recensement-wanianga-sync', 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(SYNC_STORE)) {
          db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SYNC_META)) {
          db.createObjectStore(SYNC_META, { keyPath: 'cle' });
        }
      };
      req.onsuccess = function (e) { resoudre(e.target.result); };
      req.onerror = function () { rejeter(req.error); };
    });
  }

  function tx(store, mode) {
    return ouvrirSync().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }

  function prom(requete) {
    return new Promise(function (res, rej) {
      requete.onsuccess = function () { res(requete.result); };
      requete.onerror = function () { rej(requete.error); };
    });
  }

  var SyncDB = {
    ajouter: function (menageId, code) {
      return tx(SYNC_STORE, 'readwrite').then(function (s) {
        return prom(s.put({ menageId: menageId, code: code, tente_le: Date.now(), statut: 'en_attente' }));
      });
    },
    suivants: function (limite) {
      return tx(SYNC_STORE, 'readonly').then(function (s) {
        return prom(s.getAll());
      }).then(function (liste) {
        return liste.filter(function (e) { return e.statut === 'en_attente' || e.statut === 'echec'; })
          .slice(0, limite || 50);
      });
    },
    marquerEnvoye: function (id) {
      return tx(SYNC_STORE, 'readwrite').then(function (s) {
        var req = s.get(id);
        return prom(req).then(function (e) {
          if (e) { e.statut = 'envoye'; e.envoye_le = Date.now(); s.put(e); }
        });
      });
    },
    marquerEchec: function (id) {
      return tx(SYNC_STORE, 'readwrite').then(function (s) {
        var req = s.get(id);
        return prom(req).then(function (e) {
          if (e) { e.statut = 'echec'; e.tentatives = (e.tentatives || 0) + 1; s.put(e); }
        });
      });
    },
    purgerEnvoyes: function () {
      return tx(SYNC_STORE, 'readwrite').then(function (s) { return prom(s.clear()); });
    },
    compter: function () {
      return tx(SYNC_STORE, 'readonly').then(function (s) { return prom(s.count()); });
    },
    lireParam: function (cle, defaut) {
      return tx(SYNC_META, 'readonly').then(function (s) { return prom(s.get(cle)); })
        .then(function (r) { return r ? r.valeur : defaut; });
    },
    ecrireParam: function (cle, valeur) {
      return tx(SYNC_META, 'readwrite').then(function (s) {
        return prom(s.put({ cle: cle, valeur: valeur }));
      });
    }
  };

  /**
   * Synchroniseur : envoie les ménages en attente vers le serveur central.
   * Paramètres configurables :
   *   - serveur_url : URL de base du serveur (ex. https://recensement.wanianga.cd)
   *   - jeton_api : jeton Bearer de l'agent
   *   - auto : true pour synchroniser automatiquement quand le réseau est dispo
   *   - intervalle_ms : délai entre les tentatives auto (défaut 60 000 = 1 min)
   */
  var Synchroniseur = {
    _timer: null,
    _enCours: false,

    configurer: function (params) {
      return Promise.all([
        SyncDB.ecrireParam('serveur_url', params.serveur_url || ''),
        SyncDB.ecrireParam('jeton_api', params.jeton_api || ''),
        SyncDB.ecrireParam('auto', params.auto !== false),
        SyncDB.ecrireParam('intervalle_ms', params.intervalle_ms || 60000)
      ]);
    },

    lireConfig: function () {
      return Promise.all([
        SyncDB.lireParam('serveur_url', ''),
        SyncDB.lireParam('jeton_api', ''),
        SyncDB.lireParam('auto', true),
        SyncDB.lireParam('intervalle_ms', 60000)
      ]).then(function (v) {
        return { serveur_url: v[0], jeton_api: v[1], auto: v[2], intervalle_ms: v[3] };
      });
    },

    demarrerAuto: function () {
      this.arreterAuto();
      var self = this;
      function cycle() {
        self.lireConfig().then(function (cfg) {
          if (!cfg.auto || !cfg.serveur_url || !cfg.jeton_api) { return; }
          if (navigator.onLine) { self.envoyer(); }
          self._timer = setTimeout(cycle, cfg.intervalle_ms || 60000);
        });
      }
      cycle();
    },

    arreterAuto: function () {
      clearTimeout(this._timer);
      this._timer = null;
    },

    envoyer: function () {
      if (this._enCours) { return Promise.resolve(); }
      this._enCours = true;
      var self = this;
      var cfg, file, menages;

      return this.lireConfig().then(function (c) {
        cfg = c;
        if (!cfg.serveur_url || !cfg.jeton_api) {
          self._enCours = false;
          return { ok: false, erreur: 'Serveur ou jeton non configuré.' };
        }
        return SyncDB.suivants(50);
      }).then(function (f) {
        if (arguments.length > 1) { return arguments[1]; } // cas config manquante
        file = f;
        if (!file.length) { self._enCours = false; return { ok: true, envoyes: 0, message: 'Rien à synchroniser.' }; }
        // Charger les ménages depuis la base principale
        return root.DB.tous();
      }).then(function (liste) {
        if (!liste) { self._enCours = false; return { ok: true, envoyes: 0, message: 'Rien à synchroniser.' }; }
        menages = liste;
        // Filtrer les ménages concernés par la file d'attente
        var aEnvoyer = [];
        var idsFile = {};
        file.forEach(function (e) { idsFile[e.menageId] = e; });
        menages.forEach(function (m) {
          if (idsFile[m.id]) { aEnvoyer.push(m); }
        });
        // Ajouter aussi les ménages sans id dans la file (nouveaux)
        if (!aEnvoyer.length) {
          // Envoyer tous les ménages jamais synchronisés (pas de date sync)
          aEnvoyer = menages.filter(function (m) { return !m.synchro_le; });
        }
        if (!aEnvoyer.length) { self._enCours = false; return { ok: true, envoyes: 0, message: 'Tous les ménages sont déjà synchronisés.' }; }

        // Préparer le paquet : convertir les images en base64
        var paquet = { menages: aEnvoyer.map(function (m) {
          var copie = JSON.parse(JSON.stringify(m));
          delete copie.id; // le serveur utilise le code comme clé
          return copie;
        })};

        var url = cfg.serveur_url.replace(/\/+$/, '') + '/?page=api/synchroniser';
        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cfg.jeton_api
          },
          body: JSON.stringify(paquet)
        });
      }).then(function (reponse) {
        if (!reponse || !reponse.json) { self._enCours = false; return { ok: false, erreur: 'Échec réseau.' }; }
        return reponse.json().then(function (data) {
          if (data.ok) {
            // Marquer les ménages synchronisés localement
            menages.forEach(function (m) {
              if (m.synchro_le) { return; }
              m.synchro_le = new Date().toISOString();
              root.DB.enregistrer(m);
            });
            SyncDB.purgerEnvoyes();
          }
          self._enCours = false;
          return data;
        });
      }).catch(function (e) {
        self._enCours = false;
        return { ok: false, erreur: 'Erreur réseau : ' + (e.message || e) };
      });
    },

    /** Enregistre un ménage dans la file d'attente de synchronisation. */
    planifier: function (menageId, code) {
      return SyncDB.ajouter(menageId, code);
    },

    /** Nombre de fiches en attente de synchronisation. */
    enAttente: function () {
      return SyncDB.compter();
    }
  };

  root.SyncDB = SyncDB;
  root.Synchroniseur = Synchroniseur;
}(typeof self !== 'undefined' ? self : this));
