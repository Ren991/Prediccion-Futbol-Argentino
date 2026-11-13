# Documentacion completa del modelo de prediccion del futbol argentino

## 1. Resumen ejecutivo

Este proyecto estima tres resultados posibles para un partido entre dos clubes:

1. Victoria del equipo local.
2. Empate.
3. Victoria del equipo visitante.

El clasificador es un `RandomForestClassifier` de scikit-learn. Recibe siete estadisticas agregadas de los perfiles historicos del local y del visitante, y devuelve una probabilidad estimada para cada clase. La localia se representa mediante estadisticas separadas para partidos en casa y fuera.

El dataset disponible contiene **32.854 partidos**, **95 clubes** y etiquetas de competicion/temporada cuyo rango va de **1931 a 2021**. La API de produccion expone el calculo mediante `POST /predict`.

**Importante:** el notebook calcula los perfiles de los equipos usando todo el dataset antes de crear el conjunto de prueba. Como esos perfiles incluyen resultados que luego aparecen en la prueba (y hasta el resultado del propio partido), la evaluacion tiene fuga de informacion. El **48% de accuracy** que se reporta no representa una estimacion confiable de como funcionaria el modelo prediciendo partidos futuros.

## 2. Archivos y componentes

| Archivo / componente | Funcion |
|---|---|
| `FutbolArgentino.ipynb` | Notebook con exploracion, generacion de variables, entrenamiento, evaluacion y exportacion. |
| `results.csv` | Datos de partidos usados para entrenar y construir los perfiles. |
| `tabla_rendimiento_equipos.csv` | Resumen agregado de rendimiento por equipo; se deriva de `results.csv`. |
| `modelo_futbol_argentino.joblib` | Clasificador entrenado serializado con Joblib. |
| `team_profiles_lookup.pkl` | Tabla de estadisticas por equipo que usa la API para construir las siete variables de entrada. |
| `app.py` | API FastAPI que carga los artefactos y ejecuta la prediccion. |

El notebook usa rutas de Google Colab como `/content/results.csv` y `/content/modelo_futbol_argentino.joblib`. Son rutas del entorno donde se preparo el notebook, no rutas universales.

## 3. Datos de entrada y alcance

### 3.1 Estructura de `results.csv`

El archivo contiene estas columnas:

- `date_name`: nombre de competencia, fase, fecha o temporada. Por ejemplo, puede contener etiquetas como `Nacional 1976 - Grupo C`.
- `local_team_id` y `visitor_team_id`: identificadores de los clubes.
- `local_team` y `visitor_team`: nombres de los clubes.
- `local_result` y `visitor_result`: goles anotados por cada equipo.
- Una primera columna sin nombre, que funciona como indice exportado y no participa en el entrenamiento.

En el archivo revisado hay **32.854 filas**, sin celdas vacias en esas columnas, y 95 nombres distintos de clubes. Los goles locales observados van de 0 a 12 y los visitantes de 0 a 11.

El periodo 1931-2021 se obtiene de los años incluidos en `date_name`; no se encontro en el notebook una referencia bibliografica o URL que identifique la fuente original del dataset. Ademas, `date_name` no es una fecha calendario normalizada: representa nombres de torneos o temporadas. Por eso, el notebook no dispone de una fecha de partido fiable para hacer una separacion temporal rigurosa.

> **Trazabilidad pendiente:** agregar aqui el nombre, URL, licencia y fecha de descarga de la fuente original de `results.csv`. Esos datos no aparecen en los archivos revisados y no conviene inventarlos.

### 3.2 Resultado objetivo

El notebook compara los goles local y visitante y asigna una clase:

| Codigo | Clase | Regla |
|---:|---|---|
| `0` | Empate | Goles locales = goles visitantes |
| `1` | Victoria local | Goles locales > goles visitantes |
| `2` | Victoria visitante | Goles locales < goles visitantes |

En las 32.854 filas disponibles, la distribucion es:

| Resultado | Partidos | Proporcion aproximada |
|---|---:|---:|
| Victoria local | 15.200 | 46,27% |
| Empate | 9.470 | 28,83% |
| Victoria visitante | 8.184 | 24,91% |

La clase mayoritaria es victoria local. Un clasificador trivial que siempre eligiera esa clase obtendria alrededor de **46,27%** de accuracy sobre esta distribucion.

## 4. Como se construyen los perfiles de los equipos

