    const BACKEND_URL = "http://127.0.0.1:5000";
    const mainImg = document.getElementById('mainImg');
    const status = document.getElementById('status');
    const loading = document.getElementById('loading');
    const popup = document.getElementById('popup');
    const downloadBtn = document.getElementById('downloadBtn');
    let editedBase64 = null;

    // --- Load shared image from enhancer or generator ---
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



    async function upload() {
      const fi = document.getElementById('fileInput');
      if (!fi.files.length) return alert('Choose a file first');
      const fd = new FormData();
      fd.append('image', fi.files[0]);
      loading.style.display = 'block';
      status.textContent = 'Uploading...';
      const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      loading.style.display = 'none';
      if (data.url) {
        mainImg.src = data.url;
        status.textContent = 'Click on the image to segment and detect.';
      }
    }

    mainImg.addEventListener('click', async (ev) => {
      if (!mainImg.src) return;
      const rect = mainImg.getBoundingClientRect();
      const x = Math.round((ev.clientX - rect.left) * (mainImg.naturalWidth / rect.width));
      const y = Math.round((ev.clientY - rect.top) * (mainImg.naturalHeight / rect.height));
      loading.style.display = 'block';
      const res = await fetch(`${BACKEND_URL}/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
      });
      const data = await res.json();
      loading.style.display = 'none';
      if (data.mask_image) {
        mainImg.src = 'data:image/png;base64,' + data.mask_image;
        status.textContent = `🧠 Detected: ${data.detected}. Now enter a prompt to edit.`;
        showPopup(`🧠 Detected: ${data.detected}`);
      }
    });

    async function applyEdit() {
      const p = document.getElementById('prompt').value.trim();
      if (!p) return alert('Enter a prompt');
      loading.style.display = 'block';
      const res = await fetch(`${BACKEND_URL}/edit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p })
      });
      const data = await res.json();
      loading.style.display = 'none';
      if (data.edited_image) {
        editedBase64 = data.edited_image;
        mainImg.src = 'data:image/png;base64,' + data.edited_image;
        status.textContent = data.message;
        showPopup(data.message);
        downloadBtn.classList.remove('hidden');
      }
    }

    async function undoRegion() {
      const res = await fetch(`${BACKEND_URL}/undo-region`, { method: 'POST' });
      const data = await res.json();
      if (data.image) {
        mainImg.src = 'data:image/png;base64,' + data.image;
        showPopup(data.message);
        status.textContent = data.message;
      }
    }

    async function undoOriginal() {
      const res = await fetch(`${BACKEND_URL}/undo-original`, { method: 'POST' });
      const data = await res.json();
      if (data.image) {
        mainImg.src = 'data:image/png;base64,' + data.image;
        showPopup(data.message);
        status.textContent = data.message;
      }
    }

    function downloadImage() {
      if (!editedBase64) return alert('No edited image to download.');
      const a = document.createElement('a');
      a.href = 'data:image/png;base64,' + editedBase64;
      a.download = 'edited_result.png';
      a.click();
    }

    function showPopup(text) {
      popup.textContent = text;
      popup.style.display = 'block';
      setTimeout(() => popup.style.display = 'none', 3000);
    }

    // --- Push to Enhancer ---
   async function pushToEnhancer() {
  const mainImg = document.getElementById("mainImg");
  if (!mainImg?.src) return alert("No image to send!");

  let imageSrc = mainImg.src;
  if (!imageSrc.startsWith("data:image")) {
    try {
      const blob = await fetch(imageSrc).then(r => r.blob());
      imageSrc = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result);
        fr.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Could not convert to base64:", err);
    }
  }
  localStorage.setItem("sharedImage", imageSrc);
  window.location.href = "enhancer.html";
}

