import os
import json
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai.errors import APIError

# --- TEMPORARY CONFIGURATION (READ WARNING BELOW) ---
# WARNING: Storing the key directly in code is INSECURE. 
# REMOVE THIS LINE AND USE os.getenv('GEMINI_API_KEY') for production.
GEMINI_KEY = "AIzaSyCzFC4fLcZDS-sp8f9bB0qZN26L9ZE_OyU" # <-- PASTE YOUR ACTUAL KEY HERE

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app) 

# --- GenAI Client Initialization ---
client = None
AGENT_MODEL_NAME = 'gemini-2.5-flash-preview-05-20'

if GEMINI_KEY:
    try:
        # Initialize client directly with the key
        client = genai.Client(api_key=GEMINI_KEY)
        print("DEBUG: GenAI Client initialized successfully.")
    except Exception as e:
        print(f"ERROR: Failed to initialize GenAI Client: {e}")
        
else:
    print("ERROR: GEMINI_API_KEY is not set (hardcoded key is missing or is empty).")

# --- Helper Function ---
def data_url_to_part(data_url):
    """Converts a data URL to a Gemini API Part object."""
    if ';base64,' not in data_url:
        raise ValueError("Invalid base64 format in image URL.")
    
    header, base64_data = data_url.split(';base64,')
    mime_type = header.split(':')[1]
    return {"inlineData": {"data": base64_data, "mimeType": mime_type}}

# --- API Endpoint ---

@app.route('/api/auto-adjust', methods=['POST'])
def auto_adjust():
    """Receives two images and prompt, calls Gemini, and returns structured JSON adjustments."""
    if not client:
        return jsonify({"error": "AI client not initialized. Check server setup or API key."}), 500

    try:
        data = request.json
        agent_prompt = data.get('agentPrompt')
        bg_data_url = data.get('bgDataUrl')
        fg_data_url = data.get('fgDataUrl')
        
        if not agent_prompt or not bg_data_url or not fg_data_url:
            return jsonify({"error": "Missing prompt, bgDataUrl, or fgDataUrl in request."}), 400

        # Convert both image URLs to GenAI parts
        bg_image_part = data_url_to_part(bg_data_url)
        fg_image_part = data_url_to_part(fg_data_url)

        # Build the contents list for the multimodal prompt (BG Image, FG Image, Text)
        contents = [
            bg_image_part,
            fg_image_part,
            {"text": agent_prompt}
        ]

        # 2. Define System Prompt and Structured Schema
        system_prompt = (
            "You are an expert image compositing assistant. Your task is to generate JSON adjustments "
            "for the foreground image (the second image) based on the background (the first image) "
            "and the user's instructions. Use the hue and saturation parameters to achieve color changes. "
            "Output ONLY valid JSON."
        )

        # --- UPDATED RESPONSE SCHEMA including Hue and Saturation ---
        response_schema = genai.types.Schema(
            type="OBJECT",
            properties={
                "xPos": genai.types.Schema(type="INTEGER", description="Horizontal position (0-512)"),
                "yPos": genai.types.Schema(type="INTEGER", description="Vertical position (0-512)"),
                "scaleFactor": genai.types.Schema(type="NUMBER", description="Scale factor (0.1-2.0)"),
                "rotationDegrees": genai.types.Schema(type="INTEGER", description="Rotation (-180 to 180)"),
                "brightness": genai.types.Schema(type="INTEGER", description="Brightness (0-200)"),
                "contrast": genai.types.Schema(type="INTEGER", description="Contrast (0-200)"),
                "saturation": genai.types.Schema(type="INTEGER", description="Saturation level (0-200)"), # NEW
                "hue": genai.types.Schema(type="INTEGER", description="Hue rotation in degrees (0-360)"),          # NEW
                "skewX": genai.types.Schema(type="NUMBER", description="Skew X (-0.5 to 0.5)"),
                "skewY": genai.types.Schema(type="NUMBER", description="Skew Y (-0.5 to 0.5)")
            }
        )
        # -------------------------------------------------------------

        # 3. Call the Gemini API 
        response = client.models.generate_content(
            model=AGENT_MODEL_NAME,
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=response_schema
            )
        )
        
        # Extract the JSON text and return it directly to the frontend
        json_text = response.candidates[0].content.parts[0].text
        adjustments = json.loads(json_text)
        return jsonify(adjustments)

    except APIError as e:
        error_message = str(e)
        return jsonify({"error": f"Gemini API Error: {error_message}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
