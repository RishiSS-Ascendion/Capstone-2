// api.js - API calls and image generation logic (Hardened + fixed)
// IMPORTANT: Replace the placeholder with your Google Generative AI API key
const apiKey = "AIzaSyCzFC4fLcZDS-sp8f9bB0qZN26L9ZE_OyU"; // <-- replace with your key or load from config

// --- Configuration for Python Backend ---
const PYTHON_AGENT_URL = 'http://127.0.0.1:5001/api/auto-adjust'; // Midterm backend (port 5001)

// ------------------------------- Utility UI helpers -------------------------------
// NOTE: These DOM variables are expected to be defined in your HTML / other JS.
// messageBox, loadingIndicator, agentLoadingIndicator, generateBtn,
// autoAdjustBtn, downloadBtn, bgPromptArea, fgPromptArea, requestPngTransparency,
// bgImageElem, fgImageElem, doBlend(), and the slider inputs used later.
//
// displayMessage(message, type) - show an inline message and reset loaders
function displayMessage(message, type = 'error') {
  try {
    messageBox.textContent = message;
    messageBox.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    if (type === 'error') {
      messageBox.classList.add('bg-red-100', 'text-red-700');
    } else {
      messageBox.classList.add('bg-green-100', 'text-green-700');
    }
    loadingIndicator.classList.add('hidden');
    agentLoadingIndicator.classList.add('hidden');
    generateBtn.disabled = false;
    autoAdjustBtn.disabled = false;
  } catch (e) {
    // If UI elements are missing, at least log
    console.warn("displayMessage UI error:", e, message);
  }
}

// ---------------------------- Network helpers ------------------------------------
/**
 * Exponential-backoff fetch with basic retry handling.
 * Retries on network errors and on 429 responses only.
 */
async function exponentialBackoffFetch(url, options = {}, maxRetries = 5, initialDelay = 1000) {
  let delay = initialDelay;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = options.timeout || 30000; // default timeout 30s
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // If rate limited, retry. For other 4xx/5xx, return to caller to handle.
      if (res.status === 429) {
        // retry after delay
      } else {
        return res;
      }
    } catch (err) {
      // network error or abort -> retry
      if (attempt === maxRetries - 1) {
        throw new Error(`Request to ${url} failed after ${maxRetries} retries. Last error: ${err.message}`);
      }
    }
    // wait before next attempt
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  throw new Error(`Request to ${url} failed after ${maxRetries} retries.`);
}

/**
 * Safe JSON parse helper - returns null if not JSON
 */
async function tryParseJson(response) {
  try {
    return await response.json();
  } catch (e) {
    try {
      const text = await response.text();
      console.warn("Non-JSON response:", text.slice(0, 500));
    } catch (_e) {}
    return null;
  }
}

// ---------------------------- Image generation -----------------------------------
/**
 * Call Google generative image model and return a data URL (base64).
 * Assumes IMAGE_MODEL_NAME is defined elsewhere (main.js).
 */
