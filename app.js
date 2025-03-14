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
let objectTrackingData = [];

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

// Fonction pour sauvegarder les coordonnées successives des objets
function saveCoordinates() {
    if (objectTrackingData.length === 0) return;

    const json = JSON.stringify(objectTrackingData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "object_tracking.json";
    link.click();
}

// Détection des objets
async function detectObjects() {
    if (!model || !detecting) return;

    requestAnimationFrame(detectObjects);
    const predictions = await model.detect(video);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    predictions.forEach(pred => {
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

        // Enregistrer les coordonnées de tous les objets détectés
        objectTrackingData.push({
            timestamp: new Date().toISOString(),
            objet: pred.class,
            x: Math.round(x),
            y: Math.round(y),
            largeur: Math.round(width),
            hauteur: Math.round(height)
        });
    });

    statusText.textContent = `Objets détectés : ${predictions.length}`;

    // Activer la sauvegarde des coordonnées après détection
    saveBtn.disabled = false;
}

// Ajouter les événements aux boutons
startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
saveBtn.addEventListener("click", saveCoordinates);

// Charger le modèle dès le démarrage
loadModel();
