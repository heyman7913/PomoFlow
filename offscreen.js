let model;
let video;
let stream;
let detectionInterval;

async function init() {
  console.log("[offscreen] Initializing...");

  video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.width = 320;
  video.height = 180;

  try {
    model = await blazeface.load();
    console.log("[offscreen] BlazeFace model loaded");

    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    console.log("[offscreen] Video playing...");

    startDetectionLoop();
  } catch (err) {
    console.error("[offscreen] Initialization error:", err);
  }
}

function startDetectionLoop() {
  console.log("[offscreen] Detection loop started");
  detectionInterval = setInterval(async () => {
    try {
      const predictions = await model.estimateFaces(video, false);
      if (predictions.length > 0) {
        console.log(`[offscreen] Face detected (${predictions.length})`);
        chrome.runtime.sendMessage({ type: "FACE_DETECTED" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[offscreen] Error sending FACE_DETECTED:", chrome.runtime.lastError.message);
          } else {
            console.log("[offscreen] FACE_DETECTED message sent successfully:", response);
          }
        });
      } else {
        console.log("[offscreen] No face detected");
        chrome.runtime.sendMessage({ type: "NO_FACE" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[offscreen] Error sending NO_FACE:", chrome.runtime.lastError.message);
          } else {
            console.log("[offscreen] NO_FACE message sent successfully:", response);
          }
        });
      }
    } catch (err) {
      console.error("[offscreen] Detection error:", err);
    }
  }, 1000);
}

// Cleanup function to stop camera and detection
function cleanup() {
  console.log("[offscreen] Cleaning up: stopping detection and releasing camera stream");
  if (detectionInterval) clearInterval(detectionInterval);
  if (video && video.srcObject) {
    let tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// Listen for offscreen document being closed
window.addEventListener('unload', cleanup);

init();
