# Firebase Firestore Integration Guide

## Overview
Drift has been integrated with Firebase for cloud-based authentication and persistent data storage. This guide explains the setup, configuration, and migration strategy.

## Architecture

### Frontend (Firebase Auth)
- **Service**: Firebase Authentication SDK
- **File**: `client/src/contexts/AuthContext.tsx`
- **Features**:
  - Sign up with email/password
  - Sign in with Firebase credentials
  - Automatic ID token generation and refresh
  - Logout support
  - User state management

### Backend (Firebase Admin + Firestore)
- **Services**:
  - `server/src/config/firebase.ts` - Firebase Admin SDK initialization
  - `server/src/middlewares/firebaseAuth.middleware.ts` - Token verification
  - `server/src/services/firestore.service.ts` - Firestore database abstraction
  - `server/src/services/firebaseUser.service.ts` - User management
  - `server/src/services/firebaseInit.service.ts` - Collection schemas
- **Database**: Firestore (Cloud Firestore)
- **Authentication**: Firebase ID tokens

### API Client Integration
- **File**: `client/src/api/axios.ts`
- **Feature**: Automatic Firebase ID token attachment to all API requests
- **Header**: `Authorization: Bearer {idToken}`

## Setup Instructions

### 1. Firebase Project Credentials

Get your Firebase service account JSON from Firebase Console:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Update `.env` file in the server directory:

```env
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key (replace \n with actual newlines)
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CERT_URL=your_cert_url
```

### 2. Initialize Firestore Collections

Run the initialization script to create required collections:

```bash
cd server
npx ts-node src/services/firebaseInit.service.ts
```

This creates the following collections:
- `users` - User profiles
- `workspaces` - Team workspaces
- `workspaceMembers` - Workspace memberships
- `projects` - Projects
- `requirements` - Requirements documents
- `driftAnalyses` - Drift detection results
- `changeRequests` - Change requests
- `activities` - Activity logs

### 3. Enable Firestore Mode

Update `server/.env`:

```env
USE_FIRESTORE=true
```

**Note**: This is currently set to `false`. Set to `true` only after testing the migration.

## Services

### Workspace Service
- **MongoDB**: `server/src/services/workspace.service.ts`
- **Firestore**: `server/src/services/firestoreWorkspace.service.ts`
- **Features**: CRUD operations for workspaces and membership

### Project Service
- **MongoDB**: `server/src/services/project.service.ts`
- **Firestore**: `server/src/services/firestoreProject.service.ts`
- **Features**: Project management within workspaces

### Requirement Service
- **MongoDB**: `server/src/services/requirement.service.ts`
- **Firestore**: `server/src/services/firestoreRequirement.service.ts`
- **Features**: Requirement CRUD and versioning

### Drift Analysis Service
- **MongoDB**: `server/src/services/driftDetection.service.ts`
- **Firestore**: `server/src/services/firestoreDrift.service.ts`
- **Features**: Drift detection and analysis storage

### Change Request Service
- **MongoDB**: `server/src/services/changeRequest.service.ts`
- **Firestore**: `server/src/services/firestoreChangeRequest.service.ts`
- **Features**: Change request management

### Activity Service
- **Hybrid**: `server/src/services/activity.service.ts`
- **Features**: Activity logging to both MongoDB and Firestore

## Authentication Flow

### Frontend Sign Up
```
User → Sign Up Form → Firebase Auth SDK → Create User
                                        → Receive ID Token
                                        → Store in Auth Context
```

### Frontend Login
```
User → Login Form → Firebase Auth SDK → Authenticate
                                      → Receive ID Token
                                      → Store in Auth Context
```

### Backend Authorization
```
API Request → Axios Interceptor → Attach ID Token → Server Middleware
                                                  → Verify Token
                                                  → Extract User UID
                                                  → Continue to Controller
```

## Migration Strategy

### Phase 1: Setup (✅ Completed)
- Firebase Admin SDK configured
- Firebase Auth Context created
- Firestore services implemented
- Controllers updated with conditional logic
- Environment variables configured

### Phase 2: Testing (⏳ Pending)
1. Set `USE_FIRESTORE=true` in `.env`
2. Test user creation on signup
3. Test workspace/project creation
4. Verify data persistence
5. Test activity logging

### Phase 3: Data Migration (⏳ Pending)
If migrating from MongoDB:
1. Export data from MongoDB collections
2. Transform to Firestore schema
3. Import into Firestore
4. Verify data integrity
5. Switch production traffic

### Phase 4: Cleanup (⏳ Pending)
- Remove MongoDB collections (if not needed)
- Archive old data
- Update documentation

## Firestore Security Rules

Configure Firestore security rules to:
- Allow authenticated users to read/write their own workspace data
- Prevent cross-workspace access
- Audit sensitive operations

Example rules (to be implemented):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    match /workspaces/{workspaceId} {
      allow read, write: if request.auth.uid in resource.data.members;
    }
    
    match /workspaceMembers/{doc=**} {
      allow read, write: if checkWorkspaceAccess(doc.split('/')[1]);
    }
  }
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_PRIVATE_KEY_ID` | Firebase key ID | `abc123...` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_CLIENT_ID` | Firebase client ID | `123456789` |
| `FIREBASE_CERT_URL` | Certificate URL | `https://www.googleapis.com/...` |
| `USE_FIRESTORE` | Enable Firestore mode | `false` (or `true` when ready) |

## Troubleshooting

### Issue: "Firebase credentials not configured"
**Solution**: Ensure all four Firebase environment variables are set in `.env`

### Issue: "Permission denied" when accessing Firestore
**Solution**: Check Firestore security rules and user authentication status

### Issue: "Workspace not found"
**Solution**: Verify workspace exists in correct Firestore collection and user has access

### Issue: "Token verification failed"
**Solution**: Ensure Firebase ID token is fresh (refresh if older than 1 hour)

## Testing

### Test Firebase Auth Flow
```bash
cd client
npm run dev
# Go to /register or /login
# Sign up/in with test email
# Verify redirect to dashboard
# Check browser dev tools for ID token in Authorization header
```

### Test Backend Firestore Access
```bash
cd server
npm run dev
# Use Postman/Thunder Client
# Send authenticated request to any protected endpoint
# Verify backend receives and validates Firebase token
```

## Next Steps

1. ✅ Install Firebase SDKs
2. ✅ Create Auth Context and Firestore services
3. ✅ Update controllers with conditional logic
4. ⏳ Get Firebase service account credentials
5. ⏳ Set `USE_FIRESTORE=true` and test
6. ⏳ Migrate data from MongoDB to Firestore
7. ⏳ Configure Firestore security rules
8. ⏳ Deploy to production

## References

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
