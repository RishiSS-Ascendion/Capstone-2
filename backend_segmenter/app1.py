import os
import cv2
import numpy as np
import torch
import base64
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MODEL_TYPE = "vit_b"
CHECKPOINT_PATH = os.path.join(BASE_DIR, "weights", "sam_vit_b_01ec64.pth")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Gemini setup
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCzFC4fLcZDS-sp8f9bB0qZN26L9ZE_OyU")
GEMINI_MODEL = "gemini-2.5-flash-image"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
HEADERS = {"Content-Type": "application/json"}

sam = None
predictor = None
image_bgr = None
original_bgr = None
image_path = None
current_mask = None


def load_sam_model():
    global sam, predictor
    if sam is not None and predictor is not None:
        return
    try:
        from segment_anything import sam_model_registry, SamPredictor
        sam = sam_model_registry[MODEL_TYPE](checkpoint=CHECKPOINT_PATH).to(DEVICE)
        predictor = SamPredictor(sam)
        print("✅ SAM model loaded.")
    except Exception as e:
        print("Error loading SAM:", e)


@app.route("/upload", methods=["POST"])
def upload():
    global image_bgr, original_bgr, predictor, image_path
    if "image" not in request.files:
        return jsonify({"error": "no file"}), 400

    f = request.files["image"]
    filename = datetime.now().strftime("%Y%m%d_%H%M%S_") + f.filename.replace(" ", "_")
    save_path = os.path.join(UPLOAD_DIR, filename)
    f.save(save_path)
    image_path = save_path

    image_bgr = cv2.imread(save_path)
    original_bgr = image_bgr.copy()
    if image_bgr is None:
        return jsonify({"error": "failed to read image"}), 500

    try:
        from segment_anything import SamPredictor
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        if predictor is not None:
            predictor.set_image(image_rgb)
    except Exception as e:
        print("predictor not set:", e)

    h, w = image_bgr.shape[:2]
    return jsonify({"url": f"http://127.0.0.1:5000/static/uploads/{filename}", "width": w, "height": h})


@app.route("/segment", methods=["POST"])
def segment():
    global current_mask, image_bgr
    if image_bgr is None:
        return jsonify({"error": "no image loaded"}), 400

    data = request.json or {}
    x, y = int(data.get("x", -1)), int(data.get("y", -1))
    h, w = image_bgr.shape[:2]
    if x < 0 or y < 0 or x >= w or y >= h:
        return jsonify({"error": "click out of bounds"}), 400
    if predictor is None:
        return jsonify({"error": "SAM predictor not loaded"}), 500

    masks, scores, _ = predictor.predict(
        point_coords=np.array([[x, y]]), point_labels=np.array([1]), multimask_output=True
    )
    best_mask = masks[np.argmax(scores)].astype(bool)
    current_mask = best_mask

    overlay = image_bgr.copy()
    overlay[best_mask] = (overlay[best_mask] * 0.5 + np.array([0, 0, 255]) * 0.5).astype(np.uint8)

    # Identify cropped object
    y_idx, x_idx = np.where(best_mask)
    x_min, x_max = np.min(x_idx), np.max(x_idx)
    y_min, y_max = np.min(y_idx), np.max(y_idx)
    crop = image_bgr[y_min:y_max, x_min:x_max]
    _, buf_crop = cv2.imencode(".png", crop)
    b64_crop = base64.b64encode(buf_crop).decode()

    desc = "Unknown"
    try:
        payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": "Identify briefly (1-2 words) what this cropped image shows."},
                    {"inline_data": {"mime_type": "image/png", "data": b64_crop}}
                ]
            }]
        }
        resp = requests.post(GEMINI_API_URL, headers=HEADERS, json=payload, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            desc = data["candidates"][0]["content"]["parts"][0].get("text", "Unknown").strip()
    except Exception as e:
        print("Gemini detect error:", e)

    _, buf_overlay = cv2.imencode(".png", overlay)
    return jsonify({
        "mask_image": base64.b64encode(buf_overlay).decode(),
        "detected": desc.capitalize() or "Unknown"
    })


@app.route("/edit", methods=["POST"])
def edit():
    global image_bgr, current_mask, image_path
    if image_bgr is None:
        return jsonify({"error": "no image loaded"}), 400
    if current_mask is None:
        return jsonify({"error": "no region selected"}), 400

    data = request.json or {}
    prompt = data.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "empty prompt"}), 400

    y_idx, x_idx = np.where(current_mask)
    if len(x_idx) == 0 or len(y_idx) == 0:
        return jsonify({"error": "empty mask"}), 400

    x_min, x_max = np.min(x_idx), np.max(x_idx)
    y_min, y_max = np.min(y_idx), np.max(y_idx)
    crop = image_bgr[y_min:y_max, x_min:x_max]
    _, buf = cv2.imencode(".png", crop)
    b64_crop = base64.b64encode(buf).decode()

    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": f"Edit this cropped region based on: '{prompt}'. Keep realistic lighting and textures."},
                {"inline_data": {"mime_type": "image/png", "data": b64_crop}}
            ]
        }]
    }
    resp = requests.post(GEMINI_API_URL, headers=HEADERS, json=payload, timeout=90)
    if resp.status_code != 200:
        return jsonify({"error": "Gemini edit failed"}), 500

    data_out = resp.json()
    gen_b64 = None
    for cand in data_out.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inline_data") or part.get("inlineData")
            if inline and "data" in inline:
                gen_b64 = inline["data"]
                break
        if gen_b64:
            break

    if not gen_b64:
        return jsonify({"error": "No output image"}), 500

    gen_img = cv2.imdecode(np.frombuffer(base64.b64decode(gen_b64), np.uint8), cv2.IMREAD_COLOR)
    gen_resized = cv2.resize(gen_img, (x_max - x_min, y_max - y_min))
    image_bgr[y_min:y_max, x_min:x_max] = gen_resized

    cv2.imwrite(image_path, image_bgr)
    _, buf_final = cv2.imencode(".png", image_bgr)

    return jsonify({
        "edited_image": base64.b64encode(buf_final).decode(),
        "message": f"✅ Edited successfully for prompt: '{prompt}'"
    })


@app.route("/undo-region", methods=["POST"])
def undo_region():
    global current_mask, image_bgr
    current_mask = None
    if image_bgr is None:
        return jsonify({"error": "no image"}), 400
    _, buf = cv2.imencode(".png", image_bgr)
    return jsonify({"image": base64.b64encode(buf).decode(), "message": "Region selection undone."})


@app.route("/undo-original", methods=["POST"])
def undo_original():
    global image_bgr, original_bgr, image_path, current_mask
    if original_bgr is None:
        return jsonify({"error": "no original"}), 400
    image_bgr = original_bgr.copy()
    current_mask = None
    cv2.imwrite(image_path, image_bgr)
    _, buf = cv2.imencode(".png", image_bgr)
    return jsonify({"image": base64.b64encode(buf).decode(), "message": "Reverted to original image."})


# 🖼️ Gallery route — list all uploaded/edited images
# 🖼️ GALLERY ROUTES

@app.route("/gallery-list", methods=["GET"])
def gallery_list():
    """Alias for /gallery to support existing frontend requests."""
    try:
        files = sorted(os.listdir(UPLOAD_DIR), reverse=True)
        image_urls = [
            f"/static/uploads/{f}" for f in files
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        ]
        return jsonify({"images": image_urls})
    except Exception as e:
        return jsonify({"error": str(e)}), 500




if __name__ == "__main__":
    print("🚀 Starting SAM + Gemini backend with Gallery...")
    load_sam_model()
    app.run(host="0.0.0.0", port=5000, debug=True)
