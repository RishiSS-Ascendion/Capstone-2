# 🖼️ Full AI Image Suite  
A complete multi-module AI image application consisting of:

- **AI Image Generator & Blender** (Imagen + canvas compositor)
- **AI Image Enhancer** (Gemini Image Model)
- **SAM + Gemini Image Segmenter & Editor**
- **Gallery System** (stored images served from backend)
- **Dual Backends**:
  - `app1.py` → SAM segmentation + image editor backend  
  - `app2.py` → Gemini Agent auto-adjust backend

This project forms a cohesive workflow for image generation, enhancement, segmentation, blending, and gallery serving.

## 🚀 Features
- Background + foreground generation using **Imagen**
- Auto‑adjust using **Gemini 2.5 Flash Agent**
- Canvas‑based blending engine
- Foreground background removal (chroma key)
- SAM mask creation + region editing
- AI enhancer page
- Gallery with automatic image serving from Python backend

## 📁 Project Structure
```
/frontend
  index.html
  enhancer.html
  segmenter.html
  gallery.html
  api.js
  main.js
  blending.js
  control.js

/backend
  app1.py
  app2.py
```

## ⚙️ Installation
```
pip install -r requirements.txt
```

## ▶️ Running Backend Services
### Start SAM Backend
```
python app1.py
```

### Start Gemini Agent Backend
```
python app2.py
```

## 🔑 API Keys
Add your Google API key in api.js and app2.py.

## 📜 License
MIT License
