'use strict';

/**
 * sireneService.js — Vérification d'entreprise via l'API Annuaire Entreprises (data.gouv.fr)
 *
 * Équivalent Node.js de sirene.py (Django).
 * API : https://api.annuaire-entreprises.data.gouv.fr/etablissement/{siret}
 *
 * Retourne { status, data } où status ∈ { 'VERIFIED', 'NEEDS_REVIEW', 'REJECTED' }
 */

const axios = require('axios');
const stringSimilarity = require('string-similarity');

const SIRENE_API_URL = 'https://api.annuaire-entreprises.data.gouv.fr/etablissement/{siret}';
const REQUEST_TIMEOUT = 5000; // ms

function cleanSiret(siret) {
  return siret.replace(/[\s\-]/g, '');
}

function nameSimilarity(a, b) {
  return stringSimilarity.compareTwoStrings(a.toLowerCase().trim(), b.toLowerCase().trim());
}

/**
 * Vérifie un SIRET via l'API Annuaire Entreprises.
 * @param {string} siret — numéro SIRET (14 chiffres)
 * @param {string} declaredName — nom d'entreprise déclaré lors de l'inscription
 * @returns {{ status: string, data: object }}
 */
async function verifySiret(siret, declaredName) {
  const cleaned = cleanSiret(siret);

  if (!/^\d{14}$/.test(cleaned)) {
    return { status: 'REJECTED', data: { error: 'Format SIRET invalide (14 chiffres attendus)' } };
  }

  let resp;
  try {
    resp = await axios.get(
      SIRENE_API_URL.replace('{siret}', cleaned),
      { timeout: REQUEST_TIMEOUT }
    );
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { status: 'REJECTED', data: { error: 'SIRET introuvable dans le répertoire SIRENE' } };
    }
    // Erreur réseau ou timeout → révision manuelle
    return { status: 'NEEDS_REVIEW', data: { error: 'API SIRENE indisponible — révision manuelle requise' } };
  }

  if (resp.status !== 200) {
    return { status: 'NEEDS_REVIEW', data: { error: `Réponse inattendue de l'API SIRENE (HTTP ${resp.status})` } };
  }

  const data = resp.data;

  // Vérifier si l'établissement est actif (etat_administratif: 'A' = actif, 'F' = fermé)
  const etat = data.etat_administratif || 'F';
  if (etat !== 'A') {
    return {
      status: 'REJECTED',
      data: { error: 'Établissement fermé ou radié selon le répertoire SIRENE', sirene_data: data },
    };
  }

  // Comparer le nom déclaré avec le nom officiel
  const officialName = data.nom_raison_sociale || data.nom_complet || '';

  if (officialName && declaredName) {
    const similarity = nameSimilarity(officialName, declaredName);
    if (similarity >= 0.70) {
      return { status: 'VERIFIED', data };
    }
    return {
      status: 'NEEDS_REVIEW',
      data: {
        ...data,
        _similarity: Math.round(similarity * 100) / 100,
        _note: `Nom déclaré "${declaredName}" vs nom officiel "${officialName}" (similarité ${Math.round(similarity * 100)}%)`,
      },
    };
  }

  // Nom officiel absent → valider si établissement actif
  return { status: 'VERIFIED', data };
}

module.exports = { verifySiret, cleanSiret };