async function fetchImageBase64(prompt) {
  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_API_KEY") {
    throw new Error("Please provide a valid API key in js/api.js (apiKey).");
  }
  if (typeof IMAGE_MODEL_NAME === 'undefined') {
    throw new Error("IMAGE_MODEL_NAME is not defined. Define it in main.js.");
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL_NAME}:predict?key=${apiKey}`;
  const payload = {
    instances: [{ prompt: prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1"
    }
  };

  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: 45000 // 45s per attempt (can be adjusted)
  };

  const response = await exponentialBackoffFetch(apiUrl, opts);
  if (!response.ok) {
    // Provide useful message
    const text = await response.text().catch(() => "");
    throw new Error(`Image API HTTP ${response.status}: ${text.substring(0, 400)}`);
  }

  const result = await response.json();
  const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;
  if (!base64Data) {
    console.error("Full response from image API:", JSON.stringify(result).slice(0,2000));
    throw new Error("No image bytes returned by the API.");
  }
  return `data:image/png;base64,${base64Data}`;
}

/**
 * Generate both background and foreground images using the prompts.
 * Keeps your original behaviour (adds background removal instruction to foreground prompt).
 */
async function generateImages() {
  const bgPrompt = bgPromptArea.value.trim();
  let fgPrompt = fgPromptArea.value.trim();

  if (!bgPrompt || !fgPrompt) {
    displayMessage("Please enter prompts for both background and foreground.", 'error');
    return;
  }

  let bgRemovalInstruction = ", centered subject, studio quality, with a pure white background.";
  if (requestPngTransparency && requestPngTransparency.checked) {
    bgRemovalInstruction += " with a transparent background in png";
  }
  fgPrompt = fgPrompt + bgRemovalInstruction;

  // UI state
  generateBtn.disabled = true;
  autoAdjustBtn.disabled = true;
  downloadBtn.disabled = true;
  loadingIndicator.classList.remove('hidden');
  messageBox.classList.add('hidden');

  try {
    // Start both requests in parallel with a global timeout
    const allPromise = Promise.all([fetchImageBase64(bgPrompt), fetchImageBase64(fgPrompt)]);
    const imgs = await Promise.race([
      allPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout: API request took too long.")), 60000))
    ]);

    // Assign images
    currentBgDataUrl = imgs[0];
    currentFgDataUrl = imgs[1];
    bgImageElem.src = currentBgDataUrl;
    fgImageElem.src = currentFgDataUrl;

    // Trigger blend (your existing function)
    if (typeof doBlend === 'function') doBlend();
    displayMessage("Images generated! Try Auto Adjust or tweak sliders.", 'success');
  } catch (err) {
    console.error("Image generation error:", err);
    if (err.message && err.message.includes("Timeout")) {
      displayMessage(err.message + " Try again later.");
    } else {
      displayMessage("Failed to generate images. " + err.message);
    }
    currentBgDataUrl = null;
    currentFgDataUrl = null;
    bgImageElem.src = "https://placehold.co/512x512/e0f2fe/0369a1?text=Generation+Failed";
    fgImageElem.src = "https://placehold.co/512x512/e0f2fe/0369a1?text=Generation+Failed";
  } finally {
    loadingIndicator.classList.add('hidden');
    autoAdjustBtn.disabled = (currentFgDataUrl === null);
    generateBtn.disabled = false;
  }
}

// ---------------------------- Auto-adjust / Agent call --------------------------------
/**
 * Auto-adjust: send images + prompt to Python backend which calls Gemini agent.
 */
async function autoAdjustForeground() {
  if (!currentFgDataUrl || !currentBgDataUrl) {
    displayMessage("Please generate both background and foreground images first.", 'error');
    return;
  }
  const agentPrompt = agentPromptArea.value.trim();
  if (!agentPrompt) {
    displayMessage("Please describe how you want to adjust the foreground.", 'error');
    return;
  }

  autoAdjustBtn.disabled = true;
  generateBtn.disabled = true;
  agentLoadingIndicator.classList.remove('hidden');
  messageBox.classList.add('hidden');

  const payload = {
    agentPrompt: agentPrompt,
    bgDataUrl: currentBgDataUrl,
    fgDataUrl: currentFgDataUrl
  };

  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: 30000
  };

  try {
    const response = await exponentialBackoffFetch(PYTHON_AGENT_URL, opts, 5);
    if (!response.ok) {
      // Try parse JSON error body
      const errBody = await tryParseJson(response) || { error: `Backend HTTP Error ${response.status}` };
      throw new Error(errBody.error || `Backend HTTP Error ${response.status}`);
    }

    const adjustments = await response.json();

    // Apply geometric adjustments safely (keep existing value if undefined)
    fgX.value = (typeof adjustments.xPos !== 'undefined') ? adjustments.xPos : fgX.value;
    document.getElementById('fgXValue').textContent = fgX.value;

    fgY.value = (typeof adjustments.yPos !== 'undefined') ? adjustments.yPos : fgY.value;
    document.getElementById('fgYValue').textContent = fgY.value;

    fgScale.value = (typeof adjustments.scaleFactor !== 'undefined') ? adjustments.scaleFactor : fgScale.value;
    document.getElementById('fgScaleValue').textContent = fgScale.value;

    fgRotation.value = (typeof adjustments.rotationDegrees !== 'undefined') ? adjustments.rotationDegrees : fgRotation.value;
    document.getElementById('fgRotationValue').textContent = fgRotation.value;

    fgSkewX.value = (typeof adjustments.skewX !== 'undefined') ? adjustments.skewX : fgSkewX.value;
    document.getElementById('fgSkewXValue').textContent = fgSkewX.value;

    fgSkewY.value = (typeof adjustments.skewY !== 'undefined') ? adjustments.skewY : fgSkewY.value;
    document.getElementById('fgSkewYValue').textContent = fgSkewY.value;

    // Luminosity adjustments
    fgBrightness.value = (typeof adjustments.brightness !== 'undefined') ? adjustments.brightness : fgBrightness.value;
    document.getElementById('fgBrightnessValue').textContent = fgBrightness.value + '%';

    fgContrast.value = (typeof adjustments.contrast !== 'undefined') ? adjustments.contrast : fgContrast.value;
    document.getElementById('fgContrastValue').textContent = fgContrast.value + '%';

    // Color adjustments
    fgSaturation.value = (typeof adjustments.saturation !== 'undefined') ? adjustments.saturation : fgSaturation.value;
    document.getElementById('fgSaturationValue').textContent = fgSaturation.value + '%';

    fgHue.value = (typeof adjustments.hue !== 'undefined') ? adjustments.hue : fgHue.value;
    document.getElementById('fgHueValue').textContent = fgHue.value + '°';

    // Re-blend using your existing function
    if (typeof doBlend === 'function') doBlend();

    displayMessage("Agent applied adjustments via Python backend.", 'success');
  } catch (err) {
    console.error("Agent error:", err);
    displayMessage("Agent adjustment failed. " + err.message);
  } finally {
    agentLoadingIndicator.classList.add('hidden');
    autoAdjustBtn.disabled = false;
    generateBtn.disabled = false;
  }
}

// Export functions if you use module bundlers (optional)
window.generateImages = generateImages;
window.autoAdjustForeground = autoAdjustForeground;
