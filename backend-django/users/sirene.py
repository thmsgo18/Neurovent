"""
sirene.py — Vérification d'entreprise via l'API Annuaire Entreprises (data.gouv.fr)

API utilisée : https://api.annuaire-entreprises.data.gouv.fr/etablissement/{siret}
- Gratuite, pas d'authentification requise
- Données officielles INSEE / SIRENE

Retourne (verification_status, sirene_data) où verification_status est :
  'VERIFIED'      → SIRET valide, établissement actif, nom cohérent (similarité ≥ 70%)
  'NEEDS_REVIEW'  → SIRET valide mais doute sur le nom, ou erreur réseau
  'REJECTED'      → SIRET introuvable, établissement fermé, ou SIRET malformé
"""

import re
import requests
from difflib import SequenceMatcher

SIRENE_API_URL = "https://api.annuaire-entreprises.data.gouv.fr/etablissement/{siret}"
REQUEST_TIMEOUT = 5  # secondes


def _name_similarity(a, b):
    """Ratio de similarité entre deux chaînes (0.0 → 1.0)"""
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _clean_siret(siret):
    """Supprime les espaces et tirets d'un SIRET"""
    return re.sub(r'[\s\-]', '', siret)


def verify_siret(siret, declared_name):
    """
    Vérifie un SIRET via l'API Annuaire Entreprises.

    Paramètres :
      siret          — numéro SIRET saisi par l'entreprise (14 chiffres)
      declared_name  — nom d'entreprise déclaré lors de l'inscription

    Retourne :
      (status, data) où status ∈ {'VERIFIED', 'NEEDS_REVIEW', 'REJECTED'}
      data est le dict retourné par l'API (vide en cas d'erreur)
    """
    siret = _clean_siret(siret)

    # Validation format SIRET (14 chiffres)
    if not re.fullmatch(r'\d{14}', siret):
        return 'REJECTED', {'error': 'Format SIRET invalide (14 chiffres attendus)'}

    try:
        resp = requests.get(
            SIRENE_API_URL.format(siret=siret),
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException:
        # Erreur réseau → on ne rejette pas, on passe en révision manuelle
        return 'NEEDS_REVIEW', {'error': 'API SIRENE indisponible — révision manuelle requise'}

    if resp.status_code == 404:
        return 'REJECTED', {'error': 'SIRET introuvable dans le répertoire SIRENE'}

    if resp.status_code != 200:
        return 'NEEDS_REVIEW', {'error': f'Réponse inattendue de l\'API SIRENE (HTTP {resp.status_code})'}

    try:
        data = resp.json()
    except ValueError:
        return 'NEEDS_REVIEW', {'error': 'Réponse API SIRENE non lisible'}

    # Vérifier si l'établissement est actif (etat_administratif : 'A' = actif, 'F' = fermé)
    etat = data.get('etat_administratif', 'F')
    if etat != 'A':
        return 'REJECTED', {
            'error': 'Établissement fermé ou radié selon le répertoire SIRENE',
            'sirene_data': data,
        }

    # Comparer le nom déclaré avec le nom officiel
    official_name = data.get('nom_raison_sociale') or data.get('nom_complet', '')

    if official_name and declared_name:
        similarity = _name_similarity(official_name, declared_name)
        if similarity >= 0.70:
            return 'VERIFIED', data
        else:
            # Nom trop différent → révision manuelle
            return 'NEEDS_REVIEW', {
                **data,
                '_similarity': round(similarity, 2),
                '_note': f'Nom déclaré "{declared_name}" vs nom officiel "{official_name}" (similarité {round(similarity * 100)}%)',
            }

    # Nom officiel absent → on valide quand même si l'établissement est actif
    return 'VERIFIED', data