Antes de entrenar, el notebook agrupa los partidos por equipo local y por equipo visitante, y consolida los resultados en una tabla de perfiles. Para cada club calcula, entre otras, estas cantidades:

- `pj_local`: partidos jugados como local.
- `victorias_local`: partidos ganados como local.
- `goles_favor_local`: goles anotados en casa.
- `goles_contra_local`: goles recibidos en casa.
- `pj_visitante`: partidos jugados como visitante.
- `derrotas_visitante`: partidos perdidos fuera de casa.
- `goles_favor_visitante`: goles anotados como visitante.
- `goles_contra_visitante`: goles recibidos como visitante.
- `partidos_totales`, goles totales a favor y goles totales en contra.
- Tasas y promedios calculados a partir de esos conteos.

La tabla se crea con un `outer merge` entre las estadisticas locales y visitantes; los conteos ausentes se reemplazan por cero. En los denominadores se suma `1e-5` para evitar una division por cero.

Algunos ejemplos de las formulas del notebook:

```text
efectividad_local_win =
    victorias_local / (pj_local + 1e-5)

efectividad_visitante_loss =
    derrotas_visitante / (pj_visitante + 1e-5)

promedio_goles_favor_local =
    goles_favor_local / (pj_local + 1e-5)

promedio_goles_contra_visitante =
    goles_contra_visitante / (pj_visitante + 1e-5)
```

`tabla_rendimiento_equipos.csv` es una exportacion ordenada alfabeticamente de esa tabla. `team_profiles_lookup.pkl` guarda la tabla indexada por nombre de equipo para que la API pueda consultarla.

## 5. Variables que ve el clasificador

Para cada partido se construye una fila con siete variables, siempre en este orden conceptual:

| Variable | Significado |
|---|---|
| `local_win_ratio` | Proporcion historica de victorias del equipo local en sus partidos de local. |
| `visitor_loss_ratio` | Proporcion historica de derrotas del visitante en sus partidos de visitante. |
| `goal_power_diff` | Promedio de goles anotados por el local en casa menos promedio de goles recibidos por el visitante fuera. |
| `avg_local_goals_scored` | Promedio de goles anotados por el local en casa. |
| `avg_local_goals_conceded` | Promedio de goles recibidos por el local en casa. |
| `avg_visitor_goals_scored` | Promedio de goles anotados por el visitante fuera. |
| `avg_visitor_goals_conceded` | Promedio de goles recibidos por el visitante fuera. |

El vector para un cruce se forma combinando el perfil local del primer club y el perfil visitante del segundo. En forma simplificada:

```text
X_partido = [
  victorias_local / partidos_local,
  derrotas_visitante / partidos_visitante,
  goles_local_promedio - goles_recibidos_visitante_promedio,
  goles_local_promedio,
  goles_recibidos_local_promedio,
  goles_visitante_promedio,
  goles_recibidos_visitante_promedio
]
```

No se aplica `StandardScaler` al modelo principal. Los bosques aleatorios no requieren que las variables tengan la misma escala.

### Que no recibe el modelo

El clasificador no recibe una fecha de partido, la temporada, la forma reciente, la alineacion, lesiones, sanciones, estadio especifico, clima, categoria del torneo ni cuotas. Las siete variables son perfiles agregados de equipo y son estaticas en la prediccion.

## 6. Entrenamiento

El notebook realiza las siguientes operaciones:

1. Lee `results.csv` con pandas.
2. Calcula la clase del resultado a partir de los goles.
3. Agrega estadisticas historicas por equipo.
4. Genera las siete variables predictoras para cada fila.
5. Separa variables (`X`) y objetivo (`y`).
6. Divide los datos con `train_test_split`, usando un 25% para prueba, `random_state=42` y `stratify=y`.
7. Entrena el clasificador:

```python
RandomForestClassifier(
    n_estimators=150,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)
```

Esto da 24.640 filas para entrenamiento y 8.214 para prueba. `stratify=y` mantiene aproximadamente la proporcion de las tres clases en ambos conjuntos. No se ve en el notebook una busqueda sistematica de hiperparametros ni validacion cruzada.

Un Random Forest combina muchos arboles de decision. Cada arbol aprende reglas sobre las siete variables; para clasificar, el bosque agrega sus resultados. `n_estimators=150` fija la cantidad de arboles, `max_depth=10` limita su profundidad, `random_state=42` hace repetible la particion y el entrenamiento, y `n_jobs=-1` permite usar los nucleos disponibles.

