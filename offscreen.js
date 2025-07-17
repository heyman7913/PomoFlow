let model;
let video;

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

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
  setInterval(async () => {
    try {
      const predictions = await model.estimateFaces(video, false);
      if (predictions.length > 0) {
        console.log(`Face detected (${predictions.length})`);
        chrome.runtime.sendMessage({ type: "FACE_DETECTED" });
      } else {
        console.log("No face detected");
        chrome.runtime.sendMessage({ type: "NO_FACE" });
      }
    } catch (err) {
      console.error("[offscreen] Detection error:", err);
    }
  }, 1000);
}

init();
