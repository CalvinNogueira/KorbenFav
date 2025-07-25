const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

if (typeof browser === "undefined") {
    var browser = chrome;
}
document.addEventListener("DOMContentLoaded", async () => {

  debugLog("[KorbenFav] Script popup chargé");

  // Initialise l'écouteur du bouton "Vider tous les favoris"
  listenClickDelAllFavs();

  // Récupère et affiche les favoris stockés
  await displayFavs();
});

/**
 * Gère le clic sur le bouton "Vider tous les favoris".
 * Supprime tout le contenu de browser.storage.local
 * et vide l'affichage HTML.
 */
function listenClickDelAllFavs() {
  const clearFavs = document.querySelector("#clear-favs");

  if (!clearFavs) {
    debugLog("[KorbenFav] Bouton #clear-favs absent.");
    return;
  }

clearFavs.addEventListener("click", function () {
  
  // Supprime les données du stockage
  browser.storage.local.set({ korbenFavs: [] });
  
  // Vide l'affichage
  const favsList = getFavDiv();
  favsList.innerHTML = "";
  
  // Affiche le message "aucun article"
  const noArticlesMessage = document.querySelector(".noArticles");
  if (noArticlesMessage) noArticlesMessage.style.display = "block";

  sendToast("Tous les favoris ont étés supprimés.");
  debugLog("[KorbenFav] Tous les favoris ont étés supprimés.");
});
}

/**
 * Supprime un favori spécifique depuis browser.storage.local
 * en se basant sur son URL, et retire également le bloc HTML correspondant.
 * @param {string} url - L'URL du favori à supprimer
 * @param {HTMLElement} domElement - L'élément DOM à retirer
 */
function deleteFavByUrl(url, title, domElement) {
  browser.storage.local.get("korbenFavs").then((result) => {
    const favs = result.korbenFavs || [];

    // On filtre tous les favoris sauf celui à supprimer
    const updatedFavs = favs.filter((fav) => fav.url !== url);

    // On met à jour le stockage et on retire l'élément du DOM
    browser.storage.local.set({ korbenFavs: updatedFavs }).then(() => {
      
      if (domElement && domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }

      sendToast(`Article supprimé : ${title}`);
      debugLog(`[KorbenFav] Article supprimé : ${title}`);
    });
  });
}

/**
 * Retourne l'élément HTML qui contient tous les favoris
 * @returns {HTMLElement} - Le conteneur .favorites-list
 */
function getFavDiv() {
  return document.querySelector(".favorites-list");
}

/**
 * Génère dynamiquement les éléments HTML pour chaque favori.
 * @param {Array} favs - Liste des favoris (objets avec title, url, imageUrl)
 * @param {HTMLElement} favsDiv - Conteneur HTML des favoris
 */
function createHTMLFavElements(favs, favsDiv) {
  for (const element of favs) {
    const favItem = document.createElement("div");
    favItem.classList.add("fav-item");

    // Création de l'image de l'article
    const imgDivUrl = document.createElement("a");
    imgDivUrl.href = element.url;
    imgDivUrl.setAttribute("title", element.title);
    imgDivUrl.setAttribute("target", "_blank");
    imgDivUrl.setAttribute("rel", "noopener noreferrer");
    favItem.appendChild(imgDivUrl);

    const imgFav = document.createElement("img");
    imgFav.src = element.imageUrl;
    imgFav.alt = element.title;
    imgDivUrl.appendChild(imgFav);

    // Création du bloc texte
    const favInfoDiv = document.createElement("div");
    favInfoDiv.classList.add("fav-info");

    const favTitle = document.createElement("a");
    favTitle.href = element.url;
    favTitle.classList.add("fav-title");
    favTitle.setAttribute("title", element.title);
    favTitle.setAttribute("target", "_blank");
    favTitle.setAttribute("rel", "noopener noreferrer");
    favTitle.textContent = element.title;
    favInfoDiv.appendChild(favTitle);

    favItem.appendChild(favInfoDiv);

    // Création du bouton de suppression
    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.setAttribute("title", "Supprimer");
    deleteBtn.textContent = "✕";

    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteFavByUrl(element.url, element.title, favItem);
    });

    favItem.appendChild(deleteBtn);

    // Insertion de l'élément dans le conteneur
    favsDiv.appendChild(favItem);
  }
}

// Rechercher sur chaque tab si c'est le domaine du site
function sendToast(message) {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, {
      action: "showToast",
      message: message,
    });
  });
}

/**
 * Récupère les favoris depuis le stockage
 * et appelle la fonction de génération HTML.
 */
async function displayFavs() {
  const result = await browser.storage.local.get("korbenFavs");
  const favs = result.korbenFavs || [];
  const favsDiv = getFavDiv();
  const noArticlesMessage = document.querySelector(".noArticles");

  if (favs.length === 0) {
    // Affiche le message "aucun article"
    if (noArticlesMessage) noArticlesMessage.style.display = "block";

    debugLog("[KorbenFav] Aucun favori trouvé.");
    return;
  }

  // Cache le message s’il y a des favoris
  if (noArticlesMessage) noArticlesMessage.style.display = "none";

  createHTMLFavElements(favs, favsDiv);
}
