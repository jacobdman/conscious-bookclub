# Socket.io Cloud Run Service

Standalone Socket.io service deployed on Google Cloud Run for real-time WebSocket connections.

## Architecture

- **Service**: Socket.io server containerized with Docker
- **Deployment**: Google Cloud Run (serverless, scales to zero)
- **Routing**: Firebase Hosting rewrites `/ws/**` to this Cloud Run service
- **Authentication**: Firebase Auth token verification

## Local Development

1. **Install dependencies**:
   ```bash
   cd socket-service
   npm install
   ```

2. **Set up Firebase Admin credentials** (only needed for local dev):
   
   **Note**: In production (Cloud Run), credentials are automatically provided - you don't need to set this up.
   
   For local development, choose one:
   
   - **Option A: Use gcloud auth (Easier)**:
     ```bash
     gcloud auth application-default login
     ```
     This uses your personal Google account and doesn't require downloading any files. The Firebase Admin SDK will automatically find the credentials at `~/.config/gcloud/application_default_credentials.json` - no need to set any environment variables.
   
   - **Option B: Use service account JSON file**:
     1. Create/download a service account key from [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
     2. Set the environment variable with the **actual path** to your downloaded JSON file:
        ```bash
        export GOOGLE_APPLICATION_CREDENTIALS=/Users/yourname/Downloads/service-account-key.json
        ```
        (Replace with your actual file path)

3. **Run locally**:
   ```bash
   PORT=3001 npm start
   ```

4. **Test health check**:
   ```bash
   curl http://localhost:3001/healthz
   ```

## Cloud Run Deployment

### Prerequisites

1. **Enable required APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

2. **Set your project**:
   ```bash
   gcloud config set project conscious-bookclub-87073-9eb71
   ```

### Initial Deployment

1. **Build Docker image**:
   ```bash
   cd socket-service
   gcloud builds submit --tag gcr.io/conscious-bookclub-87073-9eb71/socket-service
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy socket-service \
     --image gcr.io/conscious-bookclub-87073-9eb71/socket-service \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --min-instances 0 \
     --max-instances 10 \
     --memory 512Mi \
     --cpu 1 \
     --timeout 3600 \
     --set-env-vars NODE_ENV=production
   ```

3. **Get the service URL**:
   After deployment completes, the URL will be displayed in the output. Look for a line like:
   ```
   Service URL: https://socket-service-xxx-uc.a.run.app
   ```
   
   If you missed it, you can also get it with:
   ```bash
   gcloud run services describe socket-service --region us-central1 --format 'value(status.url)'
   ```
   
   **Note**: You actually don't need the URL for Firebase Hosting - the rewrite rule in `firebase.json` automatically finds the service by name. But it's useful for testing.

### Subsequent Deployments

```bash
cd socket-service
gcloud builds submit --tag gcr.io/conscious-bookclub-87073-9eb71/socket-service
gcloud run deploy socket-service \
  --image gcr.io/conscious-bookclub-87073-9eb71/socket-service \
  --region us-central1
```

## Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` in Cloud Run
- `PORT`: Automatically set by Cloud Run (default: 8080)
- `PRODUCTION_DOMAIN`: Optional, defaults to Firebase Hosting domain
- `GOOGLE_APPLICATION_CREDENTIALS`: **Not needed in Cloud Run** - credentials are automatically provided by the service account attached to the Cloud Run service

### Firebase Hosting Integration

The service is configured to work with Firebase Hosting rewrites. The `firebase.json` file includes:

```json
{
  "source": "/ws/**",
  "run": {
    "serviceId": "socket-service",
    "region": "us-central1"
  }
}
```

**Note**: Firebase Hosting rewrites to Cloud Run require Firebase Blaze plan (pay-as-you-go).

## Features

- **Authentication**: All connections require valid Firebase Auth token
- **Rate Limiting**: Token bucket rate limiter (10 tokens, refills 1/second)
- **Health Check**: `/healthz` endpoint for Cloud Run health checks
- **CORS**: Configured for production domain (or all origins in dev)
- **Keep-Alive**: Optimized for Cloud Run's 60-minute connection limit
  - `pingInterval`: 25000ms
  - `pingTimeout`: 20000ms
  - `keepAliveTimeout`: 65000ms

## Cost Estimation

- **Free Tier**: 2 million requests/month, 360K GB-seconds
- **After Free Tier**: ~$0.00002400 per request, $0.00000250 per GB-second
- **Estimated Cost**: $0-5/month for small-medium usage (scales to zero when idle)

## Troubleshooting

### Connection Issues

1. **Check Cloud Run service is running**:
   ```bash
   gcloud run services describe socket-service --region us-central1
   ```

2. **View logs**:
   ```bash
   gcloud run services logs read socket-service --region us-central1
   ```

3. **Test health endpoint**:
   ```bash
   curl https://socket-service-xxx-uc.a.run.app/healthz
   ```

### Authentication Errors

- Verify Firebase Admin SDK is initialized correctly
- Check service account has necessary permissions
- Ensure Firebase Auth tokens are valid

### CORS Errors

- Verify `PRODUCTION_DOMAIN` environment variable matches your domain
- Check CORS configuration in `server.js`

### Firebase Hosting Rewrite Not Working

- Verify Firebase Blaze plan is enabled
- Check `firebase.json` rewrite rule is correct
- Ensure Cloud Run service name matches `serviceId` in rewrite rule
- Deploy hosting: `firebase deploy --only hosting`

## Security

- All connections require Firebase Auth token verification
- Rate limiting prevents spam/abuse
- CORS restricted to production domain (in production mode)
- Cloud Run IAM controls access (allows unauthenticated for Firebase Hosting)

