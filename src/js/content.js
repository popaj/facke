'use strict';

const SLUG_REGEX = /\/+[a-z0-9-]+\.\d+/;
const DEBUG = false;
const SPACE = " ";
const COMMA = ",";
const DEFAULT_AUTHOR_PHOTO = browser.runtime.getURL("src/asset/photo/default.jpg");

// SENDER
browser.runtime.sendMessage({action: "getAuthors", host: window.location.host}, (response) => {
    console.log('start')
    DEBUG ? console.group("··•••··· seinding ··•••···") : undefined;
    DEBUG ? console.log("host", window.location.host) : undefined;
    DEBUG ? console.groupEnd() : undefined;

    if (response && response.data) {
        const dataReceived = response.data;
        DEBUG ? console.log("Received information from background script:", dataReceived) : undefined;
    }
});

// RECEIVER
browser.runtime.onMessage.addListener((message) => {

    const payload = typeof message.data === "string" ? JSON.parse(message.data) : message.data;

    DEBUG ? console.group("··•••··· receiving ··•••···") : undefined;
    DEBUG ? console.log('message', message) : undefined;
    DEBUG ? console.log('action', message.action) : undefined;
    DEBUG ? console.log('payload', message.data) : undefined;

    if (message.action === 'getAuthors') {
        addAuthorPhoto(payload)
    } else if (message.action === 'addAuthor') {
        addAuthorPhoto(payload)
    }

    DEBUG ? console.groupEnd() : undefined;
});

function getAuthorLinkElement(href, linkText, target) {
    let authorLink = document.createElement("a");
    authorLink.href = href;
    authorLink.setAttribute("style", "background-image: none; text-decoration:none;");
    if (linkText !== "") {
        authorLink.text = linkText;
    }
    if (target) {
        authorLink.target = target;
    }
    return authorLink
}

function getAuthorPhotoElement(imgSrc) {
    let img = document.createElement("img");
    if (imgSrc) {
        img.src = imgSrc;
    } else {
        img.src = DEFAULT_AUTHOR_PHOTO
    }
    img.setAttribute("style", "object-fit: cover; width: 100px; height: 100px; border-radius: 50px;");
    return img;
}

function cleanUpAuthorName(authorName) {
    let cleanAuthorName = authorName.trim();

    if (cleanAuthorName.includes("(")) {
        const substringStartIdx = cleanAuthorName.indexOf("(") - 1;
        cleanAuthorName = cleanAuthorName.substring(0, substringStartIdx);
    }

    return cleanAuthorName;
}

function getArticleAuthors() {
    let authors = []
    let articleAuthors = document.querySelector("span.metainfo__item--author").textContent
    if (articleAuthors.includes(COMMA)) {
        const authorParts = articleAuthors.split(COMMA)
        for (let i = 0; i < authorParts.length; i++) {
            const currentAuthor = cleanUpAuthorName(authorParts[i]);
            const isName = currentAuthor.includes(SPACE);
            if (isName) {
                authors.push(currentAuthor);
            }
        }
    } else {
        // single author
        authors.push(articleAuthors);
    }
    return authors;
}

function matchAuthor(authors) {

    const articleAuthors = getArticleAuthors();
    const masterDataAuthors = [];

    for (let i = 0; i < articleAuthors.length; i++) {
        const currentAuthor = articleAuthors[i];
        const masterDataAuthor = authors.filter(author => `${author.firstName} ${author.lastName}` === currentAuthor);
        if (masterDataAuthor[0]) {
            masterDataAuthors.push(masterDataAuthor[0]);
        }
    }

    if (masterDataAuthors.length > 0) {
        return masterDataAuthors;
    } else {
        DEBUG ? console.group('save new Author') : undefined
        DEBUG ? console.log('author: ', articleAuthors[0]) : undefined
        DEBUG ? console.groupEnd() : undefined

        browser.runtime.sendMessage({action: "addAuthor", host: window.location.host, author: articleAuthors[0]});
    }
}

function isDetailPage() {
    const impressum = window.location.pathname.includes("impressum");
    const detailPage = SLUG_REGEX.test(window.location.pathname);
    DEBUG ? console.log("detail page", detailPage) : undefined
    return detailPage && !impressum;
}

function addAuthorPhoto(authors) {
    DEBUG ? console.log('update DOM') : undefined;
    DEBUG ? console.log('authors', authors) : undefined;

    const articleAuthors = matchAuthor(authors)

    DEBUG ? console.log('articleAuthor', articleAuthors) : undefined;
    let authorDomElement;
    let wrapperDiv = document.createElement("div");
    for (let i = 0; i < articleAuthors.length; i++) {
        let authorDiv = document.createElement("div");
        authorDiv.setAttribute("style", "float: left;")

        let authorAnchor = document.createElement("a");
        authorAnchor.target = "_blank"
        authorAnchor.href = articleAuthors[i].photo;
        authorAnchor.setAttribute("style", "background-image: none; text-decoration:none;");

        let imgAuthor = getAuthorPhotoElement(articleAuthors[i].photo)
        authorAnchor.appendChild(imgAuthor);
        authorDiv.appendChild(authorAnchor)

        let authorNameSpan = document.createElement("span");
        authorNameSpan.setAttribute("class", "metainfo__item--author");

        let authorLink = document.createElement("a");
        authorLink.href = articleAuthors[i].about;
        authorLink.text = `${articleAuthors[i].firstName} ${articleAuthors[i].lastName}`;
        authorLink.setAttribute("style", "background-image:none; text-decoration:none;");
        authorNameSpan.appendChild(authorLink)
        authorDiv.appendChild(document.createElement("br"))
        authorDiv.appendChild(authorNameSpan)

        wrapperDiv.appendChild(authorDiv);
    }
    document.querySelector("span.metainfo__item").remove();
    authorDomElement = wrapperDiv;

    if (isDetailPage()) {
        const authorElement = document.getElementsByClassName("metainfo--content")[0]
        authorElement.insertBefore(authorDomElement, authorElement.firstChild);
    }
}