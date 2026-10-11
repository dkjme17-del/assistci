from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import os
import re

app = FastAPI(
    title='ASSISTCI AI & Recommendation Service',
    description='Service d intelligence artificielle et de recommandation de dépanneurs pour ASSISTCI (Abidjan)',
    version='1.0.0'
)

# Liste des communes d'Abidjan
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

# Grandes villes de l'intérieur de la Côte d'Ivoire
IVORIAN_CITIES = {
    'yamoussoukro': ['yamoussoukro', 'yakro', 'morofe', 'morofé', 'dioulakro', 'fondation', 'ngokro'],
    'bouake': ['bouake', 'bouaké', 'koko', 'air france', 'nimbo', 'dar-es-salam', 'kennedy'],
    'san-pedro': ['san-pedro', 'san pedro', 'bardot', 'seweke', 'séwéké', 'zone portuaire', 'cite', 'cité'],
    'korhogo': ['korhogo', 'soba', 'koko', 'petit paris', 'sinistre', 'sinistré'],
    'daloa': ['daloa', 'labia', 'tazibouo', 'gbeuliville'],
    'man': ['man', 'tonkpi', 'grand gbapleu', 'sari', 'doyagouine'],
    'gagnoa': ['gagnoa', 'babre', 'babré', 'dioulabougou', 'garahio'],
    'abengourou': ['abengourou', 'agnikro', 'cafop'],
    'grand-bassam': ['grand-bassam', 'bassam', 'moossou', 'imperial', 'quartier france'],
    'dabou': ['dabou', 'agban', 'debrimou'],
    'soubre': ['soubre', 'soubré', 'barrage'],
    'divo': ['divo', 'bada', 'konankro'],
}

# Grands axes et corridors autoroutiers majeurs de Côte d'Ivoire
HIGHWAY_CORRIDORS = {
    'Autoroute du Nord (A3)': ['autoroute du nord', 'autoroute', 'singrobo', 'attinguie', 'attinguié', 'nzianouan', 'n zianouan', 'toumodi', 'tiebissou', 'tiébissou', 'peage', 'péage', 'pk '],
    'La Côtière (A10)': ['cotiere', 'côtière', 'grand-lahou', 'grand lahou', 'fresco', 'sassandra'],
    'Route de l Est (A1)': ['route de l est', 'route de lest', 'adzope', 'adzopé', 'akoupe', 'akoupé', 'agnibilekrou', 'agnibilékrou'],
    'Axe Ouest (A6)': ['bouafle', 'bouaflé', 'duekoue', 'duékoué', 'blolequin'],
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
        'coverage': 'Toute la Côte d Ivoire (Villes & Autoroutes)',
        'message': 'Microservice IA et moteur de matching opérationnels'
    }


@app.post('/analyze-request')
def analyze_request(payload: RequestAnalysisInput):
    """
    Analyse en langage naturel de la demande de dépannage à l'échelle nationale :
    - Détection de la catégorie et du type de panne
    - Identification du type d'environnement (Agglomération vs Autoroute / Axe National)
    - Détection de la ville ou commune de Côte d'Ivoire
    - Détection de l'axe autoroutier et point de repère (PK / péage)
    - Détection de la marque du véhicule
    - Évaluation de l'urgence de sécurité routière
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

    # 2. Détection Axe Autoroutier / Corridor
    location_type = 'city'
    detected_highway = None
    for h_name, keywords in HIGHWAY_CORRIDORS.items():
        if any(kw in text for kw in keywords):
            location_type = 'highway'
            detected_highway = h_name
            break

    # 3. Détection de la Ville ou Commune
    detected_city = 'Abidjan'
    detected_district = payload.location or None

    # Recherche dans les villes de l'intérieur
    for city_key, aliases in IVORIAN_CITIES.items():
        if any(alias in text for alias in aliases):
            detected_city = city_key.capitalize()
            detected_district = detected_city
            break

    # Recherche dans les communes d'Abidjan si pas encore attribué
    if detected_city == 'Abidjan':
        for district, aliases in ABIDJAN_LOCATIONS.items():
            if any(alias in text for alias in aliases):
                detected_district = district.capitalize()
                break

    if not detected_district:
        detected_district = detected_city

    # 4. Détection de la marque
    detected_brand = None
    for brand in CAR_BRANDS:
        if brand in text:
            detected_brand = brand.capitalize()
            break

    # 5. Évaluation de l'urgence routière
    # Sur autoroute ou voie rapide, une panne est automatiquement classée au minimum HIGH (danger vital)
    urgency = 'high' if location_type == 'highway' else 'normal'

    if any(w in text for w in ['urgent', 'immédiat', 'immediat', 'danger', 'bloque la circulation', 'voie rapide', 'nuit', 'seul']):
        urgency = 'critical'
    elif any(w in text for w in ['immobilisé', 'immobilise', 'depuis des heures', 'vite', 'panne']):
        urgency = 'high'

    # Résumé
    if location_type == 'highway':
        summary = f"Panne sur axe rapide ({detected_highway or 'Autoroute'}) vers {detected_city}. Danger de sécurité routière élevé."
    else:
        summary = f"Panne identifiée : {detected_breakdown} à {detected_district} ({detected_city}). Niveau d'urgence : {urgency}."

    return {
        'service_category': 'auto',
        'breakdown_type': detected_breakdown,
        'location_type': location_type,
        'highway_axis': detected_highway,
        'detected_city': detected_city,
        'detected_district': detected_district,
        'detected_brand': detected_brand,
        'urgency': urgency,
        'confidence': 0.94 if max_matches > 0 else 0.70,
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


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv('AI_HOST', '0.0.0.0'),
        port=int(os.getenv('AI_PORT', '8000')),
    )
