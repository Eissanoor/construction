# Landing Page CMS

Node.js, Express, and MongoDB API for a construction landing page. Every section is one document in a single `LandingPage` collection. The document is identified by `sectionKey` (`header`, `hero`, `about`, `services`, `projects`, `why-us`, `process`, `testimonials`, `cta`, `contact`, `footer`).

The database stores content only. It does not store React components or HTML templates. The public site reads active sections in `order` and chooses the component from `sectionKey`.

## Architecture

```text
src/
├── config/
│   ├── db.js
│   └── sectionConfig.js      # section keys, editor fields, item rules
├── models/
│   └── LandingPage.js        # the only landing-page model
├── validators/
│   └── landingPageValidator.js
├── services/
│   └── landingPageService.js
├── controllers/
│   └── landingPageController.js
├── routes/
│   └── landingPageRoutes.js
├── middleware/
├── utils/
└── seed/
```

`sectionConfig.js` is the extension point. Adding a section there updates the model enum, Joi validation, and `GET /api/landing-page/config`. The admin UI should use that config to render one `SectionEditor` for every section:

| Config `component` | Editor |
| --- | --- |
| `TextField` | Short text |
| `RichTextEditor` | Long text |
| `ImageUploader` | Saves a URL or path into an image field |
| `ButtonEditor` | `{ text, link }` |
| `SortableItems` | Ordered `items` array |
| `SectionSettings` | Flexible `settings` object |

`items` and `settings` stay schemaless in MongoDB. Joi checks the fields each section is expected to have, and still allows extra keys inside items and settings.

## Setup

```bash
npm install
copy .env.example .env
npm run check
npm run seed
npm run dev
```

`npm run test:api` exercises every endpoint against a separate database, `construction_site_cms_test`, and deletes that database afterward.

MongoDB must be running at `MONGODB_URI`. With Docker:

```bash
docker compose up -d
```

`npm run seed` inserts the 11 default sections. If documents already exist, run `npm run seed -- --force` to replace them.

Admin routes are not authenticated. Put them behind auth before production. The public route is safe to expose.

## Response format

Success:

```json
{
  "status": true,
  "message": "Landing page section fetched successfully",
  "data": {}
}
```

Error:

```json
{
  "status": false,
  "message": "Landing page section not found",
  "data": null
}
```

Validation errors add an `errors` array:

```json
{
  "status": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    { "field": "title", "message": "title is required" }
  ]
}
```

| Status | When |
| --- | --- |
| 200 | Read, update, delete, status, reorder |
| 201 | Section created |
| 400 | Invalid body or unknown `sectionKey` |
| 404 | Section or route not found |
| 409 | `sectionKey` already exists |
| 500 | Unexpected server error |

Image fields are strings (`/uploads/commercial.jpg` or an absolute URL). Nested `button`, `items`, and `settings` are replaced as a whole when sent on update. `sectionKey` cannot be changed. `_id`, `createdAt`, and `updatedAt` are ignored if a client sends the document back.

The examples below show the fields that matter for each call. A real response also includes the rest of the section document, including empty defaults and timestamps.

## Endpoints

### Create section

`POST /api/landing-page`

```powershell
curl.exe -X POST http://localhost:5000/api/landing-page -H "Content-Type: application/json" -d '{"sectionKey":"services","sectionName":"Services","order":3,"title":"Full-spectrum construction","description":"Professional construction services.","items":[{"number":"01","title":"Commercial Construction","description":"Offices, retail and mixed-use buildings.","image":"/uploads/commercial.jpg"},{"number":"02","title":"Residential Construction","description":"Professional residential construction.","image":"/uploads/residential.jpg"}]}'
```

`201`

```json
{
  "status": true,
  "message": "Landing page section created successfully",
  "data": {
    "sectionKey": "services",
    "sectionName": "Services",
    "order": 3,
    "title": "Full-spectrum construction",
    "description": "Professional construction services.",
    "items": [
      {
        "number": "01",
        "title": "Commercial Construction",
        "description": "Offices, retail and mixed-use buildings.",
        "image": "/uploads/commercial.jpg"
      }
    ],
    "isActive": true
  }
}
```

Hero requires `title`. Header and footer do not. A second create with the same `sectionKey` returns `409`.

### Get all sections

`GET /api/landing-page`

Returns every section, including inactive ones, sorted by `order` ascending.

```powershell
curl.exe http://localhost:5000/api/landing-page
```

`200`

```json
{
  "status": true,
  "message": "Landing page sections fetched successfully",
  "data": [
    { "sectionKey": "header", "order": 0 },
    { "sectionKey": "hero", "order": 1 },
    { "sectionKey": "services", "order": 3 }
  ]
}
```

### Get one section

`GET /api/landing-page/:sectionKey`

```powershell
curl.exe http://localhost:5000/api/landing-page/services
```

`200`

```json
{
  "status": true,
  "message": "Landing page section fetched successfully",
  "data": {
    "sectionKey": "services",
    "sectionName": "Services",
    "order": 3,
    "title": "Full-spectrum construction",
    "description": "Professional construction services.",
    "items": []
  }
}
```

Unknown keys such as `section_1` return `400` with message `Invalid section key`. A known key with no document returns `404`.

### Update section

`PUT /api/landing-page/:sectionKey`

Send only the fields that should change, or send the full section from GET. Omitted fields stay as they are.

```powershell
curl.exe -X PUT http://localhost:5000/api/landing-page/services -H "Content-Type: application/json" -d '{"title":"Our services","description":"Professional construction services.","items":[{"number":"01","title":"Commercial Construction","description":"Offices, retail and mixed-use buildings.","image":"/uploads/commercial.jpg"}]}'
```

