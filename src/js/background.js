const ABSOLUTE_PATH_PREFIX = "src/js/json/";
import {AuthorBuilder} from './author.mjs';

const hostToAuthorsMap = {
    "nzz.ch": "nzz.json",
};

async function getFromLocalStorage(host) {
    try {
        const result = await browser.storage.local.get(host);
        return result[host] ? JSON.parse(result[host]) : [];
    } catch (error) {
        console.error("Error accessing local storage:", error);
        return null;
    }
}

async function saveToLocalStorage(host, data) {
    try {
        const jsonData = JSON.stringify(data);
        await browser.storage.local.set({[host]: jsonData});
        return data;
    } catch (error) {
        console.error(`Error saving data to local storage for ${host}:`, error);
        throw error; // Rethrow to let the caller handle the error
    }
}

async function getAuthorsFromMasterData(host) {
    try {
        const response = await fetch(ABSOLUTE_PATH_PREFIX + hostToAuthorsMap[host]);
        const authors = await response.json();
        await saveToLocalStorage(host, authors);
        return authors;
    } catch (error) {
        console.error(`Error fetching authors from master data for ${host}:`, error);
        return [];
    }
}

function removeWWW(host) {
    return host.startsWith("www.") ? host.substring(4) : host;
}

function transferToContent(action, payload) {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
            browser.tabs.sendMessage(tabs[0].id, {action, data: payload}).catch(e => {
                console.error("Error sending message to content script:", e);
            });
        }
    });
}

browser.runtime.onMessage.addListener(async (message) => {
    const host = removeWWW(message.host);

    if (message.action === "addAuthor" && message.author) {
        try {
            let authors = await getFromLocalStorage(host) || [];
            authors = JSON.parse(authors[host]);
            const newAuthor = new AuthorBuilder()
                .setFirstName(message.author)
                .setLastName(message.author)
                .build();
            authors.push(newAuthor);
            await saveToLocalStorage(host, authors);
            transferToContent("addAuthor", authors);
        } catch (error) {
            console.error("Error processing 'addAuthor' message:", error);
            transferToContent("addAuthor", []);
        }
    } else if (message.action === "getAuthors") {
        try {
            let authors = await getFromLocalStorage(host) || [];
            authors = authors[host]
            if (!authors) {
                authors = await getAuthorsFromMasterData(host) || [];
            }
            transferToContent("getAuthors", authors)
        } catch (error) {
            console.error("Error processing 'getAuthors' message:", error);
            transferToContent("getAuthors", []);
        }
    }
});
