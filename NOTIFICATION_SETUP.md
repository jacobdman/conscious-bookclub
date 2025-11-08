# Push Notification Setup Guide

This guide explains how to configure VAPID keys for push notifications in the Conscious Book Club application.

## What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are used to authenticate your application server when sending push notifications to browsers. You need both a public key (used by the frontend) and a private key (used by the backend).

## Generating VAPID Keys

### Using web-push library (Recommended)

1. Install the web-push library globally:
```bash
npm install -g web-push
```

2. Generate VAPID keys:
```bash
web-push generate-vapid-keys
```

This will output something like:
```
Public Key: BKx...your-public-key...xyz
Private Key: 8k...your-private-key...abc
```

### Using Node.js script

Alternatively, you can create a temporary script:

```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

## Frontend Configuration

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the public key:
```
REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here
```

3. Restart your development server after adding the environment variable

**Note**: The `.env` file should be in `.gitignore` to keep your keys secure.

## Backend Configuration (Firebase Functions)

1. Set the environment variables in Firebase Functions:
```bash
firebase functions:config:set vapid.public_key="your-public-key-here"
firebase functions:config:set vapid.private_key="your-private-key-here"
firebase functions:config:set vapid.email="mailto:your-email@example.com"
```

2. Deploy the functions:
```bash
firebase deploy --only functions
```

### Alternative: Using Firebase Functions Environment Variables (v2)

For Firebase Functions v2, use the `firebase functions:secrets:set` command:

```bash
firebase functions:secrets:set VAPID_PUBLIC_KEY
firebase functions:secrets:set VAPID_PRIVATE_KEY
firebase functions:secrets:set VAPID_EMAIL
```

Or set them directly in the Firebase Console:
1. Go to Firebase Console → Functions → Configuration
2. Add the environment variables:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL` (optional, defaults to "mailto:admin@consciousbookclub.com")

## Verification

After configuration:

1. **Frontend**: Check that the notification permission prompt no longer shows "VAPID public key is not configured" error
2. **Backend**: Check Firebase Functions logs to ensure VAPID keys are loaded (no "VAPID keys not configured" messages)

## Security Notes

- **Never commit VAPID keys to version control**
- Keep the private key secure - it should only be used on the server
- The public key can be safely exposed in the frontend
- Rotate keys periodically for security best practices

## Troubleshooting

### Frontend: "VAPID public key is not configured"
- Ensure `.env` file exists in project root
- Verify `REACT_APP_VAPID_PUBLIC_KEY` is set correctly
- Restart the development server after adding the variable
- For production builds, ensure the environment variable is set in your deployment environment

### Backend: "VAPID keys not configured"
- Verify environment variables are set in Firebase Functions
- Check that variable names match exactly: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Redeploy functions after setting environment variables
- Check Firebase Functions logs for any configuration errors

