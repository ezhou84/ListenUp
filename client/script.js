// document.addEventListener('DOMContentLoaded', () => {
//     chrome.storage.local.get('selectedContent', (data) => {
//         const contentDiv = document.getElementById('contentDiv');
//         contentDiv.textContent = data.selectedContent || 'No content captured yet.';
//     });
// });

document.getElementById('captureButton').addEventListener('click', async () => {
    try {
        // Capture the visible tab
        chrome.tabs.captureVisibleTab(null, {}, async (imageDataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('Error capturing tab:', chrome.runtime);
                document.getElementById('contentDiv').innerText = 'Error capturing screen.';
                return;
            }

            // Send the image data to the backend
            const response = await fetch('http://localhost:8000/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image_url: imageDataUrl }),
            });

            const data = await response.json();
            document.getElementById('contentDiv').innerText = data.summary || 'No summary returned.';
        });
    } catch (error) {
        console.error('Error capturing and summarizing:', error);
        document.getElementById('contentDiv').innerText = 'Error occurred while summarizing.';
    }
});
