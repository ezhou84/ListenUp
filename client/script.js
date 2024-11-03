document.getElementById('contentDiv').innerText = "Let's start reading"

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('selectedContent', (data) => {
        const contentDiv = document.getElementById('contentDiv');
        //contentDiv.textContent = data.selectedContent || 'No content captured yet.';
    });
});

function onCaptured(imageUri) {
    console.log("imageUri", imageUri);
}

function onError(error) {
    console.log(`Error: ${error}`);
}

document.getElementById('captureButton').addEventListener('click', async () => {
    try {
        // Attempt to capture the visible tab
        chrome.tabs.captureVisibleTab(null, {}, async (imageDataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('Error capturing tab:', chrome.runtime.lastError);
                document.getElementById('contentDiv').innerText = 'Error capturing screen.';
                return;
            }

            // Log the image data URL
            console.log("imageDataUrl", imageDataUrl);
            document.getElementById('contentDiv').innerText = "Summarizing..."

            // Send the image data to the backend
            const response = await fetch('http://localhost:8000/process-screen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "base64str": imageDataUrl }),
            });

            const data = await response.json();
            document.getElementById('contentDiv').innerText = data.response || 'No summary returned.';
            var msg = new SpeechSynthesisUtterance();
            msg.text = data.response;
            window.speechSynthesis.speak(msg);
        });
    } catch (error) {
        console.error('Error capturing and summarizing:', error);
        document.getElementById('contentDiv').innerText = 'Error occurred while summarizing.';
    }
});

// voice activates capture button
document.getElementById('voiceButton').addEventListener('click', () => {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            if (transcript.includes("click") || transcript.includes("press") || transcript.includes("capture")) {
                document.getElementById('captureButton').click();
            } else {
                alert("Command not recognized. Please say 'capture', 'click' or 'press'.");
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };

        recognition.start();
    } else {
        alert("Your browser does not support speech recognition.");
    }
});