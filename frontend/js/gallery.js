const BACKEND_URL = "http://127.0.0.1:5000";
    async function loadGallery() {
      const grid = document.getElementById('galleryGrid');
      try {
        const res = await fetch(`${BACKEND_URL}/gallery-list`);
        const data = await res.json();
        grid.innerHTML = '';
        if (!data.images || !data.images.length) {
          grid.innerHTML = "<p class='text-gray-400 text-lg'>No images found.</p>";
          return;
        }
        data.images.forEach(url => {
          const img = document.createElement('img');
          img.src = BACKEND_URL + url;
          img.onclick = () => window.open(img.src, '_blank');
          grid.appendChild(img);
        });
      } catch (e) {
        grid.innerHTML = `<p class='text-red-400'>Error loading gallery: ${e.message}</p>`;
      }
    }
    loadGallery();

    document.addEventListener('DOMContentLoaded', () => {
      const path = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-link').forEach(l => {
        const f = l.getAttribute('href').split('/').pop();
        if (f === path) {
          l.classList.remove('text-gray-300','hover:bg-gray-700','hover:text-white');
          l.classList.add('bg-blue-600','text-white','font-bold','shadow-inner');
        }
      });
    });