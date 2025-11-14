// blending.js - canvas blending, chroma removal, download

/**
 * Remove a solid background by sampling top-left pixel and making pixels within tolerance transparent.
 * tempCtx must be a 2D context sized IMAGE_SIZE x IMAGE_SIZE
 */
function removeSolidBackground(tempCtx, tolerance) {
  const imageData = tempCtx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const data = imageData.data;
  const targetR = data[0], targetG = data[1], targetB = data[2];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
    if (diff < tolerance) data[i + 3] = 0;
  }
  tempCtx.putImageData(imageData, 0, 0);
}

/**
 * Core blend routine. Reads global control values and draws background + processed foreground.
 */
function doBlend() {
  if (!currentBgDataUrl || !currentFgDataUrl) return;
  messageBox.classList.add('hidden');

  const xPos = parseInt(fgX.value);
  const yPos = parseInt(fgY.value);
  const scaleFactor = parseFloat(fgScale.value);
  const skewXVal = parseFloat(fgSkewX.value);
  const skewYVal = parseFloat(fgSkewY.value);
  const rotationDegrees = parseInt(fgRotation.value);
  const rotationRadians = rotationDegrees * (Math.PI / 180);
  const blendMode = blendModeSelect.value;
  const opacity = parseFloat(opacitySlider.value);
  const autoRemoveBg = autoRemoveBgCheckbox.checked;
  const tolerance = parseInt(toleranceSlider.value);
  const mirror = fgMirror.checked;

  const brightness = fgBrightness.value + '%';
  const contrast = fgContrast.value + '%';
  const saturation = fgSaturation.value + '%';
  const hue = fgHue.value + 'deg';

  blendedCanvas.width = IMAGE_SIZE;
  blendedCanvas.height = IMAGE_SIZE;

  const bgImg = new Image();
  bgImg.crossOrigin = "anonymous";
  bgImg.onload = () => {
    // Clear
    ctx.clearRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(bgImg, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

    // Foreground
    const fgImg = new Image();
    fgImg.crossOrigin = "anonymous";
    fgImg.onload = () => {
      // Temporary canvas for filters & chroma key
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = IMAGE_SIZE;
      tempCanvas.height = IMAGE_SIZE;
      const tempCtx = tempCanvas.getContext('2d');

      // Apply CSS-like filters on drawing (brightness/contrast/etc)
      tempCtx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue})`;
      tempCtx.drawImage(fgImg, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

      // Remove background if requested
      if (autoRemoveBg) {
        tempCtx.filter = 'none';
        removeSolidBackground(tempCtx, tolerance);
      }

      // Now composite processed image onto main canvas with transforms
      ctx.save();

      const finalScaleX = scaleFactor * (mirror ? -1 : 1);
      const finalScaleY = scaleFactor;

      // setTransform(a,b,c,d,e,f) corresponds to matrix:
      // [a c e]
      // [b d f]
      // [0 0 1]
      ctx.setTransform(finalScaleX, skewYVal, skewXVal, finalScaleY, xPos, yPos);
      ctx.rotate(rotationRadians);

      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = blendMode;

      const half = IMAGE_SIZE / 2;
      ctx.drawImage(tempCanvas, -half, -half, IMAGE_SIZE, IMAGE_SIZE);

      ctx.restore();

      downloadBtn.disabled = false;
    };
    fgImg.src = currentFgDataUrl;
  };
  bgImg.src = currentBgDataUrl;
}

/**
 * Exports blended canvas to PNG and triggers download.
 */
function downloadImage() {
  if (!currentBgDataUrl || !currentFgDataUrl) {
    displayMessage("Please generate and blend images first.", 'error');
    return;
  }
  const dataUrl = blendedCanvas.toDataURL("image/png");
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `blended_ai_image_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}