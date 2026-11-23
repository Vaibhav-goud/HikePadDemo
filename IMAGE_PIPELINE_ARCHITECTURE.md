# Technical Documentation: Image Pipeline Architecture (March Madness)

## 1. Architecture and Data Flow

The image pipeline for the **March Madness** page is designed to be entirely independent of the core operational data (admissions/performance) pipeline. This ensures that heavy binary storage (images) does not interfere with the high-frequency syncing and processing of sales data.

### Data Flow Diagram:
`Google Drive (Storage)` → `Google Apps Script (Automation)` → `Firebase (Metadata API)` → `React Frontend (Display)`

1.  **Storage (Google Drive)**: Users upload images to a shared Google Drive folder.
2.  **Automation (Google Apps Script)**: A time-driven script runs every 5 minutes.
    *   It scans the designated Drive folder for new files.
    *   It identifies new images by comparing file IDs against previously stored IDs in `ScriptProperties`.
    *   It generates a direct view URL: `https://drive.google.com/uc?export=view&id=FILE_ID`.
    *   It pushes the metadata to Firebase Realtime Database under the `images` node.
3.  **Metadata Layer (Firebase RTDB)**: Stores only the lightweight records:
    *   `name`: Original file name.
    *   `driveFileId`: Unique Google Drive identifier.
    *   `imageUrl`: Direct link for browser rendering.
    *   `uploadedAt`: Timestamp of the sync.
4.  **Frontend (React)**: The March Madness page fetches the metadata from Firebase and renders the images directly using the Drive URLs.

---

## 2. Why Firebase as a Metadata API Layer?

Firebase was chosen over a traditional backend approach for several reasons:
*   **Speed & Latency**: Real-time updates allow the dashboard to reflect new uploads almost instantly without a server-side poll.
*   **Lightweight**: Since we only store metadata, Firebase handles the JSON payload efficiently without the overhead of a full relational or document database setup.
*   **REST API Support**: Firebase provides a built-in REST API, allowing the frontend to fetch data via `fetch('https://.../images.json')` without needing custom Express routes.

---

## 3. Why MongoDB is Intentionally Excluded

MongoDB is the primary database for admissions and performance data. It is kept separate from the image pipeline for these reasons:
*   **Workflow Independence**: The main data pipeline uses GitHub Actions to sync Google Sheets to MongoDB. Adding images to this flow would require complex modifications to the sync scripts and potentially slow down the CI/CD pipeline.
*   **Database Bloat**: Storing image metadata in MongoDB would mix operational data with ephemeral contest media, making backups and migrations more cumbersome.
*   **Separation of Concerns**: By keeping images in Firebase, we ensure that the image gallery remain functional even during main database maintenance.

---

## 4. Advantages of Separation

*   **Scalability**: We can scale the image storage (Google Drive) and metadata layer (Firebase) independently of the main application database.
*   **Resilience**: A failure in the main admissions pipeline (e.g., a Google Sheet format change) will not break the March Madness image gallery.
*   **Development Speed**: Experimental features for the image gallery can be implemented in the Apps Script and Frontend without touching the Node.js backend.

---

## 5. React Frontend Consumption

The React frontend (March Madness page) consumes the Firebase data directly.

*   **Fetching**: Uses a standard `fetch` call to the Firebase REST endpoint: `https://[PROJECT-ID].firebasedatabase.app/images.json`.
*   **Data Structure**: Converts the Firebase JSON object (keyed by push ID) into an array of image objects.
*   **Rendering**: Uses standard HTML `<img>` tags with the `imageUrl` property.

---

## 6. Duplicate Prevention (Google Apps Script)

The script avoids redundant uploads by using `PropertiesService` (ScriptProperties):
1.  **Stored IDs**: The script maintains a list of processed `driveFileId`s.
2.  **Comparison**: Each time the script runs, it checks if a File ID already exists in the store.
3.  **Persistence**: Only unique File IDs that have not been processed yet are pushed to Firebase, ensuring no duplicate metadata records are created.
