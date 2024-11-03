document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('selectedContent', (data) => {
        const contentDiv = document.getElementById('contentDiv');
        contentDiv.textContent = data.selectedContent || 'No content captured yet.';
    });
});