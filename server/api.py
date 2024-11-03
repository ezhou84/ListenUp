# Import necessary libraries
import base64
import os
from io import BytesIO

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

# Initialize FastAPI app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Define request model
class ImageRequest(BaseModel):
    image_url: str
    
class TextRequest(BaseModel):
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

def process_request(url_content, image):
    if image:
        base64_image = convert_image_to_base64(url_content)
        summary_prompt_text = f"""In a maximum of 3 sentences, summarize this image. Include as much relevant detail as possible that would be important for someone with vision loss or blindness. Be as specific as possible, such as naming people you can recognize. Describe only what you see in the image but try to extrapolate as much as possible; if you can identify and put a name to things in the image, name them. Also, the image URL may be relevant in order to name or determine certain details in the image, which is {url_content}. Again, your response must not be more than 3 sentences."""
        summary_result = summarize(summary_prompt_text, image_url=base64_image)
    else:
        summary_prompt_text = f"""In a maximum of 3 sentences, summarize this text: {url_content}. Write your answer in sentences, unless bullet form is more appropriate. Do not start with the word 'summary'; just go right in."""
        summary_result = summarize(summary_prompt_text)

    return summary_result

# Define endpoint for image processing
@app.post("/process-image")
async def process_image_endpoint(request: ImageRequest):
    # Process image with LangChain
    try:
        # Replace 'process_image' with the exact function name in the notebook
        langchain_result = process_request(request.image_url, image=True)
    except Exception as e:
        print(f"Error processing image: {e}")  # Log the exception
        raise HTTPException(status_code=500, detail="Error processing image")

    # Return the result
    return {"response": langchain_result}

# Define endpoint for text processing
@app.post("/process-text")
async def process_text_endpoint(request: TextRequest):
    # Process image with LangChain
    try:
        # Replace 'process_image' with the exact function name in the notebook
        langchain_result = process_request(request.text, image=False)
    except Exception as e:
        print(f"Error processing image: {e}")  # Log the exception
        raise HTTPException(status_code=500, detail="Error processing image")

    # Return the result
    return {"response": langchain_result}

# To run the API, use: `uvicorn api_filename:app --reload`
