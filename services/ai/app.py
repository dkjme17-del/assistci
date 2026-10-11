from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import re

app = FastAPI(
    title='ASSISTCI AI & Recommendation Service',
    description='Service d intelligence artificielle et de recommandation de dépanneurs pour ASSISTCI (Abidjan)',
    version='1.0.0'
)

# Liste des communes et quartiers clés d'Abidjan
ABIDJAN_LOCATIONS = {
    'cocody': ['cocody', 'angre', 'angré', 'riviera', 'deux plateaux', '2 plateaux', 'palmeraie', 'danga', 'ambassades'],
    'yopougon': ['yopougon', 'yop', 'niangon', 'siporex', 'bel air', 'toit rouge', 'maroc', 'selmer'],
    'marcory': ['marcory', 'zone 4', 'zone 4c', 'biétry', 'bietry', 'anoumabo'],
    'plateau': ['plateau', 'cite administrative', 'cité administrative', 'commerce'],
    'koumassi': ['koumassi', 'remblais', 'grand campement', 'inchallah'],
    'treichville': ['treichville', 'armanville', 'avenue 16', 'rue 12', 'solibra'],
    'port-bouet': ['port-bouet', 'port bouet', 'aeroport', 'aéropor', 'gonzagueville', 'vrégence'],
    'adjame': ['adjame', 'adjamé', 'williamsville', 'mirador', 'liberte'],
    'abobo': ['abobo', 'gare', 'samake', 'avocatier', 'pk18', 'derriere rail'],
    'bingerville': ['bingerville', 'feh kesse', 'akouai santai'],
}

# Lexique des pannes automobiles
BREAKDOWN_KEYWORDS = {
    'battery': ['batterie', 'booster', 'demarrage', 'démarre pas', 'alternateur', 'cosses'],
    'flat_tire': ['pneu', 'roue', 'crevaison', 'creve', 'crevé', 'degonfle', 'dégonflé', 'changement de roue', 'jante'],
    'towing': ['remorquage', 'remorque', 'depanneuse', 'dépanneuse', 'treuil', 'immobilise', 'bloque', 'accident', 'fossé'],
    'fuel': ['carburant', 'essence', 'gasoil', 'panne seche', 'panne sèche', 'reservoir'],
    'lockout': ['clé', 'clef', 'cles', 'clefs', 'portiere bloquee', 'fermé a cle', 'porte bloquee'],
    'engine_failure': ['moteur', 'fumee', 'fumée', 'radiateur', 'chauffe', 'surchauffe', 'courroie', 'frein', 'embrayage', 'huile'],
}

CAR_BRANDS = [
    'toyota', 'hyundai', 'peugeot', 'mercedes', 'kia', 'renault', 'nissan',
    'mitsubishi', 'ford', 'volkswagen', 'bmw', 'audi', 'suzuki', 'mazda', 'citroen'
]


class RequestAnalysisInput(BaseModel):
    message: str
    location: Optional[str] = None


class ProviderScoreInput(BaseModel):
    provider_id: int
    business_name: str
    rating: float
    total_reviews: int
    district: Optional[str] = None
    emergency_ready: bool
    availability: bool
    specialties: List[str] = []


class MatchingInput(BaseModel):
    request_district: str
    breakdown_type: str
    urgency: str
    providers: List[ProviderScoreInput]


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'service': 'assistci-ai',
        'version': '1.0.0',
        'message': 'Microservice IA et moteur de matching opérationnels'
    }


@app.post('/analyze-request')
def analyze_request(payload: RequestAnalysisInput):
    """
    Analyse en langage naturel de la demande de dépannage :
    - Détection de la catégorie et du type de panne
    - Extraction de la commune / quartier d'Abidjan
    - Détection de la marque du véhicule
    - Évaluation du degré d'urgence
    """
    text = payload.message.lower()

    # 1. Détection du type de panne
    detected_breakdown = 'other'
    max_matches = 0
    for b_type, keywords in BREAKDOWN_KEYWORDS.items():
        matches = sum(1 for kw in keywords if kw in text)
        if matches > max_matches:
            max_matches = matches
            detected_breakdown = b_type

    # 2. Détection du lieu (commune d'Abidjan)
    detected_district = payload.location or 'Abidjan'
    for district, aliases in ABIDJAN_LOCATIONS.items():
        if any(alias in text for alias in aliases):
            detected_district = district.capitalize()
            break

    # 3. Détection de la marque
    detected_brand = None
    for brand in CAR_BRANDS:
        if brand in text:
            detected_brand = brand.capitalize()
            break

    # 4. Évaluation de l'urgence
    urgency = 'normal'
    if any(w in text for w in ['urgent', 'immédiat', 'immediat', 'bloque la circulation', 'danger', 'au milieu de la voie']):
        urgency = 'critical'
    elif any(w in text for w in ['immobilisé', 'immobilise', 'depuis des heures', 'vite', 'panne']):
        urgency = 'high'

    # Résumé explicatif
    summary = (
        f"Panne détectée : {detected_breakdown} à {detected_district}. "
        f"Niveau d'urgence : {urgency}."
    )

    return {
        'service_category': 'auto',
        'breakdown_type': detected_breakdown,
        'detected_district': detected_district,
        'detected_brand': detected_brand,
        'urgency': urgency,
        'confidence': 0.92 if max_matches > 0 else 0.65,
        'summary': summary
    }


@app.post('/rank-providers')
def rank_providers(payload: MatchingInput):
    """
    Algorithme de scoring et de recommandation des prestataires :
    Scoring composite basé sur :
    - La proximité géographique (même commune = +40 points)
    - La disponibilité immédiate d'urgence (+25 points)
    - La réputation et avis (jusqu'à +25 points)
    - L'adéquation de spécialité (+10 points)
    """
    ranked = []

    req_district = payload.request_district.lower().strip()
    b_type = payload.breakdown_type.lower()
    is_urgent = payload.urgency in ['high', 'critical']

    for p in payload.providers:
        if not p.availability:
            continue

        score = 0.0
        reasons = []

        # Proximité
        p_district = (p.district or '').lower().strip()
        if p_district and (p_district in req_district or req_district in p_district):
            score += 40.0
            reasons.append("Présent dans votre commune")
        elif p_district:
            score += 15.0
            reasons.append("Présent à Abidjan")

        # Urgence & Disponibilité SOS
        if is_urgent and p.emergency_ready:
            score += 25.0
            reasons.append("Prêt pour intervention immédiate 24/7")
        elif p.emergency_ready:
            score += 10.0

        # Réputation (Rating sur 5)
        rating_score = min(25.0, (p.rating / 5.0) * 20.0 + min(5.0, p.total_reviews * 0.5))
        score += rating_score
        if p.rating >= 4.5:
            reasons.append(f"Excellente réputation ({p.rating}/5)")

        # Spécialités
        if any(b_type in spec.lower() for spec in p.specialties):
            score += 10.0
            reasons.append("Spécialiste de ce type d'intervention")

        ranked.append({
            'provider_id': p.provider_id,
            'business_name': p.business_name,
            'matching_score': round(score, 1),
            'rating': p.rating,
            'district': p.district,
            'emergency_ready': p.emergency_ready,
            'reasons': reasons
        })

    # Tri décroissant selon le matching score
    ranked.sort(key=lambda x: x['matching_score'], reverse=True)

    return {
        'total_evaluated': len(payload.providers),
        'ranked_providers': ranked
    }
