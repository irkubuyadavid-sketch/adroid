/* signature.js — signature numérique du chef de ménage (canvas tactile) */
(function (root) {
  'use strict';

  /**
   * Initialise un canvas de signature tactile.
   * @param {HTMLElement} conteneur - Élément où placer le canvas
   * @param {Object} options - { largeur, hauteur, couleur, epaisseur }
   * @returns {{ canvas, obtenirBase64, vider, estVide }}
   */
  function creer(conteneur, options) {
    var opts = options || {};
    var couleur = opts.couleur || '#1b1f23';
    var epaisseur = opts.epaisseur || 2.5;
    var fond = opts.fond || '#ffffff';

    var enveloppe = document.createElement('div');
    enveloppe.className = 'signature-zone';

    var etiquette = document.createElement('p');
    etiquette.className = 'info';
    etiquette.textContent = 'Le chef de ménage signe ci-dessous :';
    enveloppe.appendChild(etiquette);

    var canvas = document.createElement('canvas');
    canvas.className = 'signature-canvas';
    canvas.style.background = fond;
    canvas.style.borderRadius = '10px';
    canvas.style.border = '2px dashed #e2e5e9';
    canvas.style.touchAction = 'none';
    canvas.style.width = '100%';
    canvas.style.display = 'block';
    // Résolution adaptée
    var rect = conteneur.getBoundingClientRect();
    var largeur = Math.max(280, rect.width || opts.largeur || 320);
    var hauteur = opts.hauteur || 120;
    canvas.width = largeur * 2;
    canvas.height = hauteur * 2;
    canvas.style.height = hauteur + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = couleur;
    ctx.lineWidth = epaisseur;

    var dessin = false;
    var chemin = []; // pour vérifier si quelque chose a été dessiné

    function position(evenement) {
      var rect = canvas.getBoundingClientRect();
      var clientX, clientY;
      if (evenement.touches && evenement.touches.length) {
        clientX = evenement.touches[0].clientX;
        clientY = evenement.touches[0].clientY;
      } else {
        clientX = evenement.clientX;
        clientY = evenement.clientY;
      }
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function commencer(e) {
      e.preventDefault();
      dessin = true;
      var pos = position(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      chemin.push(pos);
    }

    function tracer(e) {
      if (!dessin) { return; }
      e.preventDefault();
      var pos = position(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      chemin.push(pos);
    }

    function terminer() {
      dessin = false;
    }

    canvas.addEventListener('mousedown', commencer);
    canvas.addEventListener('mousemove', tracer);
    canvas.addEventListener('mouseup', terminer);
    canvas.addEventListener('mouseleave', terminer);
    canvas.addEventListener('touchstart', commencer, { passive: false });
    canvas.addEventListener('touchmove', tracer, { passive: false });
    canvas.addEventListener('touchend', terminer);

    enveloppe.appendChild(canvas);

    var boutons = document.createElement('div');
    boutons.className = 'signature-boutons';
    var btnEffacer = document.createElement('button');
    btnEffacer.type = 'button';
    btnEffacer.className = 'bouton fantome mini';
    btnEffacer.textContent = 'Recommencer';
    btnEffacer.addEventListener('click', vider);
    boutons.appendChild(btnEffacer);
    enveloppe.appendChild(boutons);

    // Image existante (si édition)
    var imgExistante = null;

    conteneur.appendChild(enveloppe);

    function vider() {
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      chemin = [];
      imgExistante = null;
    }

    function estVide() {
      return chemin.length < 5; // au moins quelques points de tracé
    }

    function obtenirBase64() {
      if (estVide() && !imgExistante) { return null; }
      if (imgExistante) { return imgExistante; }
      return canvas.toDataURL('image/png');
    }

    function charger(base64) {
      if (!base64) { return; }
      imgExistante = base64;
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, largeur, hauteur);
        chemin = Array(10).fill({ x: 0, y: 0 }); // marquer comme non vide
      };
      img.src = base64;
    }

    return { canvas: canvas, obtenirBase64: obtenirBase64, vider: vider, estVide: estVide, charger: charger };
  }

  /** Affiche une signature existante en lecture seule. */
  function afficher(conteneur, base64) {
    conteneur.textContent = '';
    if (!base64) {
      var p = document.createElement('p');
      p.className = 'info';
      p.textContent = 'Aucune signature enregistrée.';
      conteneur.appendChild(p);
      return;
    }
    var img = document.createElement('img');
    img.src = base64;
    img.alt = 'Signature du chef de ménage';
    img.className = 'signature-apercu';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.border = '1px solid #e2e5e9';
    conteneur.appendChild(img);
  }

  root.Signature = { creer: creer, afficher: afficher };
}(typeof self !== 'undefined' ? self : this));
