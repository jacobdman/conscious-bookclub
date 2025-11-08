# Firebase Storage CORS Configuration

Firebase Storage requires CORS to be configured at the Google Cloud Storage bucket level for browser-based uploads to work in production.

## The Problem

- **Security Rules** (`storage.rules`) control WHO can access files
- **CORS Configuration** controls WHETHER browsers can make cross-origin requests
- Both are needed for uploads to work from web browsers

## Solution: Configure CORS on Your Storage Bucket

### Option 1: Using gsutil (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your project**:
   ```bash
   gcloud config set project conscious-bookclub-87073-9eb71
   ```

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://conscious-bookclub-87073-9eb71.firebasestorage.app
   ```

5. **Verify CORS is set**:
   ```bash
   gsutil cors get gs://conscious-bookclub-87073-9eb71.firebasestorage.app
   ```

### Option 2: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `conscious-bookclub-87073-9eb71`
3. Navigate to **Cloud Storage** → **Buckets**
4. Click on your bucket: `conscious-bookclub-87073-9eb71.firebasestorage.app`
5. Go to the **Configuration** tab
6. Scroll to **CORS configuration**
7. Click **Edit CORS configuration**
8. Paste the contents of `cors.json`:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
     }
   ]
   ```
9. Click **Save**

### Option 3: Using Firebase CLI (if supported)

Some Firebase projects allow CORS configuration through the CLI, but this is less common. The gsutil method is most reliable.

## Security Note

The CORS configuration is restricted to specific origins for better security:
- `https://jacobdayton.com` - Production domain
- `https://www.jacobdayton.com` - Production domain (www variant)
- `http://localhost:3000` - Local development (React app)
- `http://localhost:5002` - Local development (Firebase Hosting emulator)

**Note**: Since you use the storage emulator locally, the localhost origins are optional but included for flexibility in case you want to test against production storage.

## Verify It's Working

After configuring CORS:

1. Wait a few minutes for changes to propagate
2. Try uploading a profile picture in production
3. Check browser console - CORS errors should be gone
4. Check Network tab - requests should succeed

## Troubleshooting

### Still getting CORS errors?

1. **Wait 5-10 minutes** - CORS changes can take time to propagate
2. **Clear browser cache** - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. **Check the bucket name** - Make sure you're using the correct bucket:
   - `gs://conscious-bookclub-87073-9eb71.firebasestorage.app` (current bucket)
4. **Verify CORS is set**:
   ```bash
   gsutil cors get gs://conscious-bookclub-87073-9eb71.firebasestorage.app
   ```

### "Access Denied" errors

- Check that your security rules are deployed: `firebase deploy --only storage`
- Verify the user is authenticated
- Check that the userId in the path matches the authenticated user's ID

## Why This Is Needed

- **Local Development**: Storage emulator handles CORS automatically
- **Production**: Real Firebase Storage requires explicit CORS configuration
- **Security Rules**: Control access permissions
- **CORS**: Controls browser cross-origin request permissions

Both must be configured correctly for uploads to work in production.

