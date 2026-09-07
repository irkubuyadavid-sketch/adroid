/* ui.js — construction des écrans et des formulaires (sans HTML injecté) */
(function (root) {
  'use strict';
  var C = root.Core;

  function el(balise, classe, texte) {
    var n = document.createElement(balise);
    if (classe) { n.className = classe; }
    if (texte !== undefined && texte !== null) { n.textContent = String(texte); }
    return n;
  }

  function champ(parent, def, valeur) {
    var id = def.nom + '_' + Math.random().toString(36).slice(2, 7);
    var enveloppe = el('div');
    if (def.type === 'checkbox') {
      enveloppe.className = 'case';
      var c = el('input');
      c.type = 'checkbox';
      c.id = id;
      c.checked = !!valeur;
      c.dataset.nom = def.nom;
      var lab = el('label', null, def.libelle);
      lab.htmlFor = id;
      enveloppe.appendChild(c);
      enveloppe.appendChild(lab);
      parent.appendChild(enveloppe);
      return c;
    }
    var etiquette = el('label', 'etiquette', def.libelle + (def.requis ? ' *' : ''));
    etiquette.htmlFor = id;
    enveloppe.appendChild(etiquette);
    var entree;
    if (def.type === 'select') {
      entree = el('select');
      var vide = el('option', null, def.placeholder || '— choisir —');
      vide.value = '';
      entree.appendChild(vide);
      (def.options || []).forEach(function (o) {
        var opt = el('option', null, o);
        opt.value = o;
        entree.appendChild(opt);
      });
    } else if (def.type === 'textarea') {
      entree = el('textarea');
    } else {
      entree = el('input');
      entree.type = def.type || 'text';
      if (def.min !== undefined) { entree.min = def.min; }
      if (def.max !== undefined) { entree.max = def.max; }
      if (def.mode) { entree.inputMode = def.mode; }
    }
    entree.id = id;
    entree.dataset.nom = def.nom;
    if (valeur !== undefined && valeur !== null) { entree.value = valeur; }
    if (def.placeholder && def.type !== 'select') { entree.placeholder = def.placeholder; }
    enveloppe.appendChild(entree);
    parent.appendChild(enveloppe);
    return entree;
  }

  function groupe(parent, defs, donnees) {
    parent.textContent = '';
    defs.forEach(function (d) { champ(parent, d, (donnees || {})[d.nom]); });
  }

  function lireGroupe(conteneur, cible) {
    var noeuds = conteneur.querySelectorAll('[data-nom]');
    Array.prototype.forEach.call(noeuds, function (n) {
      if (n.type === 'checkbox') { cible[n.dataset.nom] = n.checked; } else { cible[n.dataset.nom] = n.value.trim ? n.value.trim() : n.value; }
    });
    return cible;
  }

  var DEFS = {
    localisation: [
      { nom: 'groupement', libelle: 'Groupement', type: 'select', options: C.GROUPEMENTS, requis: true },
      { nom: 'localite', libelle: 'Localité', requis: true, placeholder: 'Ex. Mutongo' },
      { nom: 'village', libelle: 'Village / avenue', placeholder: 'Ex. Kanune' }
    ],
    menage: [
      { nom: 'chef_nom', libelle: 'Nom complet du chef de ménage', requis: true },
      { nom: 'telephone', libelle: 'Téléphone', type: 'tel', mode: 'tel', placeholder: '+243…' },
      { nom: 'statut_residence', libelle: 'Statut de résidence', type: 'select', options: C.LISTES.statut_residence },
      { nom: 'activite_principale', libelle: 'Activité principale du ménage', type: 'select', options: C.LISTES.activite }
    ],
    habitat: [
      { nom: 'habitat', libelle: 'Type d\u2019habitation', type: 'select', options: C.LISTES.habitat },
      { nom: 'occupation_logement', libelle: 'Statut d\u2019occupation', type: 'select', options: C.LISTES.occupation_logement },
      { nom: 'pieces', libelle: 'Nombre de pièces', type: 'number', min: 1, mode: 'numeric' },
      { nom: 'eau', libelle: 'Source d\u2019eau de boisson', type: 'select', options: C.LISTES.eau },
      { nom: 'energie', libelle: 'Source d\u2019énergie électrique', type: 'select', options: C.LISTES.energie },
      { nom: 'latrine', libelle: 'Le ménage dispose d\u2019une latrine', type: 'checkbox' },
      { nom: 'moustiquaire', libelle: 'Le ménage dispose de moustiquaires', type: 'checkbox' }
    ],
    agent: [
      { nom: 'agent', libelle: 'Nom de l\u2019agent recenseur', requis: true },
      { nom: 'date_recensement', libelle: 'Date du recensement', type: 'date' },
      { nom: 'observations', libelle: 'Observations', type: 'textarea' }
    ],
    membre: [
      { nom: 'nom', libelle: 'Nom complet', requis: true },
      { nom: 'sexe', libelle: 'Sexe', type: 'select', options: ['M', 'F'], requis: true },
      { nom: 'date_naissance', libelle: 'Date de naissance', type: 'date' },
      { nom: 'age', libelle: 'Âge (si date inconnue)', type: 'number', min: 0, max: 120, mode: 'numeric' },
      { nom: 'lien', libelle: 'Lien avec le chef de ménage', type: 'select', options: C.LISTES.lien },
      { nom: 'etat_civil', libelle: 'État civil', type: 'select', options: C.LISTES.etat_civil },
      { nom: 'instruction', libelle: 'Niveau d\u2019instruction', type: 'select', options: C.LISTES.instruction },
      { nom: 'profession', libelle: 'Profession / occupation' },
      { nom: 'handicap', libelle: 'Handicap', type: 'select', options: C.LISTES.handicap },
      { nom: 'scolarise', libelle: 'Scolarisé cette année', type: 'checkbox' },
      { nom: 'alphabetise', libelle: 'Sait lire et écrire', type: 'checkbox' },
      { nom: 'carte_electeur', libelle: 'Possède une carte d\u2019électeur', type: 'checkbox' }
    ],
    parametres: [
      { nom: 'agent_defaut', libelle: 'Agent recenseur par défaut' },
      { nom: 'groupement_defaut', libelle: 'Groupement par défaut', type: 'select', options: C.GROUPEMENTS }
    ],
    photo: [
      { nom: 'photo_parcelle', libelle: 'Photo de la parcelle', type: 'file', accept: 'image/*' }
    ],
    signature: [
      { nom: 'signature', libelle: 'Signature du chef de ménage (tracer ci-dessous)' }
    ]
  };

  function carte(valeur, libelle) {
    var c = el('div', 'carte');
    c.appendChild(el('div', 'valeur', valeur));
    c.appendChild(el('div', 'libelle', libelle));
    return c;
  }

  function barres(titre, donnees) {
    var bloc = el('div', 'bloc-graphique');
    bloc.appendChild(el('h3', null, titre));
    var cles = Object.keys(donnees).filter(function (k) { return donnees[k] > 0; })
      .sort(function (a, b) { return donnees[b] - donnees[a]; });
    if (!cles.length) {
      bloc.appendChild(el('p', 'info', 'Aucune donnée.'));
      return bloc;
    }
    var max = Math.max.apply(null, cles.map(function (k) { return donnees[k]; }));
    cles.forEach(function (k) {
      var ligne = el('div', 'barre-ligne');
      var et = el('div', 'barre-etiquette');
      et.appendChild(el('span', null, k));
      et.appendChild(el('span', null, donnees[k]));
      var piste = el('div', 'barre-piste');
      var remplie = el('div', 'barre-remplie');
      remplie.style.width = Math.round((donnees[k] / max) * 100) + '%';
      piste.appendChild(remplie);
      ligne.appendChild(et);
      ligne.appendChild(piste);
      bloc.appendChild(ligne);
    });
    return bloc;
  }

  function pyramide(parSexeTranche) {
    var bloc = el('div', 'bloc-graphique');
    bloc.appendChild(el('h3', null, 'Pyramide des âges'));
    var cles = Object.keys(parSexeTranche);
    var max = 1;
    cles.forEach(function (k) {
      max = Math.max(max, parSexeTranche[k].M, parSexeTranche[k].F);
    });
    cles.slice().reverse().forEach(function (k) {
      var ligne = el('div', 'pyramide-ligne');
      var h = el('div', 'pyramide-h');
      h.style.width = Math.round((parSexeTranche[k].M / max) * 100) + '%';
      h.title = parSexeTranche[k].M + ' homme(s)';
      var f = el('div', 'pyramide-f');
      f.style.width = Math.round((parSexeTranche[k].F / max) * 100) + '%';
      f.title = parSexeTranche[k].F + ' femme(s)';
      ligne.appendChild(h);
      ligne.appendChild(el('div', 'pyramide-cle', k + ' ans'));
      ligne.appendChild(f);
      bloc.appendChild(ligne);
    });
    var legende = el('div', 'legende');
    ['Hommes', 'Femmes'].forEach(function (t, i) {
      var s = el('span');
      var puce = el('i');
      puce.style.background = i === 0 ? '#1d6fa5' : '#c2477f';
      s.appendChild(puce);
      s.appendChild(document.createTextNode(t));
      legende.appendChild(s);
    });
    bloc.appendChild(legende);
    return bloc;
  }

  root.UI = {
    el: el, champ: champ, groupe: groupe, lireGroupe: lireGroupe,
    DEFS: DEFS, carte: carte, barres: barres, pyramide: pyramide
  };
}(typeof self !== 'undefined' ? self : this));
