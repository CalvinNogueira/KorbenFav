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
  async function addFavButtons() {
    const articles = document.querySelectorAll(".article-card, .recent-article-card");
    if (articles.length === 0) return;

    const result = await browser.storage.local.get("korbenFavs");
    const favs = result.korbenFavs || [];

    for (const element of articles) {
      if (element.querySelector(".korbenFav")) continue;

      const contentDiv = element.querySelector(".article-card-content")
          || element.querySelector(".recent-article-content");

     if (!contentDiv) continue;

      const linkEl = element.querySelector("h2 a, h3 a, a.recent-article-link, a");
      if (!linkEl) continue;

      const korbenFavDiv = document.createElement("div");
      korbenFavDiv.classList.add("korbenFav");

      const korbenFavStar = document.createElement("span");
      korbenFavStar.classList.add("korbenFavStar");
      korbenFavStar.textContent = "★";

      if (favs.some((f) => f.url === linkEl.href)) {
        korbenFavStar.classList.add("favInList");
      }

      korbenFavDiv.append(korbenFavStar);
      contentDiv.append(korbenFavDiv);
      listenClickFavButton(korbenFavStar, element);
    }
  }

  function listenClickFavButton(btn, article) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Empêche la propagation du clic
      e.preventDefault(); // (optionnel) évite d'autres effets par défaut
      storeFav(article, btn);
    });
  }

  async function storeFav(articleElement, btn) {
    // Supporte h2 (grands articles) et h3 (articles "À ne pas manquer")
    const titleEl = articleElement.querySelector("h2, h3");
    const linkEl = articleElement.querySelector("h2 a, h3 a, a.recent-article-link, a");
    const imageEl = articleElement.querySelector("img");

    if (!titleEl || !linkEl) return;

    const fav = {
      title: titleEl.textContent.trim(),
      url: linkEl.href,
      imageUrl: imageEl ? imageEl.src : "",
    };

    const result = await browser.storage.local.get("korbenFavs");
    const favs = result.korbenFavs || [];

    if (!favs.some((f) => f.url === fav.url)) {
      favs.push(fav);
      await browser.storage.local.set({ korbenFavs: favs });
      btn.classList.add("favInList");
      showToast(`L'article : ${fav.title} a été ajouté à vos favoris.`);
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
    // Ajout : retire la classe favInList sur le bouton étoile correspondant
    if (request.action === "removeFavClass" && request.url) {
      const articles = document.getElementsByClassName("article-card");
      for (const element of articles) {
        const linkEl = element.querySelector("a");
        if (linkEl) {
          debugLog(
            `[KorbenFav] Comparaison : ${linkEl.href} === ${request.url}`
          );
          if (linkEl.href === request.url) {
            const star = element.querySelector(".korbenFavStar");
            if (star) star.classList.remove("favInList");
          }
        }
      }
    }
    // Ajout pour tout retirer
    if (request.action === "removeAllFavClass") {
      const stars = document.querySelectorAll(".korbenFavStar.favInList");
      stars.forEach((star) => star.classList.remove("favInList"));
    }
  });
})();
