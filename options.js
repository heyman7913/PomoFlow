const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const statusText = document.getElementById("status");

let model;

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  statusText.textContent = "Loading model...";
  model = await blazeface.load(); // global from the bundle
  statusText.textContent = "Model loaded. Starting camera...";

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.addEventListener("loadeddata", () => {
    detectLoop();
  });
});

async function detectLoop() {
  const prediction = await model.estimateFaces(video, false);

  if (prediction.length > 0) {
    statusText.textContent = `Face Detected (${prediction.length})`;
  } else {
    statusText.textContent = "No face detected";
  }

  requestAnimationFrame(detectLoop);
}
