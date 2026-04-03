import { apiFetch } from "./client";

const USE_MOCK = false;

const MOCK_TAGS = [
  { id: 1, name: "Neuroscience" },
  { id: 2, name: "Cognitive Neuroscience" },
  { id: 3, name: "Computational Neuroscience" },
  { id: 4, name: "Neuroimaging" },
  { id: 5, name: "Brain-Computer Interfaces" },
  { id: 6, name: "Neural Engineering" },
  { id: 7, name: "Neurotechnology" },
  { id: 8, name: "Cognitive Science" },
  { id: 9, name: "Psychology" },
  { id: 10, name: "Behavioral Science" },
  { id: 11, name: "Digital Health" },
  { id: 12, name: "Mental Health Research" },
  { id: 13, name: "Clinical Research" },
  { id: 14, name: "Biostatistics" },
  { id: 15, name: "Bioinformatics" },
  { id: 16, name: "Systems Biology" },
  { id: 17, name: "Genomics" },
  { id: 18, name: "Biomedical Engineering" },
  { id: 19, name: "Medical Imaging" },
  { id: 20, name: "Public Health" },
  { id: 21, name: "Epidemiology" },
  { id: 22, name: "Ethics in AI" },
  { id: 23, name: "Responsible AI" },
  { id: 24, name: "AI Safety" },
  { id: 25, name: "Trustworthy AI" },
  { id: 26, name: "Explainable AI" },
  { id: 27, name: "Machine Learning" },
  { id: 28, name: "Deep Learning" },
  { id: 29, name: "Natural Language Processing" },
  { id: 30, name: "Computer Vision" },
  { id: 31, name: "Reinforcement Learning" },
  { id: 32, name: "Robotics" },
  { id: 33, name: "Human-Computer Interaction" },
  { id: 34, name: "Federated Learning" },
  { id: 35, name: "Privacy" },
  { id: 36, name: "Differential Privacy" },
  { id: 37, name: "Cybersecurity" },
  { id: 38, name: "Data Governance" },
  { id: 39, name: "Data Science" },
  { id: 40, name: "Causal Inference" },
  { id: 41, name: "Statistics" },
  { id: 42, name: "Optimization" },
  { id: 43, name: "Signal Processing" },
  { id: 44, name: "Wearable Sensors" },
  { id: 45, name: "Assistive Technologies" },
  { id: 46, name: "Health Informatics" },
  { id: 47, name: "Scientific Reproducibility" },
  { id: 48, name: "Open Science" },
  { id: 49, name: "Research Methods" },
  { id: 50, name: "Innovation in Healthcare" },
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
  _pending = apiFetch("/api/tags/", { auth: false })
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
