# Prediccion de Futbol Argentino

API REST que estima las probabilidades de victoria del equipo local, empate o victoria del visitante para un enfrentamiento entre dos equipos argentinos. La estimacion utiliza un modelo de machine learning y perfiles estadisticos historicos, considerando quien juega de local y quien de visitante.

## Datos y periodo

- **Cobertura historica informada:** 1931-2021.
- **Artefactos del modelo:** `modelo_futbol_argentino.joblib` y `team_profiles_lookup.pkl`.


## API desplegada

- **URL base:** <https://prediccion-futbol-argentino.onrender.com>
- **Endpoint de prediccion:** `POST /predict`
- **Documentacion interactiva:** <https://prediccion-futbol-argentino.onrender.com/docs>

La ruta `/` no es un endpoint de la API; puede responder `404` sin que eso indique que `/predict` no exista.

## Como hacer una prediccion

Enviale un JSON con el nombre del equipo local y el visitante:

```http
POST https://prediccion-futbol-argentino.onrender.com/predict
Content-Type: application/json
```

```json
{
  "local_team": "Rosario Central",
  "visitor_team": "Newells"
}
```

Ejemplo con `curl`:

```bash
curl -X POST "https://prediccion-futbol-argentino.onrender.com/predict" \
  -H "Content-Type: application/json" \
  -d "{\"local_team\":\"Rosario Central\",\"visitor_team\":\"Newells\"}"
```

## Respuesta

```json
{
  "success": true,
  "matchup": "Rosario Central vs Newells",
  "local_team": "Rosario Central",
  "visitor_team": "Newells",
  "predictions": {
    "local_win_percent": 43.33,
    "draw_percent": 38.74,
    "visitor_win_percent": 17.93
  }
}
```

Los porcentajes representan probabilidades estimadas por el modelo; no garantizan el resultado real del partido.

