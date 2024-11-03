document.addEventListener('DOMContentLoaded', function() {
    // Set up a listener for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "updateContent") {
            // Update the contentDiv with the message
            const contentDiv = document.getElementById('contentDiv');
            if (contentDiv) {
                contentDiv.innerText = request.message;
            }
            
            // Optionally send a response back
            sendResponse({ status: "success" });
        }
    });
});