## 7. Evaluacion registrada en el notebook

El notebook muestra los siguientes resultados en su particion de prueba:

| Clase | Precision | Recall | F1 | Casos en prueba |
|---|---:|---:|---:|---:|
| Empate | 0,33 | 0,08 | 0,13 | 2.368 |
| Victoria local | 0,51 | 0,85 | 0,63 | 3.800 |
| Victoria visitante | 0,42 | 0,25 | 0,31 | 2.046 |
| **Promedio macro** | **0,42** | **0,39** | **0,36** | 8.214 |
| **Promedio ponderado** | **0,43** | **0,48** | **0,41** | 8.214 |

La accuracy global reportada es **48,00%**. El recall de empate es especialmente bajo: el modelo detecto solo alrededor del 8% de los empates del conjunto de prueba. La exactitud global oculta esa diferencia entre clases.

El notebook tambien genera una matriz de confusion y una grafica de importancia de variables por impureza Gini. Los valores numericos de esas importancias no quedaron impresos como tabla en el notebook, por lo que no se atribuyen pesos concretos en esta documentacion.

## 8. Limitacion critica: fuga de informacion

La evaluacion anterior no debe interpretarse como una prueba limpia de prediccion futura. En el notebook:

1. Los perfiles de los equipos se calculan con **todos** los partidos.
2. Despues se divide aleatoriamente cada fila entre entrenamiento y prueba.
3. Las variables del partido incluyen tasas calculadas a partir de resultados que tambien estan en el objetivo. Por ejemplo, `local_win_ratio` incluye victorias locales y `visitor_loss_ratio` incluye derrotas visitantes.

Por lo tanto, el resultado del propio partido de prueba puede contribuir a las variables que se usan para intentar predecirlo. Ademas, los perfiles contienen partidos posteriores al encuentro que se esta evaluando. Esto es **fuga de informacion (target leakage / look-ahead bias)** y puede distorsionar las metricas. El split aleatorio tampoco imita el uso real de entrenar con el pasado y predecir partidos futuros.

La accuracy del 48% es solo el resultado de esa evaluacion concreta, con esa preparacion de datos. No garantiza ese nivel de rendimiento en un campeonato futuro ni permite afirmar que las probabilidades esten calibradas.

## 9. Analisis exploratorio y clustering

El notebook incluye graficos de:

- distribucion historica de los tres resultados;
- distribucion de goles de locales y visitantes;
- matriz de confusion;
- importancia Gini de variables;
- correlaciones entre las siete variables;
- promedio de goles por año extraido de `date_name`;
- relacion entre `goal_power_diff` y resultado.

Tambien hay un analisis adicional de clubes con `StandardScaler` y `KMeans`:

- usa cuatro metricas de rendimiento;
- crea tres clusters con `random_state=42` y `n_init=10`;
- asigna etiquetas descriptivas como “Dominantes / Ofensivos”.

Ese clustering es exploratorio: **no se usa para entrenar el Random Forest ni para producir la prediccion del endpoint**. Los numeros de cluster son etiquetas arbitrarias del algoritmo; asignarles un nombre tactico no demuestra por si solo que ese perfil tenga esa interpretacion.

## 10. Como funciona una prediccion en la API

### Peticion

El endpoint es `POST /predict` y espera nombres de equipos:

```json
{
  "local_team": "Rosario Central",
  "visitor_team": "Newells"
}
```

### Flujo del servidor

1. FastAPI valida que existan `local_team` y `visitor_team` como cadenas.
2. `buscar_nombre_oficial` busca nombres que contengan el texto recibido, sin distinguir mayusculas de minusculas.
3. La API obtiene los perfiles de ambos equipos.
4. Calcula las siete variables con las mismas formulas usadas en el notebook.
5. Llama a `model.predict_proba(...)`.
6. Convierte las probabilidades a porcentajes y redondea a dos decimales.

En scikit-learn las clases del modelo estan ordenadas como `[0, 1, 2]`, es decir, `[empate, victoria local, victoria visitante]`. La API reasigna esas posiciones a los nombres correspondientes del JSON.

### Respuesta

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

Son porcentajes estimados por `predict_proba`, no certezas. El notebook no calibra las probabilidades con un conjunto separado ni informa curvas de calibracion, Brier score o log loss. Conviene mostrarlas como estimaciones del modelo y no como probabilidades garantizadas del resultado real.

### Resolucion de nombres

