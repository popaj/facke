export class Author {
    constructor(id, firstName, lastName, code, about, lastModified, photo, created) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.code = code;
        this.about = about;
        this.lastModified = lastModified;
        this.photo = photo;
        this.created = created;
    }

    display() {
        console.log(`Author ID: ${this.id}, Name: ${this.firstName}`);
    }
}

export class AuthorBuilder {

    extractFirstNameWithMiddleNames(fullName) {
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        if (nameParts.length > 2) {
            const middleNames = nameParts.slice(1, -1).join(' ');
            return `${firstName} ${middleNames}`;
        }
        return firstName;
    }

    extractLastName(fullName) {
        const nameParts = fullName.split(' ');
        return nameParts[nameParts.length - 1];
    }

    getFormattedUtcTimestamp() {
        const date = new Date();

        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
    }

    constructor() {
        this.id = crypto.randomUUID();
        this.firstName = "";
        this.lastName = "";
        this.code = "";
        this.about = "";
        this.lastModified = "";
        this.photo = "";
        this.created = this.getFormattedUtcTimestamp();
    }

    setFirstName(fullName) {
        this.firstName = this.extractFirstNameWithMiddleNames(fullName);
        return this;
    }

    setLastName(fullName) {
        this.lastName = this.extractLastName(fullName);
        return this;
    }

    setCode(code) {
        this.code = code;
        return this;
    }

    setAbout(about) {
        this.about = about;
        return this;
    }

    setLastModified(lastModified) {
        this.lastModified = lastModified;
        return this;
    }

    setPhoto(photo) {
        this.photo = photo;
        return this;
    }

    build() {
        return new Author(this.id, this.firstName, this.lastName, this.code, this.about, this.lastModified, this.photo, this.created)
    }
}
