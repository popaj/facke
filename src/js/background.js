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

function removeWWW(host) {
    return host.startsWith("www.") ? host.substring(4, host.length) : host
}

function transferToContent(action, payload) {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        browser.tabs.sendMessage(activeTab.id, {action: action, data: payload});
    });
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    DEBUG ? console.log("... receiving ...") : undefined;

    if (message.action === "addAuthor" && message.author) {

        DEBUG ? console.group("addAuthor") : undefined
        DEBUG ? console.log("> message", message) : undefined;

        const host = removeWWW(message.host);
        const localStorageAuthors = await getFromLocalStorage(host);
        DEBUG ? console.group("localStorageAuthors", localStorageAuthors) : undefined
        DEBUG ? console.group("localStorageAuthors.length", localStorageAuthors.length) : undefined
        const newAuthor = new AuthorBuilder()
            .setFirstName(message.author)
            .setLastName(message.author)
            .build();
        const authorUpdated = localStorageAuthors.add(newAuthor)
        DEBUG ? console.group("authorUpdated", authorUpdated) : undefined
        DEBUG ? console.group("authorUpdated.length", authorUpdated.length) : undefined

        await saveToLocalStorage(host, authorUpdated)
        transferToContent("addAuthor", authorUpdated)
    } else if (message.action === "getAuthors") {

        DEBUG ? console.group("getAuthors") : undefined
        DEBUG ? console.log("> message", message) : undefined;
        DEBUG ? console.groupEnd() : undefined;

        let host = removeWWW(message.host);
        try {
            const localStorageAuthors = await getFromLocalStorage(host);
            const payload = localStorageAuthors[host];

            let globalData;
            if (payload && payload.length > 0) {

                DEBUG ? console.group("from localStorage") : undefined
                DEBUG ? console.log("> localStorage", localStorageAuthors) : undefined;
                DEBUG ? console.log("> payload", payload) : undefined;
                DEBUG ? console.groupEnd() : undefined

                transferToContent("getAuthors", payload)
            } else {
                DEBUG ? console.group("from file") : undefined

                const jsonFileName = hostToAuthorsMap[host];
                const jsonFileURL = browser.runtime.getURL(ABSOLUTE_PATH_PREFIX + SLASH + jsonFileName);

                DEBUG ? console.log("> jsonFileName", jsonFileName) : undefined;
                DEBUG ? console.log("> jsonFileURL", jsonFileURL) : undefined;

                await fetch(jsonFileURL)
                    .then(response => response.json())
                    .then(data => {
                        // Transfer to Content
                        globalData = data;

                        DEBUG ? console.log('data', data) : undefined

                        transferToContent("getAuthors", data)
                    })
                    .catch(error => console.error('Error reading authors.json:', error));
                await saveToLocalStorage(host, globalData)
                DEBUG ? console.groupEnd() : undefined
            }

        } catch (error) {
            console.error("Error retrieving data:", error);
        }
    }
});
