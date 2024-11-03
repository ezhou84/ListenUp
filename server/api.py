# Import necessary libraries
import base64
import os
from io import BytesIO

import httpx
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from langchain_mistralai import ChatMistralAI
from PIL import Image
from pydantic import BaseModel

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
SPEECHIFY_API_BASE_URL = "https://api.sws.speechify.com"
SPEECHIFY_API_KEY = os.getenv("SPEECHIFY_API_KEY")
SPEECHIFY_VOICE_ID = "jack"

def summarize(prompt, image_url=None):
    """Generate summary."""
    chat = ChatMistralAI(
        model="pixtral-12b-2409",
        # temperature=0,
        # max_retries=2,
        # other params...
    )

    if image_url:
        msg = chat.invoke(
            [
                HumanMessage(
                    content=[
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url},
                        },
                    ]
                )
            ]
        )
    else:
        msg = chat.invoke(
            [
                HumanMessage(
                    content=[
                        {"type": "text", "text": prompt},
                    ]
                )
            ]
        )
    return msg.content

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request model
class ImageRequest(BaseModel):
    image_url: str
    
class TextRequest(BaseModel):
    text: str

class ScreenRequest(BaseModel):
    base64str: str

class AudioRequest(BaseModel):
    text: str

def convert_image_to_base64(image_url):
    # Download the image from the URL
    response = requests.get(image_url)
    response.raise_for_status()  # Check if the request was successful

    # Open the image using PIL
    image = Image.open(BytesIO(response.content))

    # Convert the image to a byte array
    buffered = BytesIO()
    image_format = image.format  # Get the format of the image (e.g., 'JPEG', 'PNG')
    image.save(buffered, image_format)  # You can change the format if needed
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")  # Encode to base64

    # Create the data URL prefix
    data_url_prefix = f"data:image/{image_format.lower()};base64,"
    
    return data_url_prefix + img_str  # Return the complete data URL

def process_request(content, type):
    if type == "image":
        base64_image = convert_image_to_base64(content)
        summary_prompt_text = f"""Give a 1 sentence summary of this image. Only 1 sentence. No more than that. Include as much relevant detail as possible that would be important for someone with vision loss or blindness. Be as specific as possible, such as naming people you can recognize. Describe only what you see in the image but try to extrapolate as much as possible; if you can identify and put a name to things in the image, name them. Also, the image URL may be relevant in order to name or determine certain details in the image, which is {content}."""
        summary_result = summarize(summary_prompt_text, image_url=base64_image)
    elif type == "text":
        summary_prompt_text = f"""Give a very, very brief summary of this text in at most 2 sentences: {content}. Write your answer in sentences, unless bullet form is more appropriate. Do not start with the word 'summary'; just go right in. Again, your response must not be more than 2 sentences."""
        summary_result = summarize(summary_prompt_text)
    elif type == "screen":
        summary_prompt_text = f"""Give a very, very brief summary of this image in at most 2 sentences. Include as much relevant detail as possible that would be important for someone with vision loss or blindness. Be as specific as possible, such as naming people you can recognize. Describe only what you see in the image but try to extrapolate as much as possible; if you can identify and put a name to things in the image, name them. Also, the image URL may be relevant in order to name or determine certain details in the image, which is {content}. Again, your response must not be more than 2 sentences."""
        summary_result = summarize(summary_prompt_text, image_url=content)

    return summary_result

# Define endpoint for image processing
@app.post("/process-image")
async def process_image_endpoint(request: ImageRequest):
    try:
        langchain_result = process_request(request.image_url, type="image")
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="Error processing image")

    return {"response": langchain_result}

# Define endpoint for text processing
@app.post("/process-text")
async def process_text_endpoint(request: TextRequest):
    try:
        langchain_result = process_request(request.text, type="text")
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="Error processing image")

    return {"response": langchain_result}

@app.post("/process-screen")
async def process_screen_endpoint(request: ScreenRequest):
    try:
        langchain_result = process_request(request.base64str, type="screen")
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail="Error processing image")

    return {"response": langchain_result}

@app.post("/get-audio/")
async def get_audio_endpoint(request: AudioRequest):
    url = f"{SPEECHIFY_API_BASE_URL}/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {SPEECHIFY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": f"<speak>{request.text}</speak>",
        "voice_id": SPEECHIFY_VOICE_ID,
        "audio_format": "mp3",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    response_data = response.json()
    return response_data
