from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title='ASSISTCI AI Service')


class RequestInput(BaseModel):
    message: str
    location: str | None = None


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'service': 'assistci-ai',
        'message': 'Service IA prêt'
    }


@app.post('/analyze-request')
def analyze_request(payload: RequestInput):
    message = payload.message.lower()

    if 'voiture' in message or 'vehicule' in message or 'moteur' in message:
        service = 'assistance_automobile'
    elif 'plomberie' in message:
        service = 'plomberie'
    else:
        service = 'autre'

    return {
        'service': service,
        'location': payload.location or 'non fournie',
        'urgency': 'high' if 'urgent' in message or 'immobile' in message else 'normal',
        'summary': 'Demande identifiée et prête à être transmise aux prestataires adaptés.'
    }
