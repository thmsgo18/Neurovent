import { apiFetch } from "./client";

const USE_MOCK = false;

const MOCK_TAGS = [
  { id: 1, name: "Federated Learning" },
  { id: 2, name: "Privacy" },
  { id: 3, name: "Differential Privacy" },
  { id: 4, name: "Multi-Agent" },
  { id: 5, name: "Machine Learning" },
  { id: 6, name: "Security" },
  { id: 7, name: "Robustness" },
  { id: 8, name: "NLP" },
  { id: 9, name: "Neurosciences" },
  { id: 10, name: "Deep Learning" },
];

// Cache module-level — persiste entre les navigations, vide au rechargement de page
let _cache = null;
let _pending = null;

// Liste publique des tags
export const getTags = () => {
  if (USE_MOCK) return Promise.resolve(MOCK_TAGS);
  // Retour immédiat depuis le cache si déjà chargé
  if (_cache) return Promise.resolve(_cache);
  // Déduplique les appels simultanés : une seule requête en vol
  if (_pending) return _pending;
  _pending = apiFetch("/api/tags/")
    .then((data) => {
      _cache = data?.results ?? data;
      _pending = null;
      return _cache;
    })
    .catch((err) => {
      _pending = null;
      throw err;
    });
  return _pending;
};

// Lecture synchrone du cache (null si pas encore chargé)
export const getTagsSync = () => _cache;

// Permet de pré-charger les tags tôt (appeler au démarrage de l'app)
export const prefetchTags = () => getTags().catch(() => {});

// Admin : créer un tag
export const createTag = async (name) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const newTag = { id: MOCK_TAGS.length + 1, name };
    MOCK_TAGS.push(newTag);
    return newTag;
  }
  return apiFetch("/api/tags/create/", { method: "POST", body: { name } });
};
