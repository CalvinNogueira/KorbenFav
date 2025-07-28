(function () {
  const DEBUG = true;

  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }
  /**
   * On vérifie et on initialise une variable globale
   * permettant de s'assurer que le script ne fera rien
   * s'il est injecté plusieurs fois sur la page.
   */
  if (window.hasRun) {
    return;
  } else {
    debugLog("[KorbenFav] Content script (addFav) chargé avec succès.");
  }
  window.hasRun = true;
  if (typeof browser === "undefined") {
    browser = chrome;
  }
  // Ajout des boutons
  async function addFavButtons() {
    const articles = document.getElementsByClassName("article-card");
    if (articles.length === 0) {
      debugLog("[KorbenFav] Aucun article trouvé.");
      return;
    }

    // Récupération des favoris déjà enregistrés
    const result = await browser.storage.local.get("korbenFavs");
    const favs = result.korbenFavs || [];

    for (const element of articles) {
      const contentDiv = element.querySelector(".article-card-content");
      const korbenFavDiv = document.createElement("div");
      korbenFavDiv.classList.add("korbenFav");

      const korbenFavStar = document.createElement("span");
      korbenFavStar.classList.add("korbenFavStar");
      korbenFavStar.textContent = "★";

      // Vérifie si l’article est déjà en favoris
      const linkEl = element.querySelector("a");
      if (linkEl && favs.some((f) => f.url === linkEl.href)) {
        korbenFavStar.classList.add("favInList");
      }

      korbenFavDiv.append(korbenFavStar);
      contentDiv.append(korbenFavDiv);
      listenClickFavButton(korbenFavStar, element);
    }

    debugLog("[KorbenFav] Boutons générés.");
  }

  function listenClickFavButton(btn, article) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Empêche la propagation du clic
      e.preventDefault(); // (optionnel) évite d'autres effets par défaut
      storeFav(article, btn);
    });
  }

  async function storeFav(articleElement, btn) {
    const titleEl = articleElement.querySelector("h2");
    const linkEl = articleElement.querySelector("a");
    const imageEl = articleElement.querySelector(".article-card-image img");

    if (!titleEl || !linkEl || !imageEl) return;

    const fav = {
      title: titleEl.textContent.trim(),
      url: linkEl.href,
      imageUrl: imageEl.src,
    };

    const result = await browser.storage.local.get("korbenFavs");
    const favs = result.korbenFavs || [];

    // Empêche les doublons
    if (!favs.some((f) => f.url === fav.url)) {
      favs.push(fav);
      await browser.storage.local.set({ korbenFavs: favs });
      btn.classList.add("favInList");
      showToast(`L'article : ${fav.title} a été ajouté à vos favoris.`);
      debugLog(`[KorbenFav] Favori ajouté : "${fav.title}" ${fav.imageUrl}`);
    } else {
      deleteFavByUrl(fav.url, fav.title, btn);
    }
  }

  function deleteFavByUrl(url, title, btn) {
    browser.storage.local.get("korbenFavs").then((result) => {
      const favs = result.korbenFavs || [];

      // On filtre tous les favoris sauf celui à supprimer
      const updatedFavs = favs.filter((fav) => fav.url !== url);

      // On met à jour le stockage
      browser.storage.local.set({ korbenFavs: updatedFavs }).then(() => {
        btn.classList.remove("favInList");
        showToast(`L'article : ${title} a été supprimé de vos favoris.`);
        debugLog(`[KorbenFav] Article supprimé : ${title}`);
      });
    });
  }

  function showToast(message, duration = 3000) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    // Apparition
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    // Disparition
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  const intervalId = setInterval(() => {
    addFavButtons();
    clearInterval(intervalId); // On arrête une fois qu'on a tout modifié
  }, 500);
  browser.runtime.onMessage.addListener((request) => {
    if (request.action === "showToast") {
      showToast(request.message);
    }
  });
})();
