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
            try {
                const summary = await getSummary(content, "image");
                const audioData = await getAudio(summary);
                const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.playbackRate = 1.15;
                audio.play();
                chrome.runtime.sendMessage({ action: "updateContent", message: summary });
            } catch (error) {
                console.error("Error processing image:", error);
            }
        } else {
            chrome.storage.local.set({ selectedContent: content }, async () => {
                try {
                    const summary = await getSummary(content, "text");
                    const audioData = await getAudio(summary);
                    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    audio.playbackRate = 1.15;
                    audio.play();
                    chrome.runtime.sendMessage({ action: "updateContent", message: summary });
                } catch (error) {
                    console.error("Error processing text:", error);
                }
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
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const getSummary = async (content, type) => {
    let response;
    if (type === "image") {
        response = await fetch('http://localhost:8000/process-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ "image_url": content }),
        });
    } else if (type === "text") {
        response = await fetch('http://localhost:8000/process-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ "text": content }),
        });
    }

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.response;
}

const getAudio = async (text) => {
    const res = await fetch('http://localhost:8000/get-audio/', {
        method: "POST",
        body: JSON.stringify({ text: text }),
        headers: {
            "Content-Type": "application/json",
        },
    });

	if (!res.ok) {
		throw new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
	}

	const responseData = await res.json();

    const binaryString = atob(responseData.audio_data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}