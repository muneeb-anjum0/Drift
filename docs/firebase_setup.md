# Firebase Storage

Drift can optionally store project documents in Firebase Storage. The app does not use Firestore or Firebase Authentication in the current Go backend. MongoDB remains the application database.

## When To Enable It

Leave Firebase disabled for local demos unless you need document uploads to persist outside the container.

```env
FIREBASE_STORAGE_ENABLED=false
FIREBASE_STORAGE_BUCKET=
GOOGLE_APPLICATION_CREDENTIALS=
MAX_UPLOAD_SIZE_MB=10
```

## Setup

1. Create or open a Firebase project.
2. Enable Cloud Storage for Firebase.
3. Create a service account key in Google Cloud IAM.
4. Save the JSON file outside Git, for example:

```text
server-go/firebase-service-account.json
```

5. Set:

```env
FIREBASE_STORAGE_ENABLED=true
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
MAX_UPLOAD_SIZE_MB=10
```

The repository ignores service account JSON files. Do not commit credentials.

## Upload Safety

The backend validates upload size, stores sanitized filenames, and only allows common document/image extensions:

```text
pdf, doc, docx, txt, png, jpg, jpeg, webp
```

Executable and web-script file types are rejected.

## Docker Notes

For Docker, mount the service account file into the backend container and set `GOOGLE_APPLICATION_CREDENTIALS` to the container path. Keep the file outside the image and outside Git.
