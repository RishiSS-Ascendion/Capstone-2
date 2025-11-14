

    // --- API & Utility Globals ---
    // If testing locally, replace this empty string with your actual Gemini API key.
    const apiKey = "AIzaSyCzFC4fLcZDS-sp8f9bB0qZN26L9ZE_OyU"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
    const model = "gemini-2.5-flash-image-preview";

    // --- DOM Elements ---
    const imageUpload = document.getElementById('image-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const promptInput = document.getElementById('prompt');
    const generateBtn = document.getElementById('generate-btn');
    const resultImg = document.getElementById('result-img');
    const downloadBtn = document.getElementById('download-btn');
    const statusMessage = document.getElementById('status-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // Size Controls
    const reduceSizeBtn = document.getElementById('reduce-size-btn');
    const enlargeSizeBtn = document.getElementById('enlarge-size-btn');
    const zoomStatus = document.getElementById('zoom-status');

    const imageCanvas = document.getElementById('imageCanvas');
    const ctxImage = imageCanvas.getContext('2d');

    // --- Canvas State ---
    let originalImage = null; 
    
    // State for image drawing calculation
    let initialImgW = 0;
    let initialImgH = 0;
    let currentZoomFactor = 1.0;
    const MIN_ZOOM = 0.2; // 20%
    const MAX_ZOOM = 1.0; // 100%
    const ZOOM_STEP = 0.1;

    // The fixed internal resolution for the API payload
    const CANVAS_SIZE = 1024; 
    imageCanvas.width = CANVAS_SIZE;
    imageCanvas.height = CANVAS_SIZE;

    // Set initial background for image canvas to black
    ctxImage.fillStyle = '#000000';
    ctxImage.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // --- Utility Functions ---

    /**
     * Displays status messages to the user.
     */
    function setStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = 'mt-4 p-3 text-center text-sm rounded-lg transition-all duration-300'; // Reset classes
        if (type === 'error') {
            statusMessage.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-400');
        } else if (type === 'success') {
            statusMessage.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-400');
        } else {
            statusMessage.classList.add('bg-blue-100', 'text-blue-700', 'border', 'border-blue-400');
        }
    }

    /**
     * Enables/Disables the main action button and controls.
     */
    function setLoadingState(isLoading) {
        generateBtn.disabled = isLoading || !originalImage || !promptInput.value.trim();
        downloadBtn.disabled = isLoading || resultImg.src.includes('placehold.co');
        reduceSizeBtn.disabled = isLoading || !originalImage || (currentZoomFactor <= MIN_ZOOM);
        enlargeSizeBtn.disabled = isLoading || !originalImage || (currentZoomFactor >= MAX_ZOOM);
        
        loadingSpinner.classList.toggle('hidden', !isLoading);
        generateBtn.innerHTML = isLoading
            ? `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...`
            : 'Start Generation';

        imageUpload.disabled = isLoading;
        promptInput.disabled = isLoading;
    }

    /**
     * Redraws the image on the canvas based on the current zoom factor.
     */
    function redrawImage() {
        if (!originalImage) return;

        // Clear the canvas and set black background
        ctxImage.fillStyle = '#000000';
        ctxImage.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Calculate new dimensions and position
        const newW = initialImgW * currentZoomFactor;
        const newH = initialImgH * currentZoomFactor;
        const newX = (CANVAS_SIZE / 2) - (newW / 2);
        const newY = (CANVAS_SIZE / 2) - (newH / 2);

        // Draw the image
        ctxImage.drawImage(originalImage, newX, newY, newW, newH);

        // Update status text and controls
        zoomStatus.textContent = `Current Zoom: ${(currentZoomFactor * 100).toFixed(0)}%`;
        setLoadingState(false);
    }

    // --- Event Listeners ---
    
    // Enable/disable Generate button based on prompt content
    promptInput.addEventListener('input', () => {
        setLoadingState(false);
    });

    // --- Image Loading and Resizing ---

    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            fileNameDisplay.textContent = 'No file selected.';
            originalImage = null;
            currentZoomFactor = MAX_ZOOM;
            setLoadingState(false);
            return;
        }

        fileNameDisplay.textContent = `File: ${file.name}`;
        setStatus('Image loaded. Now enter a descriptive prompt and generate.');

        const img = new Image();
        img.onload = () => {
            originalImage = img;
            currentZoomFactor = MAX_ZOOM; // Reset zoom to max upon new upload
            resultImg.src = "https://placehold.co/512x512/d1d5db/374151?text=Generated+Result"; // Reset result image

            // Calculate the initial maximum dimensions (100% zoom)
            let imgW = originalImage.width;
            let imgH = originalImage.height;
            const maxSize = 768; // Max size to fit within the 1024x1024 frame

            if (imgW > maxSize || imgH > maxSize) {
                if (imgW > imgH) {
                    imgH = imgH * (maxSize / imgW);
                    imgW = maxSize;
                } else {
                    imgW = imgW * (maxSize / imgH);
                    imgH = maxSize;
                }
            }
            
            // Store initial dimensions and position for subsequent zoom calculations
            initialImgW = imgW;
            initialImgH = imgH;

            redrawImage(); // Draw image at 100% zoom
            setLoadingState(false);
        };
        img.onerror = () => {
            setStatus('Failed to load image.', 'error');
            originalImage = null;
            setLoadingState(false);
        };
        img.src = URL.createObjectURL(file);
    });
    
    // --- Size Adjustment Handlers ---
    reduceSizeBtn.addEventListener('click', () => {
        if (currentZoomFactor > MIN_ZOOM) {
            currentZoomFactor = Math.max(MIN_ZOOM, currentZoomFactor - ZOOM_STEP);
            currentZoomFactor = parseFloat(currentZoomFactor.toFixed(1)); // Fix floating point errors
            redrawImage();
        }
    });

    enlargeSizeBtn.addEventListener('click', () => {
        if (currentZoomFactor < MAX_ZOOM) {
            currentZoomFactor = Math.min(MAX_ZOOM, currentZoomFactor + ZOOM_STEP);
            currentZoomFactor = parseFloat(currentZoomFactor.toFixed(1)); // Fix floating point errors
            redrawImage();
        }
    });

    // --- API Interaction Logic ---

    /**
     * Performs the API call to generate the image.
     */
    async function generateImage() {
        if (!originalImage) {
            setStatus('Please upload an image first.', 'error');
            return;
        }

        const currentPrompt = promptInput.value.trim();
        if (!currentPrompt) {
            setStatus('Please enter a descriptive prompt.', 'error');
            return;
        }

        setLoadingState(true);
        setStatus('Sending base image and prompt to AI for generation. This may take a moment...', 'info');

        // 1. Get Base64 of the current image on the canvas
        const imageBase64 = imageCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        
        const requestPayload = {
            contents: [{
                parts: [
                    { text: currentPrompt },
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"]
            },
        };

        // Implementation of Exponential Backoff for API calls
        const maxRetries = 5;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API returned status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
                }

                const result = await response.json();
                const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

                if (!base64Data) {
                    throw new Error('API response missing image data.');
                }

                const imageUrl = `data:image/png;base64,${base64Data}`;
                resultImg.src = imageUrl;
                setStatus('Image generated successfully! Check the result below.', 'success');
                setLoadingState(false);
                return; // Exit loop on success

            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed:`, error);
                if (attempt === maxRetries - 1) {
                    setStatus(`Final attempt failed. Could not generate image: ${error.message}`, 'error');
                    setLoadingState(false);
                    return;
                }
                const delay = Math.pow(2, attempt) * 1000 + (Math.random() * 1000); // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            }
        }
    }

    generateBtn.addEventListener('click', generateImage);

    // --- Download Image Logic ---
    downloadBtn.addEventListener('click', () => {
        const imageUrl = resultImg.src;
        if (imageUrl && !imageUrl.includes('placehold.co')) {
            const a = document.createElement('a');
            a.href = imageUrl;
            const now = new Date();
            const timestamp = now.getFullYear().toString() + 
                              (now.getMonth() + 1).toString().padStart(2, '0') + 
                              now.getDate().toString().padStart(2, '0') + '-' +
                              now.getHours().toString().padStart(2, '0') +
                              now.getMinutes().toString().padStart(2, '0') +
                              now.getSeconds().toString().padStart(2, '0');
            a.download = `ai-generated-image-${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setStatus('Image downloaded!', 'info');
        } else {
            setStatus('No image to download yet. Generate one first!', 'error');
        }
    });

    // Initial state update
    setStatus('Please upload an image to begin.');
    setLoadingState(false);
    downloadBtn.disabled = true;

// Common loader: run on every page that can receive shared images
document.addEventListener("DOMContentLoaded", () => {
  const sharedImg = localStorage.getItem("sharedImage");
  if (!sharedImg) return;

  // draw it in whichever canvas exists on this page
  const canvas = document.getElementById("imageCanvas") || document.getElementById("mainCanvas");
  const ctx = canvas?.getContext("2d");
  const img = new Image();

  img.onload = () => {
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    // mimic upload logic for that page
    window.originalImage = img;
    window.imageLoaded = true;
    document.querySelectorAll("button, input, textarea").forEach(el => el.disabled = false);

    const status = document.getElementById("status-message") || document.getElementById("status");
    if (status) status.textContent = "✅ Image received — ready to use tools.";
  };

  img.src = sharedImg;
  localStorage.removeItem("sharedImage");
});


// Push image to Segmenter
function pushToSegmenter() {
  const resultImg = document.getElementById("result-img");
  if (!resultImg.src || resultImg.src.includes("placehold.co")) {
    alert("Generate or upload an image first!");
    return;
  }
  localStorage.setItem("sharedImage", resultImg.src);
  window.location.href = "segmenter.html";
}




 