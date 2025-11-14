// controls.js - wire slider and control UI updates to doBlend and other UI functions

// Utility to update text labels and call doBlend if images present
function safeDoBlend() {
  if (currentBgDataUrl && currentFgDataUrl) doBlend();
}

// Bind slider change handlers and display values
fgX.oninput = function() {
  document.getElementById('fgXValue').textContent = this.value;
  safeDoBlend();
};
fgY.oninput = function() {
  document.getElementById('fgYValue').textContent = this.value;
  safeDoBlend();
};
fgScale.oninput = function() {
  document.getElementById('fgScaleValue').textContent = this.value;
  safeDoBlend();
};
fgRotation.oninput = function() {
  document.getElementById('fgRotationValue').textContent = this.value;
  safeDoBlend();
};
fgSkewX.oninput = function() {
  document.getElementById('fgSkewXValue').textContent = this.value;
  safeDoBlend();
};
fgSkewY.oninput = function() {
  document.getElementById('fgSkewYValue').textContent = this.value;
  safeDoBlend();
};
opacitySlider.oninput = function() {
  document.getElementById('opacityValue').textContent = this.value;
  safeDoBlend();
};
fgBrightness.oninput = function() {
  document.getElementById('fgBrightnessValue').textContent = this.value + '%';
  safeDoBlend();
};
fgContrast.oninput = function() {
  document.getElementById('fgContrastValue').textContent = this.value + '%';
  safeDoBlend();
};
fgSaturation.oninput = function() {
  document.getElementById('fgSaturationValue').textContent = this.value + '%';
  safeDoBlend();
};
fgHue.oninput = function() {
  document.getElementById('fgHueValue').textContent = this.value + '°';
  safeDoBlend();
};
blendModeSelect.onchange = safeDoBlend;
fgMirror.onchange = safeDoBlend;
autoRemoveBgCheckbox.onchange = safeDoBlend;
toleranceSlider.oninput = function() {
  document.getElementById('toleranceValue').textContent = this.value;
  safeDoBlend();
};

// Sync initial displayed values
document.getElementById('fgXValue').textContent = fgX.value;
document.getElementById('fgYValue').textContent = fgY.value;
document.getElementById('fgScaleValue').textContent = fgScale.value;
document.getElementById('fgRotationValue').textContent = fgRotation.value;
document.getElementById('fgSkewXValue').textContent = fgSkewX.value;
document.getElementById('fgSkewYValue').textContent = fgSkewY.value;
document.getElementById('opacityValue').textContent = opacitySlider.value;
document.getElementById('fgBrightnessValue').textContent = fgBrightness.value + '%';
document.getElementById('fgContrastValue').textContent = fgContrast.value + '%';
document.getElementById('fgSaturationValue').textContent = fgSaturation.value + '%';
document.getElementById('fgHueValue').textContent = fgHue.value + '°';
document.getElementById('toleranceValue').textContent = toleranceSlider.value;