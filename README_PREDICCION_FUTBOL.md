# Prediccion de Futbol Argentino

API REST que estima las probabilidades de victoria del equipo local, empate o victoria del visitante para un enfrentamiento entre dos equipos argentinos. La estimacion utiliza un modelo de machine learning y perfiles estadisticos historicos, considerando quien juega de local y quien de visitante.

## Datos y periodo

- **Cobertura historica informada:** 1931-2021.
- **Artefactos del modelo:** `modelo_futbol_argentino.joblib` y `team_profiles_lookup.pkl`.
- La referencia o URL de la fuente original de los datos no figura en los archivos disponibles. Agregala aqui para que el origen de los datos quede documentado y sea reproducible.

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

## Errores habituales

- **404 en `/`:** no hay una ruta raiz definida. Proba `/docs` o `POST /predict`.
- **404 en `/predict`:** uno o ambos nombres no coinciden con los equipos disponibles en los perfiles historicos.
- **Error al cargar los modelos:** comproba que ambos artefactos esten disponibles en el servidor y que las versiones de NumPy y scikit-learn sean compatibles con las usadas para generarlos.

## Ejecucion local

Con Python 3.11 y las dependencias del proyecto instaladas, coloca `app.py` y los dos artefactos del modelo en el mismo directorio y ejecuta:

```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

Luego visita <http://localhost:8000/docs> para probar el endpoint.
