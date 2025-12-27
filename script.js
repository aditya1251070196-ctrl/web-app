// Register service worker (optional for caching other assets)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(function() { console.log("Service Worker registered"); })
    .catch(function(err) { console.error("Service Worker registration failed:", err); });

}
tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);

let model = null;

// =====================================================
// Load model (always fresh, no browser cache)
// =====================================================
async function loadModel() {
  model = await tf.loadLayersModel("./model/model.json");
  console.log("Model Loaded");
  return model;
}


// =====================================================
// Handle image preview (file upload)
// =====================================================
document.getElementById("imageInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    document.getElementById("preview").src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// =====================================================
// Crop helper (matches training logic)
// =====================================================
function cropCenterToCanvas(source, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const sw = source.videoWidth || source.width;
  const sh = source.videoHeight || source.height;

  const r = Math.min(sw, sh);
  const sx = (sw - r) / 2;
  const sy = (sh - r) / 2;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(source, sx, sy, r, r, 0, 0, size, size);

  return canvas;
}

// =====================================================
// Prediction with threshold
// =====================================================
async function runPrediction(imgElement) {
  if (!model) await loadModel();

  let tensor = tf.browser.fromPixels(imgElement)
    .resizeBilinear([64, 64])
    .toFloat()
    .div(255)
    .expandDims(0);

  const output = model.predict(tensor);
  const data = await output.data();

  const dataArr = Array.from(data);
  const maxScore = Math.max(...dataArr);
  const index = dataArr.indexOf(maxScore);

  const labelsResponse = await fetch("./model/labels.json");
const labels = await labelsResponse.json();


  const threshold = 0.6;
  let predictionText;
  if (maxScore < threshold) {
    predictionText = "Prediction: unknown object";
  } else {
    predictionText = `Prediction: ${labels[index]} (score: ${maxScore.toFixed(3)})`;
  }

  document.getElementById("result").innerText = predictionText;

  tensor.dispose();
  output.dispose();
}

// =====================================================
// Detect button handler (works for file or camera)
// =====================================================
function predict() {
  const preview = document.getElementById("preview");

  if (!preview.src || preview.src.length < 10) {
    alert("Select or capture an image first!");
    return;
  }

  runPrediction(preview);
}

// =====================================================
// Camera support
// =====================================================
const video = document.getElementById("video");

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    alert("Camera access failed");
    console.error(err);
  }
}

function captureImage() {
  if (!video.videoWidth) {
    alert("Camera not ready");
    return;
  }

  const croppedCanvas = cropCenterToCanvas(video, 64);
  const dataURL = croppedCanvas.toDataURL("image/png");

  const preview = document.getElementById("preview");
  preview.src = dataURL;
}

function stopCamera() {
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
    console.log("Camera stopped");
  }
}

function refreshPage() {
  window.location.reload();
}

function clearInput() {
  document.getElementById("imageInput").value = "";
  document.getElementById("preview").src = "";
  document.getElementById("result").innerText = "";
}

// =====================================================
// Expose functions to HTML buttons
// =====================================================
window.startCamera = startCamera;
window.captureImage = captureImage;
window.predict = predict;
window.clearInput = clearInput;
window.stopCamera = stopCamera;
window.refreshPage = refreshPage;