`200`

```json
{
  "status": true,
  "message": "Landing page section updated successfully",
  "data": {
    "sectionKey": "services",
    "title": "Our services",
    "items": [
      {
        "number": "01",
        "title": "Commercial Construction",
        "description": "Offices, retail and mixed-use buildings.",
        "image": "/uploads/commercial.jpg"
      }
    ]
  }
}
```

### Delete section

`DELETE /api/landing-page/:sectionKey`

```powershell
curl.exe -X DELETE http://localhost:5000/api/landing-page/services
```

`200`

```json
{
  "status": true,
  "message": "Landing page section deleted successfully",
  "data": {
    "sectionKey": "services",
    "sectionName": "Services",
    "order": 3
  }
}
```

### Toggle or set status

`PATCH /api/landing-page/:sectionKey/status`

Omit `isActive` to flip the current value. Send `isActive` to set it.

```powershell
curl.exe -X PATCH http://localhost:5000/api/landing-page/services/status -H "Content-Type: application/json" -d '{"isActive":false}'
```

`200`

```json
{
  "status": true,
  "message": "Landing page section status updated successfully",
  "data": {
    "sectionKey": "services",
    "isActive": false
  }
}
```

Inactive sections stay available in the admin API and are omitted from the public API.

### Reorder sections

`PATCH /api/landing-page/reorder`

`sectionKey` stays stable when the order changes. The body can include every section or only the ones that moved. Orders in one request must be unique.

```powershell
curl.exe -X PATCH http://localhost:5000/api/landing-page/reorder -H "Content-Type: application/json" -d '{"sections":[{"sectionKey":"hero","order":1},{"sectionKey":"about","order":2},{"sectionKey":"services","order":3}]}'
```

`200`

```json
{
  "status": true,
  "message": "Landing page sections reordered successfully",
  "data": [
    { "sectionKey": "header", "order": 0 },
    { "sectionKey": "hero", "order": 1 },
    { "sectionKey": "about", "order": 2 },
    { "sectionKey": "services", "order": 3 }
  ]
}
```

Default order is header `0`, hero `1`, about `2`, services `3`, projects `4`, why-us `5`, process `6`, testimonials `7`, cta `8`, contact `9`, footer `10`.

### Editor config

`GET /api/landing-page/config`

```powershell
curl.exe http://localhost:5000/api/landing-page/config
```

`200`

```json
{
  "status": true,
  "message": "Landing page editor config fetched successfully",
  "data": [
    {
      "sectionKey": "services",
      "sectionName": "Services",
      "defaultOrder": 3,
      "fields": [
        { "name": "sectionName", "component": "TextField", "label": "Section name", "required": true },
        { "name": "title", "component": "TextField", "label": "Title", "required": true },
        { "name": "description", "component": "RichTextEditor", "label": "Description" },
        {
          "name": "items",
          "component": "SortableItems",
          "label": "Services",
          "sortable": true,
          "itemFields": [
            { "name": "number", "component": "TextField", "label": "Number" },
            { "name": "title", "component": "TextField", "label": "Title", "required": true }
          ]
        }
      ]
    }
  ]
}
```

Admin flow for every section:

```text
GET /api/landing-page/services
GET /api/landing-page/config
edit the fields listed for that sectionKey
PUT /api/landing-page/services
```

### Public landing page

`GET /api/public/landing-page`

Active sections only, sorted by `order`.

```powershell
curl.exe http://localhost:5000/api/public/landing-page
```

`200`

```json
{
  "status": true,
  "message": "Landing page fetched successfully",
  "data": [
    { "sectionKey": "header", "order": 0, "isActive": true },
    { "sectionKey": "hero", "order": 1, "title": "Building spaces that last" },
    { "sectionKey": "about", "order": 2 },
    { "sectionKey": "services", "order": 3, "items": [] }
  ]
}
```

```js
sections.map((section) => {
  switch (section.sectionKey) {
    case "hero":
      return <Hero data={section} />;
    case "about":
      return <About data={section} />;
    case "services":
      return <Services data={section} />;
    case "projects":
      return <Projects data={section} />;
    default:
      return null;
  }
});
```

## Section content

| sectionKey | Required on create | Item fields |
| --- | --- | --- |
| `header` | section name, order | `label`, `link` |
| `hero` | title | — |
| `about` | title | `title`, `value`, `description` |
| `services` | title | `number`, `title`, `description`, `image` |
| `projects` | title | `title`, `category`, `description`, `image`, `link` |
| `why-us` | title | `icon`, `title`, `description` |
| `process` | title | `number`, `title`, `description` |
| `testimonials` | title | `name`, `position`, `company`, `message`, `image` |
| `cta` | title | — |
| `contact` | title | `label`, `value`, `type` |
| `footer` | section name, order | `group`, `label`, `link` |

Testimonial items require `name` and `message`:

```json
{
  "name": "John Doe",
  "position": "CEO",
  "company": "ABC Company",
  "message": "Excellent service.",
  "image": "/uploads/john.jpg"
}
```

## Add a section later

1. Add a definition in `src/config/sectionConfig.js` (`sectionKey`, `sectionName`, `defaultOrder`, `requiredOnCreate`, `fields`, and optional `itemSchema` / `settingsSchema`).
2. Add default content in `src/seed/defaultSections.js` if you want it seeded.
3. Add a frontend component and a `switch` case for the new `sectionKey`.

No new Mongoose model is required.
