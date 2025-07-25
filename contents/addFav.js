(function () {
  const DEBUG = false;

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
    var browser = chrome;
  }
  // Ajout des boutons
  function addFavButtons() {
    const articles = document.getElementsByClassName("article-card");
    if (articles.length === 0) {
      debugLog("[KorbenFav] Aucun article trouvé.");
      return;
    }
    /**
     * Pour chaque articles on vient créer une div,
     * puis ensuite on la rend clicable
     * pour enfin appeler
     */
    for (const element of articles) {
      const contentDiv = element.querySelector(".article-card-content");
      const korbenFavDiv = document.createElement("div");
      korbenFavDiv.classList.add("korbenFav");
      korbenFavDiv.textContent = "★";

      contentDiv.append(korbenFavDiv);
      listenClickFavButton(korbenFavDiv, element);
    }
    debugLog("[KorbenFav] Boutons générés.");
  }

  function listenClickFavButton(btn, article) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Empêche la propagation du clic
      e.preventDefault(); // (optionnel) évite d'autres effets par défaut
      storeFav(article);
    });
  }

  async function storeFav(articleElement) {
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
      showToast("Favori ajouté avec succès !");
      debugLog(`[KorbenFav] Favori ajouté : "${fav.title}" ${fav.imageUrl}`);
    } else {
      showToast("Favori déjà présent !");
      debugLog(`[KorbenFav] Favori déjà présent : "${fav.title}"`);
    }
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
