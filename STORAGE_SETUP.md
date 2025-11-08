# Firebase Storage Setup Guide

This guide explains how to set up and deploy Firebase Storage security rules for profile picture uploads.

## Files Created

1. **`storage.rules`** - Security rules for Firebase Storage
2. **`firebase.json`** - Updated to include storage configuration

## Security Rules Overview

The storage rules allow:
- **Profile Pictures**: Users can only upload/read/delete their own profile pictures
  - Path: `profile-pictures/{userId}/{fileName}`
  - Requirements:
    - User must be authenticated
    - User can only access their own folder (userId must match auth.uid)
    - File must be an image
    - File size must be less than 5MB

- **Landing Page Images**: Public read access, authenticated write access
  - Path: `landing-page/{fileName}`

## Deployment Steps

### 1. Deploy Storage Rules

Deploy the security rules to Firebase:

```bash
firebase deploy --only storage
```

Or deploy everything:

```bash
firebase deploy
```

### 2. Verify Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** → **Rules**
4. Verify the rules are deployed correctly

### 3. Test the Rules

You can test the rules in the Firebase Console:
1. Go to **Storage** → **Rules**
2. Click **Rules Playground**
3. Test different scenarios:
   - Authenticated user uploading to their own folder ✅
   - Authenticated user trying to upload to another user's folder ❌
   - Unauthenticated user trying to upload ❌

## Troubleshooting CORS Errors

If you're still getting CORS errors after deploying rules:

### 1. Verify Authentication

Make sure the user is authenticated before uploading:
```javascript
import { useAuth } from 'AuthContext';

const { user } = useAuth();
if (!user) {
  // User must be logged in
}
```

### 2. Check Storage Bucket Configuration

Verify the storage bucket is correctly configured in `src/firebase.js`:
```javascript
storageBucket: "conscious-bookclub-87073-9eb71.appspot.com"
```

### 3. Verify Rules Are Deployed

Check that rules are deployed:
```bash
firebase deploy --only storage
```

### 4. Clear Browser Cache

Sometimes cached rules can cause issues. Try:
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Clear browser cache
- Try in incognito/private mode

### 5. Check Browser Console

Look for specific error messages in the browser console that might indicate:
- Authentication issues
- Permission denied errors
- Network errors

## Local Development

For local development with emulators:

```bash
firebase emulators:start
```

The storage emulator will use the rules from `storage.rules` automatically.

## Rule Testing

The current rules enforce:
- ✅ Users can upload images to `profile-pictures/{theirUserId}/`
- ✅ Users can read any profile picture (for displaying avatars)
- ✅ Users can only delete their own profile pictures
- ❌ Users cannot upload to other users' folders
- ❌ Unauthenticated users cannot upload
- ❌ Files must be images and under 5MB

## Updating Rules

If you need to update the rules:

1. Edit `storage.rules`
2. Deploy: `firebase deploy --only storage`
3. Test in the Rules Playground

## Common Issues

### "Permission denied" errors
- Check that user is authenticated
- Verify userId in path matches auth.uid
- Check file type and size restrictions

### CORS errors
- Usually means rules aren't deployed or user isn't authenticated
- Deploy rules: `firebase deploy --only storage`
- Verify authentication state

### "Storage not initialized" errors
- Check `src/firebase.js` has correct storage bucket
- Verify Firebase project configuration

