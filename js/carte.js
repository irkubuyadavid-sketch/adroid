/* carte.js — carte des ménages géolocalisés (SVG maison, aucun CDN, fonds de carte hors-ligne) */
(function (root) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /**
   * Coordonnées de référence pour le Secteur des Wanianga.
   * Centre approximatif : -1.5° lat, 28.2° lon (Territoire de Walikale).
   * Les fonds de carte sont intégrés en SVG inline (pas de tuiles réseau).
   */
  var REF = {
    centreLat: -1.5,
    centreLon: 28.2,
    plageLat: 0.6,  // ±0.3 degré
    plageLon: 0.6,
    largeur: 600,
    hauteur: 500
  };

  function el(nom, attrs) {
    var n = document.createElementNS(NS, nom);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    return n;
  }

  /**
   * Convertit latitude/longitude en coordonnées SVG.
   */
  function projeter(lat, lon) {
    var x = ((lon - REF.centreLon + REF.plageLon / 2) / REF.plageLon) * REF.largeur;
    var y = ((REF.centreLat + REF.plageLat / 2 - lat) / REF.plageLat) * REF.hauteur;
    return { x: Math.max(10, Math.min(REF.largeur - 10, x)), y: Math.max(10, Math.min(REF.hauteur - 10, y)) };
  }

  /**
   * Dessine un fond de carte simplifié (frontières groupements + cours d'eau principaux).
   * Les données sont encodées en dur pour fonctionnement hors-ligne total.
   */
  function dessinerFond(svg) {
    // Zone verte de fond (forêt)
    svg.appendChild(el('rect', { x: 0, y: 0, width: REF.largeur, height: REF.hauteur, fill: '#e6f2ea', rx: 12 }));

    // Grille de coordonnées
    var pas = 0.1;
    for (var lat = REF.centreLat - REF.plageLat / 2; lat <= REF.centreLat + REF.plageLat / 2; lat += pas) {
      var p1 = projeter(lat, REF.centreLon - REF.plageLon / 2);
      var p2 = projeter(lat, REF.centreLon + REF.plageLon / 2);
      svg.appendChild(el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#c8dbc5', 'stroke-width': 0.5 }));
    }
    for (var lon = REF.centreLon - REF.plageLon / 2; lon <= REF.centreLon + REF.plageLon / 2; lon += pas) {
      var p3 = projeter(REF.centreLat - REF.plageLat / 2, lon);
      var p4 = projeter(REF.centreLat + REF.plageLat / 2, lon);
      svg.appendChild(el('line', { x1: p3.x, y1: p3.y, x2: p4.x, y2: p4.y, stroke: '#c8dbc5', 'stroke-width': 0.5 }));
    }

    // Labels des axes
    svg.appendChild(el('text', { x: REF.largeur - 5, y: REF.hauteur - 5, 'font-size': '9', fill: '#999', 'text-anchor': 'end' })).textContent = 'Lon ' + REF.centreLon.toFixed(1) + '°';
    svg.appendChild(el('text', { x: 5, y: 12, 'font-size': '9', fill: '#999' })).textContent = 'Lat ' + REF.centreLat.toFixed(1) + '°';

    // Contour du Secteur (simplifié)
    var contour = [
      [-1.2, 27.9], [-1.35, 28.0], [-1.5, 27.9], [-1.7, 28.0],
      [-1.8, 28.15], [-1.75, 28.35], [-1.6, 28.5], [-1.45, 28.45],
      [-1.3, 28.5], [-1.15, 28.35], [-1.2, 28.1], [-1.2, 27.9]
    ];
    var points = contour.map(function (c) {
      var p = projeter(c[0], c[1]);
      return p.x + ',' + p.y;
    }).join(' ');
    svg.appendChild(el('polygon', { points: points, fill: 'none', stroke: '#0b6b3a', 'stroke-width': 2, 'stroke-dasharray': '6 3' }));

    // Cours d'eau principal (Lowa / Walikale river - simplifié)
    var riviere = [
      [-1.3, 28.0], [-1.35, 28.1], [-1.4, 28.2], [-1.5, 28.25],
      [-1.6, 28.3], [-1.7, 28.35]
    ];
    var rivPts = riviere.map(function (c) {
      var p = projeter(c[0], c[1]);
      return p.x + ',' + p.y;
    }).join(' ');
    svg.appendChild(el('polyline', { points: rivPts, fill: 'none', stroke: '#5ba3cf', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
  }

  /**
   * Place les ménages géolocalisés sur la carte.
   */
  function placerMenages(svg, menages, onClic) {
    var couleurs = {
      'IKOBO': '#dc2626', 'IHANA': '#2563eb', 'KISIMBA': '#f59e0b', 'LUBERIKI': '#7c3aed',
      'WASSA': '#0f766e', 'WALOWA-LOANDA': '#db2777', 'WALOWA-YUNGU': '#65a30d',
      'WALOWA-UROBA': '#b45309', 'WALOALUANDA': '#0891b2', 'LUSALA': '#475569'
    };

    menages.forEach(function (m) {
      if (!m.latitude || !m.longitude) { return; }
      var lat = parseFloat(m.latitude);
      var lon = parseFloat(m.longitude);
      if (isNaN(lat) || isNaN(lon)) { return; }
      var p = projeter(lat, lon);
      var couleur = couleurs[m.groupement] || '#0b6b3a';

      var g = el('g', { class: 'point-menage', 'data-id': m.id, 'data-code': m.code || '' });

      // Ombre
      g.appendChild(el('circle', { cx: p.x + 1, cy: p.y + 1, r: 7, fill: 'rgba(0,0,0,0.15)' }));
      // Point
      g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 6, fill: couleur, stroke: '#fff', 'stroke-width': 1.5 }));

      // Infobulle au survol
      var titre = el('title', {});
      titre.textContent = (m.code || '') + ' — ' + (m.chef_nom || '') + ' (' + (m.groupement || '') + ')';
      g.appendChild(titre);

      if (onClic) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', function () { onClic(m); });
      }

      svg.appendChild(g);
    });
  }

  /**
   * Rend la carte dans un conteneur HTML.
   */
  function rendre(conteneur, menages, options) {
    var opts = options || {};
    conteneur.textContent = '';

    var svg = el('svg', {
      viewBox: '0 0 ' + REF.largeur + ' ' + REF.hauteur,
      class: 'carte-svg',
      role: 'img',
      preserveAspectRatio: 'xMidYMid meet'
    });

    dessinerFond(svg);
    placerMenages(svg, menages, opts.onClic);

    conteneur.appendChild(svg);

    // Légende des groupements
    var legende = document.createElement('div');
    legende.className = 'carte-legende';
    var couleurs = {
      'IKOBO': '#dc2626', 'IHANA': '#2563eb', 'KISIMBA': '#f59e0b', 'LUBERIKI': '#7c3aed',
      'WASSA': '#0f766e', 'WALOWA-LOANDA': '#db2777', 'WALOWA-YUNGU': '#65a30d',
      'WALOWA-UROBA': '#b45309', 'WALOALUANDA': '#0891b2', 'LUSALA': '#475569'
    };
    Object.keys(couleurs).forEach(function (g) {
      var span = document.createElement('span');
      span.className = 'carte-legende-item';
      var puce = document.createElement('i');
      puce.style.background = couleurs[g];
      puce.className = 'puce';
      span.appendChild(puce);
      span.appendChild(document.createTextNode(g));
      legende.appendChild(span);
    });
    conteneur.appendChild(legende);

    // Compteur
    var geoloc = menages.filter(function (m) { return m.latitude && m.longitude; }).length;
    var info = document.createElement('p');
    info.className = 'info';
    info.textContent = geoloc + ' ménage(s) géolocalisé(s) sur ' + menages.length + ' — Cliquez sur un point pour ouvrir la fiche.';
    conteneur.appendChild(info);
  }

  root.Carte = { rendre: rendre, projeter: projeter, REF: REF };
}(typeof self !== 'undefined' ? self : this));
