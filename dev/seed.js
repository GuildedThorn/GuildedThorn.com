// Seed data for the GuildedThorn dev environment.
// Run inside the mongo container: mongosh guildedthorn_dev < dev/seed.js
// Field names mirror the C# models (driver maps property `Id` -> `_id`).

// --- User: thorn / 12345 (BCrypt.Net-Next, workFactor 10), owner role ---
db.Users.deleteMany({ Username: "thorn" });
db.Users.insertOne({
    _id: "6f6e0000-dev0-4000-8000-7468306e0001",
    Username: "thorn",
    PasswordHash: "$2a$10$Glv4Cpqrv5wbPdyrBQb7DO78GDHMjJ2kMv7.Yp1ZsZvqHreVwGbhS",
    AvatarUrl: "",
    FirstName: "Thorn",
    LastName: "Dev",
    Email: "thorn@guildedthorn.local",
    Role: "owner",
    Permissions: ["Test"],
    CreatedAt: new Date(),
});

// --- Blog posts ---
db.BlogPosts.deleteMany({});
db.BlogPosts.insertMany([
    {
        Title: "Hello from the dev seed",
        Content:
            "# Welcome\n\nThis post was inserted by `dev/seed.js`.\n\n" +
            "```csharp\nvar greeting = \"Hello, GuildedThorn!\";\nConsole.WriteLine(greeting);\n```\n\n" +
            "Code blocks exercise **rehype-highlight** on the blog page.",
        CreatedAt: new Date(Date.now() - 3 * 864e5),
        UpdatedAt: new Date(Date.now() - 3 * 864e5),
    },
    {
        Title: "Deploying with Nix flakes",
        Content:
            "## Flake-native\n\nThe app builds with `buildDotnetModule` + `buildNpmPackage`.\n\n" +
            "- `deps.json` pins NuGet\n- `npmDepsHash` pins npm\n- `nixos-rebuild switch` deploys",
        CreatedAt: new Date(Date.now() - 2 * 864e5),
        UpdatedAt: new Date(Date.now() - 2 * 864e5),
    },
    {
        Title: "Markdown stress test",
        Content:
            "Lists, *emphasis*, **bold**, [links](https://guildedthorn.com), and:\n\n" +
            "> A blockquote for good measure.\n\n1. one\n2. two\n3. three",
        CreatedAt: new Date(Date.now() - 864e5),
        UpdatedAt: new Date(Date.now() - 864e5),
    },
]);

// --- Guestbook (one message per user is enforced; thorn left free to post) ---
db.GuestBookMessages.deleteMany({});
db.GuestBookMessages.insertMany(
    [
        ["ada", "Lovely site! The dark mode is super clean."],
        ["linus", "Nice flake setup. Would deploy again."],
        ["grace", "The pomodoro chimes are a great touch."],
        ["dennis", "Greetings from the seed script."],
    ].map(([Username, Message], i) => ({
        _id: `dev-guestbook-${i + 1}`,
        Username,
        Message,
        CreatedAt: new Date(Date.now() - (4 - i) * 36e5),
        UpdatedAt: new Date(Date.now() - (4 - i) * 36e5),
    })),
);

// --- Gallery (matching placeholder files are written by dev/up.sh) ---
db.GalleryImages.deleteMany({});
db.GalleryImages.insertMany(
    [
        ["Crimson square", "Solid red placeholder from the dev seed."],
        ["Test pattern", "Second placeholder image."],
        ["Dev thumbnail", "Third placeholder image."],
    ].map(([Title, Description], i) => ({
        _id: `dev-gallery-${i + 1}`,
        Title,
        Description,
        MetaData: ["Source: dev/seed.js", "Camera: none"],
        FileType: "png",
        CreatedAt: new Date(Date.now() - (3 - i) * 36e5),
    })),
);

print(
    `Seeded: ${db.Users.countDocuments({ Username: "thorn" })} user, ` +
    `${db.BlogPosts.countDocuments()} blog posts, ` +
    `${db.GuestBookMessages.countDocuments()} guestbook messages, ` +
    `${db.GalleryImages.countDocuments()} gallery images`,
);
