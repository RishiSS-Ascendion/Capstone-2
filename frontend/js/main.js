// main.js - global variables & initialization
// NOTE: Variables are intentionally 'var' to make them global across other non-module JS files.

var IMAGE_SIZE = 512;

// DOM elements (these are global)
var bgImageElem = document.getElementById('bgImage');
var fgImageElem = document.getElementById('fgImage');
var blendedCanvas = document.getElementById('blendedCanvas');
var messageBox = document.getElementById('messageBox');

var blendModeSelect = document.getElementById('blendMode');
var opacitySlider = document.getElementById('opacitySlider');
var generateBtn = document.getElementById('generateBtn');
var autoAdjustBtn = document.getElementById('autoAdjustBtn');
var downloadBtn = document.getElementById('downloadBtn');

var loadingIndicator = document.getElementById('loadingIndicator');
var agentLoadingIndicator = document.getElementById('agentLoadingIndicator');

var autoRemoveBgCheckbox = document.getElementById('autoRemoveBg');
var toleranceSlider = document.getElementById('toleranceSlider');
var requestPngTransparency = document.getElementById('requestPngTransparency');

var fgRotation = document.getElementById('fgRotation');
var fgMirror = document.getElementById('fgMirror');
var fgBrightness = document.getElementById('fgBrightness');
var fgContrast = document.getElementById('fgContrast');
var fgSaturation = document.getElementById('fgSaturation');
var fgHue = document.getElementById('fgHue');
var fgSkewX = document.getElementById('fgSkewX');
var fgSkewY = document.getElementById('fgSkewY');

var bgPromptArea = document.getElementById('bgPrompt');
var fgPromptArea = document.getElementById('fgPrompt');
var agentPromptArea = document.getElementById('agentPrompt');
var fgX = document.getElementById('fgX');
var fgY = document.getElementById('fgY');
var fgScale = document.getElementById('fgScale');

var ctx = blendedCanvas.getContext('2d');

// State for current generated images (data URLs)
var currentBgDataUrl = null;
var currentFgDataUrl = null;

// Model names (change if you need)
var IMAGE_MODEL_NAME = 'imagen-4.0-generate-001';
// var AGENT_MODEL_NAME = 'gemini-2.5-flash-preview-05-20'; // Removed: Now defined in Python backend

// Initialize UI
window.addEventListener('load', function() {
  // Start with agent disabled until images are generated
  autoAdjustBtn.disabled = true;

  // Wire top-level buttons to functions defined in api.js / blending.js
  generateBtn.addEventListener('click', generateImages);
  autoAdjustBtn.addEventListener('click', autoAdjustForeground);
  downloadBtn.addEventListener('click', downloadImage);

  async function pushToSegmenterFromGenerator() {
  const canvas = document.getElementById("blendedCanvas");
  if (!canvas) return alert("No image to send!");
  const imgData = canvas.toDataURL("image/png");
  localStorage.setItem("sharedImage", imgData);
  window.location.href = "segmenter.html";
}

// ---- Push to Enhancer (new / fixed) ----
async function pushToEnhancerFromGenerator() {
  const canvas = document.getElementById("blendedCanvas");
  if (!canvas) return alert("No image to send!");
  const imgData = canvas.toDataURL("image/png");
  localStorage.setItem("sharedImage", imgData);
  window.location.href = "enhancer.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const sharedImg = localStorage.getItem("sharedImage");
  if (!sharedImg) return;

  const imageCanvas = document.getElementById("imageCanvas");
  const ctxImage = imageCanvas.getContext("2d");
  const genBtn = document.getElementById("generate-btn");
  const statusMsg = document.getElementById("status-message");

  const img = new Image();
  img.onload = () => {
    // draw on canvas
    ctxImage.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    const scale = Math.min(
      imageCanvas.width / img.width,
      imageCanvas.height / img.height
    );
    const x = (imageCanvas.width - img.width * scale) / 2;
    const y = (imageCanvas.height - img.height * scale) / 2;
    ctxImage.drawImage(img, x, y, img.width * scale, img.height * scale);

    // 🧠 Pretend upload logic ran
    window.originalImage = img;
    window.imageLoaded = true;
    window.currentZoomFactor = 1.0;

    // ✅ Enable generate + tools
    if (genBtn) genBtn.disabled = false;
    document.querySelectorAll("button, input[type='range']")
      .forEach(el => el.disabled = false);

    // ✅ Trigger same internal setup as upload if defined
    if (typeof window.initializeEnhancer === "function") {
      window.initializeEnhancer(img);
    }

    // ✅ Update UI
    if (statusMsg) {
      statusMsg.textContent = "✅ Image received — ready to enhance.";
      statusMsg.style.color = "#10b981";
    }

    console.log("Shared image loaded successfully. Generate button activated.");
  };

  img.src = sharedImg;
  localStorage.removeItem("sharedImage");
});


    function pushToSegmenterFromGenerator() {
  const canvas = document.getElementById("blendedCanvas");
  if (!canvas) return alert("No image found to send!");
  const imgData = canvas.toDataURL("image/png");
  localStorage.setItem("sharedImage", imgData);
  window.location.href = "segmenter.html";
}

async function prepareImageForEnhancer(e) {
  const canvas = document.getElementById("blendedCanvas");
  if (!canvas) {
    alert("No generated image found to send!");
    e.preventDefault();
    return;
  }

  try {
    const imgData = canvas.toDataURL("image/png");
    localStorage.setItem("sharedImage", imgData);
    console.log("Image stored for enhancer.");
    // ✅ Relative redirect
    window.location.href = "enhancer.html";
  } catch (err) {
    console.error("Error preparing image:", err);
    alert("Unable to prepare image for enhancer.");
    e.preventDefault();
  }
}





});