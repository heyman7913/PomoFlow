let button = document.getElementById("requestPermission");
let video = document.getElementById("video");


button.addEventListener("click", (e) => {
  console.log("Function called: requestPermissions");
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (navigator.getUserMedia) {
    navigator.getUserMedia(
      { audio: false, video:  true},
      (stream) => {
        console.log("Successfully got user media stream");
        video.srcObject = stream;
        video.width = 320;   // Set desired width
        video.height = 180;  // Set desired height
        video.play();


      },
      (err) => {
        console.error("Error getting user media stream: ", err);
      }
    );
} else {
    console.error("getUserMedia is not supported in this browser.");
}
});