'use strict';

const SLUG_REGEX = /\/+[a-z0-9-]+\.\d+/;
const DEBUG = false;

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
    img.src = imgSrc;
    img.setAttribute("style", "width: 100px;");
    return img;
}

function matchAuthor(authors) {
    let articleAuthor = document.querySelector("span.metainfo__item--author").textContent
    const multipleAuthors = articleAuthor.indexOf(",") > 0
    if (multipleAuthors) {
        // TODO: fix: list all
        articleAuthor = articleAuthor.substring(0, articleAuthor.indexOf(","))
        DEBUG ? console.log("news article author", articleAuthor) : undefined;
    }
    const result = authors.filter(author => `${author.firstName} ${author.lastName}` === articleAuthor);

    const authorFound = result.length > 0;
    if (authorFound) {
        return result[0]
    } else {
        DEBUG ? console.group('save new Author') : undefined
        DEBUG ? console.log('author: ', articleAuthor) : undefined
        DEBUG ? console.groupEnd() : undefined

        browser.runtime.sendMessage({action: "addAuthor", host: window.location.host, author: articleAuthor});
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

    const articleAuthor = matchAuthor(authors)
    DEBUG ? console.log('articleAuthor', articleAuthor) : undefined;

    // Author image
    const authorPhoto = getAuthorPhotoElement(articleAuthor.photo);
    DEBUG ? console.log('authorPhoto', authorPhoto) : undefined;

    // Author Link
    const authorLinkWithImage = getAuthorLinkElement(articleAuthor.photo, "", "_blank");
    authorLinkWithImage.appendChild(authorPhoto);
    DEBUG ? console.log('authorLinkWithImage', authorLinkWithImage) : undefined;

    // update DOM insert before author name
    const authorNameLink = getAuthorLinkElement(articleAuthor.about, "", "");
    const authorNameElement = document.getElementsByClassName("metainfo__item--author")[0]
    DEBUG ? console.log("authorNameElement ", authorNameElement) : undefined;
    const authorNameClone = authorNameElement.cloneNode(true);
    DEBUG ? console.log("authorNameClone ", authorNameElement) : undefined;
    authorNameLink.appendChild(authorNameClone);
    authorNameElement.replaceWith(authorNameLink);

    if (isDetailPage()) {
        const authorElement = document.getElementsByClassName("metainfo--content")[0]
        authorElement.insertBefore(authorLinkWithImage, authorElement.firstChild);
    }
}