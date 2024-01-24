'use strict';

const SLUG_REGEX = /\/+[a-z0-9-]+\.\d+/;
const DEBUG = false;
const SPACE = " ";
const COMMA = ",";
const UND = " und ";
const DEFAULT_AUTHOR_PHOTO = browser.runtime.getURL("src/asset/photo/default.jpg");

// City names that can be detected as authors
const CITIES = ["San Francisco", "Rio de Janeiro"]

function getAuthorLinkElement(href, linkText, target) {
    let authorLink = document.createElement("a");
    authorLink.href = href;
    authorLink.style.backgroundImage = "none";
    authorLink.style.textDecoration = "none";
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
    img.style.objectFit = "cover";
    img.style.width = "100px";
    img.style.height = "100px";
    img.style.borderRadius = "50px";
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

function extractArticleAuthors(articleAuthors, separator) {
    let authors = [];
    const authorParts = articleAuthors.split(separator)
    for (let i = 0; i < authorParts.length; i++) {
        const currentAuthor = cleanUpAuthorName(authorParts[i]);
        const isName = currentAuthor.includes(SPACE);
        const isCityName = CITIES.includes(currentAuthor);
        // example: https://www.nzz.ch/international/krieg-in-der-ukraine-die-neusten-entwicklungen-ld.1613540
        const isEditorialArticle = currentAuthor === "NZZ-Redaktion"
        if (isName && !isCityName && !isEditorialArticle) {
            authors.push(currentAuthor);
        }
    }
    return authors;
}

function getArticleAuthors() {
    let authors = []
    let articleAuthors = document.querySelector("span.metainfo__item--author").textContent
    if (articleAuthors.includes(COMMA)) {
        authors = extractArticleAuthors(articleAuthors, COMMA);
    } else if (articleAuthors.includes(UND)) {
        authors = extractArticleAuthors(articleAuthors, UND);
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
        browser.runtime.sendMessage({action: "addAuthor", host: window.location.host, author: articleAuthors[0]});
    }
}

// It must be ensured that the functionality only works on pages where an author is stored.
// Exceptions are the pages where the author is introduced.
// https://www.nzz.ch/impressum/impressum-ld.148422
// https://www.nzz.ch/impressum/rahel-zingg-zin-ld.1723835
function isDetailPage() {
    const impressum = window.location.pathname.includes("impressum");
    const detailPage = SLUG_REGEX.test(window.location.pathname);
    return detailPage && !impressum;
}

function addAuthorPhoto(authors) {
    DEBUG && console.log(`Updating DOM with authors: ${authors}`);

    const articleAuthors = matchAuthor(authors);
    if (!articleAuthors.length) return;

    let wrapperDiv = document.createElement("div");
    articleAuthors.forEach(author => {
        let authorDiv = document.createElement("div");
        authorDiv.style.float = "left";

        let authorAnchor = document.createElement("a");
        authorAnchor.target = "_blank";
        authorAnchor.href = author.photo;
        authorAnchor.style.cssText = "background-image: none; text-decoration: none;";

        let imgAuthor = getAuthorPhotoElement(author.photo);
        authorAnchor.appendChild(imgAuthor);
        authorDiv.appendChild(authorAnchor);

        let authorNameSpan = document.createElement("span");
        authorNameSpan.className = "metainfo__item--author";

        let authorLink = document.createElement("a");
        authorLink.href = author.about;
        authorLink.textContent = `${author.firstName} ${author.lastName}`;
        authorLink.style.cssText = "background-image: none; text-decoration: none;";

        authorNameSpan.appendChild(authorLink);
        authorDiv.appendChild(document.createElement("br"));
        authorDiv.appendChild(authorNameSpan);

        wrapperDiv.appendChild(authorDiv);
    });

    const metainfoElement = document.querySelector("span.metainfo__item");
    if (metainfoElement) metainfoElement.remove();

    const authorElement = document.getElementsByClassName("metainfo--content")[0];
    if (authorElement) authorElement.insertBefore(wrapperDiv, authorElement.firstChild);
}

function requestAuthors() {
    browser.runtime.sendMessage({action: "getAuthors", host: window.location.host});
}

// RECEIVER, message listener
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "getAuthors" && isDetailPage()) {
        const payload = typeof message.data === "string" ? JSON.parse(message.data) : message.data;
        addAuthorPhoto(payload)
    }
});

document.readyState === "complete" || document.readyState === "interactive"
    ? requestAuthors()
    : document.addEventListener("DOMContentLoaded", requestAuthors);
