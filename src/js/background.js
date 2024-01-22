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
    return host.startsWith("www.") ? host.substring(4, host.length) : host;
}

function transferToContent(action, payload) {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        browser.tabs.sendMessage(activeTab.id, {action: action, data: payload});
    });
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    DEBUG && console.log("... receiving ...");

    if (message.action === "addAuthor" && message.author) {

        DEBUG && console.group("addAuthor");
        DEBUG && console.log("> message", message);

        const host = removeWWW(message.host);
        let localStorageAuthors = await getFromLocalStorage(host);
        localStorageAuthors = JSON.parse(localStorageAuthors[host]);
        DEBUG && console.log("localStorageAuthors", localStorageAuthors);
        DEBUG && console.log("localStorageAuthors.length", localStorageAuthors.length);
        const newAuthor = new AuthorBuilder()
            .setFirstName(message.author)
            .setLastName(message.author)
            .build();
        DEBUG && console.log("Before authorUpdated", localStorageAuthors);
        DEBUG && console.log("Before authorUpdated.length", localStorageAuthors.length);
        localStorageAuthors.push(newAuthor);
        DEBUG && console.log("After authorUpdated", localStorageAuthors);
        DEBUG && console.log("After authorUpdated.length", localStorageAuthors.length);
        DEBUG && console.groupEnd();

        await saveToLocalStorage(host, localStorageAuthors);
        transferToContent("addAuthor", localStorageAuthors);
    } else if (message.action === "getAuthors") {

        DEBUG && console.group("getAuthors");
        DEBUG && console.log("> message", message);
        DEBUG && console.groupEnd();

        let host = removeWWW(message.host);
        try {
            const localStorageAuthors = await getFromLocalStorage(host);
            const payload = localStorageAuthors[host];

            let globalData;
            if (payload && payload.length > 0) {

                DEBUG && console.group("from localStorage");
                DEBUG && console.log("> localStorage", localStorageAuthors);
                DEBUG && console.log("> payload", payload);
                DEBUG && console.groupEnd();

                transferToContent("getAuthors", payload);
            } else {
                DEBUG && console.group("from file");

                const jsonFileName = hostToAuthorsMap[host];
                const jsonFileURL = browser.runtime.getURL(ABSOLUTE_PATH_PREFIX + SLASH + jsonFileName);

                DEBUG && console.log("> jsonFileName", jsonFileName);
                DEBUG && console.log("> jsonFileURL", jsonFileURL);

                await fetch(jsonFileURL)
                    .then(response => response.json())
                    .then(data => {
                        // Transfer to Content
                        globalData = data;
                        DEBUG && console.log('data', data);
                        transferToContent("getAuthors", data);
                    })
                    .catch(error => console.error('Error reading authors.json:', error));
                await saveToLocalStorage(host, globalData);
                DEBUG && console.groupEnd();
            }

        } catch (error) {
            console.error("Error retrieving data:", error);
        }
    }
});
