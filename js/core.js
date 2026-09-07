/* core.js — logique métier pure (testable hors navigateur) */
(function (root) {
  'use strict';

  var GROUPEMENTS = [
    'IKOBO', 'IHANA', 'KISIMBA', 'LUBERIKI', 'WASSA',
    'WALOWA-LOANDA', 'WALOWA-YUNGU', 'WALOWA-UROBA',
    'WALOALUANDA', 'LUSALA'
  ];

  var LISTES = {
    habitat: ['Dur (briques cuites/ciment)', 'Semi-dur', 'Pisé / terre battue', 'Paille / feuilles', 'Autre'],
    occupation_logement: ['Propriétaire', 'Locataire', 'Hébergé gratuitement', 'Autre'],
    eau: ['Robinet / réseau', 'Source aménagée', 'Forage / pompe', 'Puits', 'Rivière / ruisseau', 'Eau de pluie'],
    energie: ['Réseau (SNEL)', 'Solaire', 'Groupe électrogène', 'Micro-centrale', 'Aucune'],
    activite: ['Agriculture', 'Commerce', 'Mine artisanale', 'Élevage', 'Pêche', 'Artisanat', 'Fonctionnaire / salarié', 'Sans activité', 'Autre'],
    statut_residence: ['Résident', 'Déplacé interne', 'Retourné', 'Rapatrié'],
    lien: ['Chef de ménage', 'Époux / Épouse', 'Fils / Fille', 'Père / Mère', 'Frère / Sœur', 'Neveu / Nièce', 'Petit-fils / Petite-fille', 'Autre parent', 'Sans lien'],
    etat_civil: ['Célibataire', 'Marié(e)', 'Union libre', 'Veuf / Veuve', 'Divorcé(e) / Séparé(e)'],
    instruction: ['Aucun', 'Maternelle', 'Primaire', 'Secondaire', 'Supérieur / Universitaire', 'Formation professionnelle'],
    handicap: ['Aucun', 'Moteur', 'Visuel', 'Auditif', 'Mental', 'Autre']
  };

  var TRANCHES = [
    { cle: '0-4', min: 0, max: 4 },
    { cle: '5-14', min: 5, max: 14 },
    { cle: '15-24', min: 15, max: 24 },
    { cle: '25-59', min: 25, max: 59 },
    { cle: '60+', min: 60, max: 200 }
  ];

  function pad(n, l) {
    var s = String(n);
    while (s.length < l) { s = '0' + s; }
    return s;
  }

  /* Code ménage : WNG-<3 lettres groupement>-<numéro séquentiel sur 4> */
  function genererCode(groupement, sequence) {
    var g = String(groupement || 'XXX').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'XXX';
    return 'WNG-' + g + '-' + pad(sequence, 4);
  }

  function calculerAge(dateNaissance, aujourdhui) {
    if (!dateNaissance) { return null; }
    var d = new Date(dateNaissance);
    if (isNaN(d.getTime())) { return null; }
    var ref = aujourdhui ? new Date(aujourdhui) : new Date();
    var age = ref.getFullYear() - d.getFullYear();
    var m = ref.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) { age--; }
    return age < 0 ? null : age;
  }

  function ageMembre(membre, aujourdhui) {
    var a = calculerAge(membre.date_naissance, aujourdhui);
    if (a !== null) { return a; }
    var n = parseInt(membre.age, 10);
    return isNaN(n) ? null : n;
  }

  function trancheDe(age) {
    for (var i = 0; i < TRANCHES.length; i++) {
      if (age >= TRANCHES[i].min && age <= TRANCHES[i].max) { return TRANCHES[i].cle; }
    }
    return 'inconnu';
  }

  function validerMenage(m) {
    var erreurs = [];
    if (!m.groupement) { erreurs.push('Le groupement est obligatoire.'); }
    if (!m.localite) { erreurs.push('La localité est obligatoire.'); }
    if (!m.chef_nom) { erreurs.push('Le nom du chef de ménage est obligatoire.'); }
    if (!m.membres || !m.membres.length) { erreurs.push('Au moins un membre doit être enregistré.'); }
    (m.membres || []).forEach(function (p, i) {
      if (!p.nom) { erreurs.push('Membre ' + (i + 1) + ' : le nom est obligatoire.'); }
      if (p.sexe !== 'M' && p.sexe !== 'F') { erreurs.push('Membre ' + (i + 1) + ' : le sexe est obligatoire.'); }
      if (ageMembre(p) === null) { erreurs.push('Membre ' + (i + 1) + ' : indiquez la date de naissance ou l\u2019âge.'); }
    });
    return erreurs;
  }

  function compter(objet, cle) {
    var k = cle || 'Non renseigné';
    objet[k] = (objet[k] || 0) + 1;
  }

  function calculerStatistiques(menages, aujourdhui) {
    var st = {
      menages: menages.length,
      personnes: 0,
      hommes: 0,
      femmes: 0,
      taille_moyenne: 0,
      par_groupement: {},
      par_tranche: {},
      par_sexe_tranche: {},
      par_instruction: {},
      par_activite: {},
      par_residence: {},
      par_eau: {},
      par_energie: {},
      alphabetises: 0,
      scolarisables: 0,
      scolarises: 0,
      handicap: 0,
      chefs_femmes: 0
    };
    TRANCHES.forEach(function (t) {
      st.par_tranche[t.cle] = 0;
      st.par_sexe_tranche[t.cle] = { M: 0, F: 0 };
    });

    menages.forEach(function (m) {
      compter(st.par_groupement, m.groupement);
      compter(st.par_eau, m.eau);
      compter(st.par_energie, m.energie);
      compter(st.par_residence, m.statut_residence);
      compter(st.par_activite, m.activite_principale);
      var membres = m.membres || [];
      st.personnes += membres.length;
      var chef = membres.filter(function (p) { return p.lien === 'Chef de ménage'; })[0] || membres[0];
      if (chef && chef.sexe === 'F') { st.chefs_femmes++; }
      membres.forEach(function (p) {
        if (p.sexe === 'M') { st.hommes++; } else if (p.sexe === 'F') { st.femmes++; }
        var age = ageMembre(p, aujourdhui);
        if (age !== null) {
          var tr = trancheDe(age);
          if (st.par_tranche[tr] !== undefined) {
            st.par_tranche[tr]++;
            if (p.sexe === 'M' || p.sexe === 'F') { st.par_sexe_tranche[tr][p.sexe]++; }
          }
          if (age >= 6 && age <= 17) {
            st.scolarisables++;
            if (p.scolarise) { st.scolarises++; }
          }
          if (age >= 15 && p.alphabetise) { st.alphabetises++; }
        }
        compter(st.par_instruction, p.instruction);
        if (p.handicap && p.handicap !== 'Aucun') { st.handicap++; }
      });
    });

    st.taille_moyenne = st.menages ? Math.round((st.personnes / st.menages) * 100) / 100 : 0;
    st.ratio_masculinite = st.femmes ? Math.round((st.hommes / st.femmes) * 1000) / 10 : 0;
    st.taux_scolarisation = st.scolarisables ? Math.round((st.scolarises / st.scolarisables) * 1000) / 10 : 0;
    return st;
  }

  function champCSV(v) {
    if (v === null || v === undefined) { return '""'; }
    return '"' + String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
  }

  function ligneCSV(valeurs) {
    return valeurs.map(champCSV).join(';');
  }

  var COLS_MENAGE = ['code', 'groupement', 'localite', 'village', 'chef_nom', 'telephone', 'habitat',
    'occupation_logement', 'pieces', 'eau', 'energie', 'latrine', 'activite_principale',
    'statut_residence', 'latitude', 'longitude', 'agent', 'date_recensement', 'observations',
    'photo_parcelle', 'signature'];

  var COLS_MEMBRE = ['nom', 'sexe', 'date_naissance', 'age', 'lien', 'etat_civil', 'instruction',
    'scolarise', 'alphabetise', 'profession', 'handicap', 'carte_electeur', 'telephone'];

  function menagesVersCSV(menages) {
    var lignes = [ligneCSV(COLS_MENAGE.concat(['nombre_personnes']))];
    menages.forEach(function (m) {
      var v = COLS_MENAGE.map(function (c) {
        // Pour les champs base64 (photo/signature), indiquer leur présence plutôt que le contenu
        if ((c === 'photo_parcelle' || c === 'signature') && m[c]) {
          return '[base64:' + String(m[c]).length + ' octets]';
        }
        return m[c];
      });
      v.push((m.membres || []).length);
      lignes.push(ligneCSV(v));
    });
    return lignes.join('\n');
  }

  function personnesVersCSV(menages, aujourdhui) {
    var entete = ['code_menage', 'groupement', 'localite'].concat(COLS_MEMBRE, ['age_calcule']);
    var lignes = [ligneCSV(entete)];
    menages.forEach(function (m) {
      (m.membres || []).forEach(function (p) {
        var v = [m.code, m.groupement, m.localite].concat(
          COLS_MEMBRE.map(function (c) { return p[c]; }),
          [ageMembre(p, aujourdhui)]
        );
        lignes.push(ligneCSV(v));
      });
    });
    return lignes.join('\n');
  }

  var api = {
    GROUPEMENTS: GROUPEMENTS,
    LISTES: LISTES,
    TRANCHES: TRANCHES,
    genererCode: genererCode,
    calculerAge: calculerAge,
    ageMembre: ageMembre,
    trancheDe: trancheDe,
    validerMenage: validerMenage,
    calculerStatistiques: calculerStatistiques,
    menagesVersCSV: menagesVersCSV,
    personnesVersCSV: personnesVersCSV
  };

  root.Core = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
}(typeof self !== 'undefined' ? self : this));
