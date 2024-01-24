const ABSOLUTE_PATH_PREFIX = "src/js/json/";
const SLASH = "/";
import {AuthorBuilder} from './author.mjs';

const DEBUG = false;

const hostToAuthorsMap = {
    "nzz.ch": "nzz.json",
    "times.com": "times.json",
};

async function getFromLocalStorage(host) {
    return new Promise((resolve, reject) => {
        browser.storage.local.get(host, function (result) {
            if (browser.runtime.lastError) {
                reject(browser.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

async function saveToLocalStorage(host, data) {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(data);
        browser.storage.local.set({[host]: jsonData}, function () {
            if (browser.runtime.lastError) {
                reject(browser.runtime.lastError);
            } else {
                resolve(data);
            }
        });
    });
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
        const activeTab = tabs[0];
        browser.tabs.sendMessage(activeTab.id, {action: action, data: payload});
    });
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    const host = removeWWW(message.host);

    if (message.action === "addAuthor" && message.author) {
        try {
            let authors = await getFromLocalStorage(host);
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
            let authors = await getFromLocalStorage(host);
            authors = authors[host]
            if (!authors) {
                authors = await getAuthorsFromMasterData(host);
            }
            transferToContent("getAuthors", authors)
        } catch (error) {
            console.error("Error processing 'getAuthors' message:", error);
            transferToContent("getAuthors", []);
        }
    }
});
