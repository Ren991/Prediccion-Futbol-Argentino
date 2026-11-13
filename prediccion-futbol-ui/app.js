const API_URL = "https://prediccion-futbol-argentino.onrender.com/predict";

const clubs = [
  "Aldosivi",
  "All Boys",
  "Almagro",
  "Altos Hornos Zapla",
  "Alvarado",
  "Andino (LR)",
  "Arg de Firmat",
  "Argentinos",
  "Arsenal",
  "Atl Ledesma (J)",
  "Atl Rafaela",
  "Atl Tucuman",
  "Atl. Concepcion (T)",
  "Atlanta",
  "Banfield",
  "Bartolome Mitre (M)",
  "Belgrano",
  "Boca Juniors",
  "Central Cba (R)",
  "Central Cba (SdE)",
  "Central Norte (S)",
  "Chacarita",
  "Chaco For Ever",
  "Cipolletti",
  "Circulo Dep. (O)",
  "Colon",
  "Crucero (M)",
  "Def y Justicia",
  "Def. de Belgrano",
  "Dep Mandiyu (C)",
  "Dep. Armenio",
  "Dep. Español",
  "Dep. Moron",
  "Dep. Roca",
  "Desamparados",
  "Don Orione (CH)",
  "Estudiantes (BA)",
  "Estudiantes (LP)",
  "Estudiantes (RC)",
  "Estudiantes (SdE)",
  "Ferro",
  "Gimnasia (CdU)",
  "Gimnasia (J)",
  "Gimnasia (LP)",
  "Gimnasia (M)",
  "Gimnasia (S)",
  "Godoy Cruz",
  "Guarani (M)",
  "Huracan",
  "Huracan (C)",
  "Huracan (CR)",
  "Huracan (IW)",
  "Huracan (LH)",
  "Huracan (SR)",
  "Huracan (TA)",
  "Ind Rivadavia",
  "Independiente",
  "Instituto",
  "Jorge Newbery (J)",
  "Juv. Alianza (SJ)",
  "Juv. Antoniana",
  "Juv. Unida (SL)",
  "Kimberley (MdP)",
  "Lanus",
  "Loma Negra",
  "Los Andes",
  "Newells",
  "Nueva Chicago",
  "Olimpo",
  "Patronato",
  "Platense",
  "Quilmes",
  "Racing (C)",
  "Racing Club",
  "Renato Cesarini (R)",
  "River Plate",
  "Rosario Central",
  "San Lorenzo",
  "San Lorenzo (MdP)",
  "San Martin (M)",
  "San Martin (SJ)",
  "San Martin (T)",
  "San Telmo",
  "Santamarina",
  "Sarmiento (J)",
  "Sarmiento (R)",
  "Sp. Guzman (T)",
  "Sp. Italiano",
  "Talleres (C)",
  "Talleres (RdE)",
  "Temperley",
  "Tigre",
  "Tiro Federal (R)",
  "Union",
  "Velez"
];

const form = document.querySelector("#prediction-form");
const localInput = document.querySelector("#local-team");
const visitorInput = document.querySelector("#visitor-team");
const datalist = document.querySelector("#club-options");
const predictButton = document.querySelector("#predict-button");
const formMessage = document.querySelector("#form-message");
const results = document.querySelector("#results");
const infoDialog = document.querySelector("#info-dialog");

for (const club of clubs) {
  const option = document.createElement("option");
  option.value = club;
  datalist.append(option);
}

function findClub(value) {
  const normalized = value.trim().toLocaleLowerCase("es");
  return clubs.find((club) => club.toLocaleLowerCase("es") === normalized);
}

function showMessage(message) {
  formMessage.textContent = message;
}

function clearResult() {
  results.hidden = true;
  showMessage("");
}

function setProbability(prefix, value, caption) {
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("La API devolvió una probabilidad inválida. Probá de nuevo más tarde.");
  }

  document.querySelector(`#${prefix}-percent`).textContent = `${percentage.toFixed(2)}%`;
  document.querySelector(`#${prefix}-bar`).style.width = `${percentage}%`;
  if (caption) {
    document.querySelector(`#result-${prefix}`).textContent = caption;
  }
}

function displayPrediction(data) {
  const prediction = data.predictions;
  if (!prediction) {
    throw new Error("La respuesta de la API no incluye las predicciones esperadas.");
  }

  document.querySelector("#result-matchup").textContent = data.matchup;
  setProbability("local", prediction.local_win_percent, data.local_team);
  setProbability("draw", prediction.draw_percent);
  setProbability("visitor", prediction.visitor_win_percent, data.visitor_team);
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResult();

  const localTeam = findClub(localInput.value);
  const visitorTeam = findClub(visitorInput.value);

  if (!localTeam || !visitorTeam) {
    showMessage("Elegí los dos clubes de la lista de sugerencias para continuar.");
    return;
  }

  if (localTeam === visitorTeam) {
    showMessage("Elegí dos clubes distintos para armar el cruce.");
    return;
  }

  predictButton.disabled = true;
  predictButton.querySelector(".button-label").textContent = "Calculando...";
  showMessage("");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        local_team: localTeam,
        visitor_team: visitorTeam
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : `La API respondió con el estado ${response.status}.`;
      throw new Error(detail);
    }

    if (!data?.success) {
      throw new Error("La API no pudo generar la predicción para este cruce.");
    }

    displayPrediction(data);
  } catch (error) {
    showMessage(error instanceof TypeError
      ? "No se pudo conectar con la API. Revisá tu conexión e intentá de nuevo."
      : error.message);
  } finally {
    predictButton.disabled = false;
    predictButton.querySelector(".button-label").textContent = "Predecir resultado";
  }
});

for (const input of [localInput, visitorInput]) {
  input.addEventListener("input", clearResult);
}

document.querySelector("#swap-teams").addEventListener("click", () => {
  const localValue = localInput.value;
  localInput.value = visitorInput.value;
  visitorInput.value = localValue;
  clearResult();
});

document.querySelector("#open-info").addEventListener("click", () => infoDialog.showModal());
document.querySelector("#close-info").addEventListener("click", () => infoDialog.close());
document.querySelector("#done-info").addEventListener("click", () => infoDialog.close());

infoDialog.addEventListener("click", (event) => {
  if (event.target === infoDialog) {
    infoDialog.close();
  }
});
