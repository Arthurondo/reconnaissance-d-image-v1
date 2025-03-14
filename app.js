let model;
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const startBtn = document.getElementById("start-camera");
const stopBtn = document.getElementById("stop-camera");
const captureBtn = document.getElementById("capture-photo");
const saveBtn = document.getElementById("save-coordinates");

let stream = null;
let detecting = false;
let lastPredictions = [];

// Charger le modèle
async function loadModel() {
    statusText.textContent = "Chargement du modèle...";
    try {
        model = await cocoSsd.load();
        statusText.textContent = "Modèle chargé ✅";
    } catch (error) {
        console.error("Erreur chargement modèle :", error);
        statusText.textContent = "Erreur chargement modèle ❌";
    }
}

// Activer la caméra
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            detecting = true;
            detectObjects();
            enableButtons();
        };
    } catch (error) {
        console.error("Erreur accès caméra :", error);
        statusText.textContent = "Erreur accès caméra ❌ Vérifie les permissions.";
    }
}

// Désactiver la caméra
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        detecting = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusText.textContent = "Caméra désactivée.";
        disableButtons();
    }
}

// Activer/désactiver les boutons
function enableButtons() {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    captureBtn.disabled = false;
    saveBtn.disabled = false;
}

function disableButtons() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    captureBtn.disabled = true;
    saveBtn.disabled = true;
}

// Fonction pour capturer une photo avec les objets détectés
function capturePhoto(predictions) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    predictions.forEach(pred => {
        const [x, y, width, height] = pred.bbox;

        // Dessiner le contour
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        // Ajouter l'étiquette et les coordonnées
        ctx.fillStyle = "red";
        ctx.font = "16px Arial";
        const text = `${pred.class} (${Math.round(x)}, ${Math.round(y)})`;
        ctx.fillRect(x, y - 20, ctx.measureText(text).width + 10, 20);
        ctx.fillStyle = "white";
        ctx.fillText(text, x + 5, y - 5);
    });

    // Télécharger l'image annotée
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "objet_detecte.png";
    link.click();
}

// Fonction pour sauvegarder les coordonnées en JSON
function saveCoordinates() {
    if (lastPredictions.length === 0) return;

    const data = lastPredictions.map(pred => ({
        objet: pred.class,
        x: Math.round(pred.bbox[0]),
        y: Math.round(pred.bbox[1]),
        largeur: Math.round(pred.bbox[2]),
        hauteur: Math.round(pred.bbox[3])
    }));

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "coordonnees.json";
    link.click();
}

// Détection des objets
async function detectObjects() {
    if (!model || !detecting) return;

    requestAnimationFrame(detectObjects);
    lastPredictions = await model.detect(video);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    lastPredictions.forEach(pred => {
        const [x, y, width, height] = pred.bbox;

        // Dessiner le rectangle autour de l'objet
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        // Ajouter l'étiquette avec les coordonnées
        ctx.fillStyle = "red";
        ctx.font = "16px Arial";
        const text = `${pred.class} (${Math.round(x)}, ${Math.round(y)})`;
        ctx.fillRect(x, y - 20, ctx.measureText(text).width + 10, 20);
        ctx.fillStyle = "white";
        ctx.fillText(text, x + 5, y - 5);
    });

    statusText.textContent = `Objets détectés : ${lastPredictions.length}`;

    // Activer la sauvegarde des coordonnées après détection
    saveBtn.disabled = false;
}

// Ajouter les événements aux boutons
startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
saveBtn.addEventListener("click", saveCoordinates);

// Charger le modèle dès le démarrage
loadModel();
