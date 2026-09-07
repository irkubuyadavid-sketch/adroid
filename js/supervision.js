/* supervision.js — tableau de bord de supervision par groupement et par agent */
(function (root) {
  'use strict';
  var C = root.Core;
  var el = root.UI.el;

  function rendre(conteneur, menages, parametresAgent) {
    conteneur.textContent = '';

    // En-tête
    conteneur.appendChild(el('h2', null, 'Supervision du recensement'));

    // --- KPI globaux ---
    var st = C.calculerStatistiques(menages);
    var kpi = el('div', 'cartes-cle');
    kpi.appendChild(UI.carte(st.menages, 'Ménages total'));
    kpi.appendChild(UI.carte(st.personnes, 'Population'));
    kpi.appendChild(UI.carte(st.chefs_femmes, 'Chefs femmes'));
    kpi.appendChild(UI.carte(st.handicap, 'Handicap'));
    kpi.appendChild(UI.carte(st.taux_scolarisation + ' %', 'Scolarisation'));
    conteneur.appendChild(kpi);

    // --- Tableau par groupement ---
    var sectionGrp = el('div', 'bloc-graphique');
    sectionGrp.appendChild(el('h3', null, 'Avancement par groupement'));
    var tableau = el('table', 'tableau-supervision');
    var thead = el('thead');
    var trH = el('tr');
    ['Groupement', 'Ménages', 'Personnes', 'H', 'F', 'Chefs femmes', 'Handicap', 'Scolarisé %'].forEach(function (t) {
      trH.appendChild(el('th', null, t));
    });
    thead.appendChild(trH);
    tableau.appendChild(thead);
    var tbody = el('tbody');

    // Calculer les stats par groupement
    C.GROUPEMENTS.forEach(function (g) {
      var mGrp = menages.filter(function (m) { return m.groupement === g; });
      if (!mGrp.length) { return; }
      var stGrp = C.calculerStatistiques(mGrp);
      var tr = el('tr');
      tr.appendChild(el('td', null, g));
      tr.appendChild(el('td', null, String(stGrp.menages)));
      tr.appendChild(el('td', null, String(stGrp.personnes)));
      tr.appendChild(el('td', null, String(stGrp.hommes)));
      tr.appendChild(el('td', null, String(stGrp.femmes)));
      tr.appendChild(el('td', null, String(stGrp.chefs_femmes)));
      tr.appendChild(el('td', null, String(stGrp.handicap)));
      tr.appendChild(el('td', null, stGrp.taux_scolarisation + ' %'));
      tbody.appendChild(tr);
    });
    tableau.appendChild(tbody);
    sectionGrp.appendChild(tableau);
    conteneur.appendChild(sectionGrp);

    // --- Tableau par agent ---
    var sectionAgent = el('div', 'bloc-graphique');
    sectionAgent.appendChild(el('h3', null, 'Production par agent recenseur'));
    var tabAgent = el('table', 'tableau-supervision');
    var theadA = el('thead');
    var trHA = el('tr');
    ['Agent', 'Ménages', 'Personnes', 'Dernier recensement'].forEach(function (t) {
      trHA.appendChild(el('th', null, t));
    });
    theadA.appendChild(trHA);
    tabAgent.appendChild(theadA);
    var tbodyA = el('tbody');

    // Grouper par agent
    var parAgent = {};
    menages.forEach(function (m) {
      var nom = m.agent || 'Non renseigné';
      if (!parAgent[nom]) { parAgent[nom] = { menages: 0, personnes: 0, dernier: '' }; }
      parAgent[nom].menages++;
      parAgent[nom].personnes += (m.membres || []).length;
      if (m.date_recensement > parAgent[nom].dernier) { parAgent[nom].dernier = m.date_recensement; }
    });

    Object.keys(parAgent).sort().forEach(function (nom) {
      var tr = el('tr');
      tr.appendChild(el('td', null, nom));
      tr.appendChild(el('td', null, String(parAgent[nom].menages)));
      tr.appendChild(el('td', null, String(parAgent[nom].personnes)));
      tr.appendChild(el('td', null, parAgent[nom].dernier || '—'));
      tbodyA.appendChild(tr);
    });
    tabAgent.appendChild(tbodyA);
    sectionAgent.appendChild(tabAgent);
    conteneur.appendChild(sectionAgent);

    // --- Barres groupements ---
    conteneur.appendChild(UI.barres('Répartition par groupement', st.par_groupement));
  }

  root.Supervision = { rendre: rendre };
}(typeof self !== 'undefined' ? self : this));
