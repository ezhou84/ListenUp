// content.js
document.addEventListener('click', async function (event) {
    let target = event.target;
    let content = '';
    let isImage = false;

    if (target.tagName === 'P' ||
        target.tagName === 'H1' ||
        target.tagName === 'H2' ||
        target.tagName === 'H3' ||
        target.tagName === 'H4' ||
        target.tagName === 'H5' ||
        target.tagName === 'H6' ||
        target.tagName === 'SPAN' ||
        target.tagName === 'DIV') {
        content = target.innerText; // Use innerText to capture text content
        isImage = false;
    } else if (target.tagName === 'IMG') {
        content = target.src;
        isImage = true;
    } else if (target.tagName === 'A') {
        content = `Text: ${target.innerText}, URL: ${target.href}`;
        isImage = false;
    }

    if (content) {
        if (isImage) {
            console.log("isImage", isImage);

            try {
                const base64Image = await urlToBase64(content); // Convert image URL to Base64
                const summary = await getSummary(base64Image); // Use the Base64 string for summary
                var msg = new SpeechSynthesisUtterance();
                msg.text = summary;
                console.log("summary", summary);

                alert("img summary: " + summary);
                window.speechSynthesis.speak(msg);
                document.getElementById('contentDiv').innerText="Reading..."+msg
            } catch (error) {
                console.error("Error processing image:", error);
            }
        } else {
            chrome.storage.local.set({ selectedContent: content }, () => {
                console.log("Content saved:", content);
                var msg = new SpeechSynthesisUtterance();
                msg.text = content;
                window.speechSynthesis.speak(msg);
                document.getElementById('contentDiv').innerText="Reading..."+msg
                alert("Content copied: " + content);
            });
        }
    }
});

const urlToBase64 = async (url) => {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result); // This will be the Base64 string
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob); // Convert Blob to Base64
    });
};

const getSummary = async (content) => {
    // Send the Base64 image data to the backend
    const response = await fetch('http://localhost:8080/summarize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: content }),
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.summary;
}
