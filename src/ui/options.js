const NZZ_KEY = 'nzz.ch';

let allAuthors = []; // Global array to hold all authors

function exportAuthorsAsJson() {
    const jsonData = JSON.stringify(allAuthors, null, 2);
    const blob = new Blob([jsonData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `${dateStr}_${timeStr}_nzz_authors.json`;

    browser.downloads.download({
        url: url,
        filename: filename,
        saveAs: true, // prompts the user with a "save as" dialog
        conflictAction: 'uniquify' // this will modify the filename to avoid overwriting existing files
    }).then(() => {
        URL.revokeObjectURL(url); // clean up the object URL after the download starts
    }).catch(error => {
        console.error('Error triggering the download:', error);
    });
}

async function loadAuthors() {
    try {
        const data = await browser.storage.local.get(NZZ_KEY);
        allAuthors = data[NZZ_KEY] ? JSON.parse(data[NZZ_KEY]) : [];
        renderAuthors(allAuthors);
    } catch (error) {
        console.error('Error loading authors:', error);
    }
}

async function saveAuthor(authorData) {
    const existingAuthorIndex = allAuthors.findIndex(author => author.id === authorData.id);
    console.log('abe : ', allAuthors)
    if (existingAuthorIndex !== -1) {
        allAuthors[existingAuthorIndex] = {
            ...allAuthors[existingAuthorIndex],
            firstName: authorData.firstName,
            lastName: authorData.lastName,
            photo: authorData.photo,
            about: authorData.about,
            code: authorData.code,
            lastModified: new Date().toISOString()
        };
        console.log('after : ', allAuthors)
    } else {
        authorData.id = generateNewAuthorId();
        allAuthors.push(authorData);
    }

    try {
        await browser.storage.local.set({NZZ_KEY: JSON.stringify(allAuthors)});
        renderAuthors(allAuthors);
    } catch (error) {
        console.error('Error saving author:', error);
    }
}

function generateNewAuthorId() {
    return crypto.randomUUID();
}

function fillAuthorForm(author) {
    document.getElementById('authorId').value = author.id;
    document.getElementById('firstName').value = author.firstName;
    document.getElementById('lastName').value = author.lastName;
    document.getElementById('photoUrl').value = author.photo;
    document.getElementById('aboutUrl').value = author.about;
    document.getElementById('code').value = author.code;

    document.getElementById('authorForm').style.display = 'block';

    // Set the filter input to the author's name and trigger the filter
    const filterInput = document.getElementById('searchBox');
    filterInput.value = `${author.firstName} ${author.lastName}`;
    filterAuthors({target: filterInput});
}

function clearAndHideAuthorForm() {
    document.getElementById('authorId').value = '';
    document.getElementById('firstName').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('photoUrl').value = '';
    document.getElementById('aboutUrl').value = '';
    document.getElementById('code').value = '';

    // Hide the form
    document.getElementById('authorForm').style.display = 'none';
}

function renderAuthors(authors) {
    const authorsList = document.getElementById('authorsList');
    authorsList.innerHTML = ''; // Clear current authors

    authors.forEach(author => {
        const authorElement = document.createElement('div');
        authorElement.className = 'authorCard';
        authorElement.innerHTML = `
            <img src="${author.photo || 'default_photo_url.jpg'}" class="authorPhoto" alt="Author Photo">
            <div class="authorInfo">
                <div class="authorName">${author.firstName} ${author.lastName}</div>
                <!-- include other fields if necessary -->
            </div>`;

        // Add click event listener to each author element
        authorElement.addEventListener('click', function () {
            fillAuthorForm(author);
        });

        authorsList.appendChild(authorElement);
    });
}


function filterAuthors(event) {
    const searchText = event.target.value.toLowerCase();
    const filteredAuthors = allAuthors.filter(author =>
        `${author.firstName} ${author.lastName}`.toLowerCase().includes(searchText));

    renderAuthors(filteredAuthors);

    if (searchText === '') {
        clearAndHideAuthorForm();
    } else if (filteredAuthors.length > 0) {
        document.getElementById('authorForm').style.display = 'block';
    } else {
        document.getElementById('authorForm').style.display = 'none';
    }
}

document.getElementById('searchBox').addEventListener('input', event => {
    const searchText = event.target.value.toLowerCase();
    const filteredAuthors = allAuthors.filter(author =>
        author.firstName.toLowerCase().includes(searchText) ||
        author.lastName.toLowerCase().includes(searchText));
    renderAuthors(filteredAuthors);
});

function handleFormSubmit(event) {
    event.preventDefault();

    const authorData = {
        id: document.getElementById('authorId').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        photo: document.getElementById('photoUrl').value,
        about: document.getElementById('aboutUrl').value,
        code: document.getElementById('code').value,
    };

    saveAuthor(authorData);
}

document.getElementById('authorForm').addEventListener('submit', event => {
    event.preventDefault();

    const authorData = {
        id: document.getElementById('authorId').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        photo: document.getElementById('photoUrl').value,
        about: document.getElementById('aboutUrl').value,
        code: document.getElementById('code').value,
    };

    saveAuthor(authorData);
});

document.addEventListener('DOMContentLoaded', function () {
    loadAuthors();
    document.getElementById('authorForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('exportButton').addEventListener('click', exportAuthorsAsJson);
});
