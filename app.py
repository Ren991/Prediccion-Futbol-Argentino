
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib

app = FastAPI(
    title="AI Football Predictor API",
    description="API de Inteligencia Artificial para predecir partidos de fútbol",
    version="1.0.0"
)

# Permitir peticiones desde tu interfaz Frontend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar artefactos globales
try:
    model = joblib.load('modelo_futbol_argentino.joblib')
    team_profiles = pd.read_pickle('team_profiles_lookup.pkl')
except Exception as e:
    print(f"Error cargando los modelos: {e}")

class MatchRequest(BaseModel):
    local_team: str
    visitor_team: str

def buscar_nombre_oficial(nombre: str):
    coincidencias = [t for t in team_profiles.index if nombre.lower() in t.lower()]
    return coincidencias[0] if coincidencias else None

@app.post("/predict")
def predecir_partido(req: MatchRequest):
    loc_oficial = buscar_nombre_oficial(req.local_team)
    vis_oficial = buscar_nombre_oficial(req.visitor_team)
    
    if not loc_oficial or not vis_oficial:
        raise HTTPException(
            status_code=404, 
            detail=f"Equipos no encontrados de manera unívoca. Buscaste: {req.local_team} vs {req.visitor_team}"
        )
        
    p_loc = team_profiles.loc[loc_oficial]
    p_vis = team_profiles.loc[vis_oficial]
    
    # Crear el vector de variables tal como se entrenó
    match_features = pd.DataFrame([{
        'local_win_ratio': p_loc['efectividad_local_win'],
        'visitor_loss_ratio': p_vis['efectividad_visitante_loss'],
        'goal_power_diff': p_loc['promedio_goles_favor_local'] - p_vis['promedio_goles_contra_visitante'],
        'avg_local_goals_scored': p_loc['promedio_goles_favor_local'],
        'avg_local_goals_conceded': p_loc['goles_contra_local'] / (p_loc['pj_local'] + 1e-5),
        'avg_visitor_goals_scored': p_vis['goles_favor_visitante'] / (p_vis['pj_visitante'] + 1e-5),
        'avg_visitor_goals_conceded': p_vis['promedio_goles_contra_visitante']
    }])
    
    # Predecir probabilidades
    probabilidades = model.predict_proba(match_features)[0]
    
    return {
        "success": True,
        "matchup": f"{loc_oficial} vs {vis_oficial}",
        "local_team": loc_oficial,
        "visitor_team": vis_oficial,
        "predictions": {
            "local_win_percent": round(probabilidades[1] * 100, 2),
            "draw_percent": round(probabilidades[0] * 100, 2),
            "visitor_win_percent": round(probabilidades[2] * 100, 2)
        }
    }
