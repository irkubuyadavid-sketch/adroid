/* photo.js — capture de la photo de la parcelle */
(function (root) {
  'use strict';

  /**
   * Capture une photo depuis l'appareil photo ou la galerie.
   * Retourne une promesse résolue avec { base64, vignette } ou null si annulé.
   */
  function capturerPhoto(options) {
    var opts = options || {};
    var qualite = opts.qualite || 0.7;
    var largeurMax = opts.largeurMax || 1280;

    return new Promise(function (resoudre) {
      // Créer un input fichier invisible
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      // Sur mobile, capture='environment' ouvre l'appareil photo arrière
      if (opts.camera !== false && 'capture' in input) {
        input.capture = 'environment';
      }
      document.body.appendChild(input);

      input.addEventListener('change', function () {
        var fichier = input.files && input.files[0];
        if (!fichier) { input.remove(); resoudre(null); return; }

        var lecteur = new FileReader();
        lecteur.onload = function () {
          var base64 = lecteur.result;
          // Créer une vignette redimensionnée
          redimensionner(base64, largeurMax, qualite).then(function (redimensionnee) {
            input.remove();
            resoudre({ base64: redimensionnee, vignette: base64, type: fichier.type, nom: fichier.name });
          });
        };
        lecteur.onerror = function () { input.remove(); resoudre(null); };
        lecteur.readAsDataURL(fichier);
      });

      input.click();
    });
  }

  /** Redimensionne une image base64 et compresse en JPEG. */
  function redimensionner(dataURL, largeurMax, qualite) {
    return new Promise(function (resoudre) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w <= largeurMax && h <= largeurMax) {
          // Pas besoin de redimensionner, juste compresser
          compresser(img, w, h, qualite, resoudre);
          return;
        }
        var ratio = Math.min(largeurMax / w, largeurMax / h);
        var nw = Math.round(w * ratio), nh = Math.round(h * ratio);
        compresser(img, nw, nh, qualite, resoudre);
      };
      img.onerror = function () { resoudre(dataURL); };
      img.src = dataURL;
    });
  }

  function compresser(img, w, h, qualite, callback) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', qualite));
  }

  /** Affiche une vignette dans un conteneur. */
  function afficherVignette(conteneur, base64, onSupprimer) {
    conteneur.textContent = '';
    if (!base64) {
      conteneur.appendChild(creerPlaceholder('📷 Aucune photo de la parcelle'));
      return;
    }
    var enveloppe = document.createElement('div');
    enveloppe.className = 'photo-vignette';
    var img = document.createElement('img');
    img.src = base64;
    img.alt = 'Photo de la parcelle';
    img.className = 'photo-apercu';
    enveloppe.appendChild(img);
    if (onSupprimer) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bouton fantome mini';
      btn.textContent = 'Supprimer la photo';
      btn.addEventListener('click', onSupprimer);
      enveloppe.appendChild(btn);
    }
    conteneur.appendChild(enveloppe);
  }

  function creerPlaceholder(texte) {
    var p = document.createElement('p');
    p.className = 'info';
    p.textContent = texte;
    return p;
  }

  root.Photo = {
    capturer: capturerPhoto,
    afficherVignette: afficherVignette
  };
}(typeof self !== 'undefined' ? self : this));
