document.getElementById('contentDiv').innerText="Let's start reading"

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
            document.getElementById('contentDiv').innerText="Summarizing..."

            // Send the image data to the backend
            const response = await fetch('http://localhost:8080/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageDataUrl }),
            });

            const data = await response.json();
            document.getElementById('contentDiv').innerText = data.summary || 'No summary returned.';
            var msg = new SpeechSynthesisUtterance();
            msg.text = data.summary;
            window.speechSynthesis.speak(msg);
        });
    } catch (error) {
        console.error('Error capturing and summarizing:', error);
        document.getElementById('contentDiv').innerText = 'Error occurred while summarizing.';
    }
});