La busqueda actual usa coincidencia parcial y se queda con la primera coincidencia encontrada. Por eso, una entrada parcial o ambigua puede resolverse a otro club con un nombre parecido. La interfaz usa la lista exacta de los 95 clubes de `tabla_rendimiento_equipos.csv`, lo que reduce ese riesgo; la validacion definitiva del lado del servidor podria ser mas estricta.

## 11. Artefactos y compatibilidad

El notebook exporta dos archivos:

- `modelo_futbol_argentino.joblib`: objeto `RandomForestClassifier`.
- `team_profiles_lookup.pkl`: perfiles requeridos para crear las variables de cada peticion.

Ambos se cargan al iniciar `app.py`; no se suben en cada request. Deben estar disponibles en el directorio de trabajo del servidor.

Joblib y pickle serializan objetos ligados a versiones de Python y de sus bibliotecas. El notebook contiene una celda que genera un `requirements.txt` antiguo (`pandas==2.0.3`, `scikit-learn==1.2.2`) y no fija NumPy, pero los logs de despliegue observados identificaron el modelo serializado con scikit-learn **1.6.1** y mostraron una referencia a `numpy._core`, incompatible con NumPy 1.x. Por eso, ese `requirements.txt` generado por el notebook no es suficiente para reproducir los artefactos actuales.

Para reproducir o volver a entrenar:

- usa Python y versiones de NumPy, pandas y scikit-learn compatibles entre si;
- entrena y carga los artefactos con las mismas versiones, idealmente fijadas en un lockfile;
- registra `pip freeze`, version de Python, fecha, fuente y checksum de los datos junto al modelo;
- si cambian las dependencias, vuelve a generar los dos artefactos en ese entorno.

## 12. Limitaciones funcionales y estadisticas

- **Sin contexto del partido:** no incorpora actualidad, alineaciones, lesiones, torneo o temporada.
- **Perfiles de todo el periodo:** mezcla epocas distintas y no pondera mas los partidos recientes.
- **Fuga de informacion en la evaluacion:** los perfiles se preparan antes del split y usan resultados del conjunto de prueba.
- **Sin evaluacion temporal:** el split aleatorio no prueba el uso “pasado para predecir futuro”.
- **Resultados desbalanceados:** la clase de empate tiene recall muy bajo en la prueba reportada.
- **Probabilidades sin calibracion documentada:** el porcentaje no equivale necesariamente a una frecuencia observada bien calibrada.
- **Sin fuente identificada:** el archivo no incluye una cita verificable ni licencia de los datos.
- **Coincidencia parcial de nombres:** puede seleccionar el primer nombre que contenga una entrada ambigua.
- **Sin prediccion de marcador:** el modelo clasifica el resultado; no estima goles exactos.
- **Sin autenticacion ni limite de uso en la API revisada:** CORS permite origenes generales; para un servicio publico conviene restringir origenes y agregar controles operativos segun el uso.

## 13. Como mejorar la validez del modelo

Una siguiente version metodologicamente mas solida podria:

1. Obtener la fecha real de cada partido y ordenar cronologicamente los datos.
2. Separar train, validacion y test por periodos, sin mezclar temporadas futuras en el pasado.
3. Para cada partido, calcular las estadisticas del equipo solo con encuentros anteriores a ese partido; nunca incluir el resultado objetivo del propio partido.
4. Evaluar contra baselines simples, como predecir siempre la clase mayoritaria o usar solo la ventaja local.
5. Reportar macro F1, balanced accuracy, matriz de confusion, log loss, Brier score y calibracion, ademas de accuracy.
6. Considerar metricas recientes, competicion y fuerza de los rivales solo si estan disponibles antes del partido.
7. Ajustar hiperparametros y pesos de clase mediante validacion temporal, no sobre el conjunto final de prueba.
8. Reentrenar y volver a versionar juntos el modelo y los perfiles cada vez que cambian datos o codigo.

## 14. Resumen para comunicar el proyecto

> “El sistema utiliza un Random Forest entrenado con resultados historicos del futbol argentino entre 1931 y 2021. Para cada enfrentamiento combina siete estadisticas de rendimiento local y visitante y estima las probabilidades de victoria local, empate y victoria visitante. Es una herramienta exploratoria: no predice el marcador, no incorpora informacion actual del partido y sus metricas actuales estan afectadas por fuga de informacion en la preparacion del conjunto de prueba. Las probabilidades no garantizan el resultado.”
