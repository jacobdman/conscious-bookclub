# Email Configuration

The support email functionality requires the following environment variables to be set:

## Required Environment Variables

### `EMAIL_USER`
**This is your Gmail account that will SEND the emails.** This must be a real Gmail account because Gmail's SMTP server requires authentication. You can use the same Gmail account for both sending and receiving.

```
EMAIL_USER=your-gmail@gmail.com
```

### `EMAIL_PASSWORD`
The Gmail app password for the account above (not your regular Gmail password). 

**Important**: You must use an [App Password](https://support.google.com/accounts/answer/185833) from your Google Account settings, not your regular Gmail password.

To generate an App Password:
1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification (enable it if not already enabled)
3. App passwords → Select app: "Mail" → Select device: "Other" → Generate
4. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

```
EMAIL_PASSWORD=your-16-character-app-password
```
(Remove spaces when adding to environment variables)

### `SUPPORT_EMAIL`
**This is where club creation requests will be SENT TO (the recipient).** This can be any email address - Gmail, Outlook, etc. If you want to receive emails at the same Gmail account you're using to send, just use the same address as `EMAIL_USER`.

```
SUPPORT_EMAIL=your-email@example.com
```

**Note**: You can use the same email for both `EMAIL_USER` and `SUPPORT_EMAIL` if you want to send and receive at the same Gmail account.

## Setting Environment Variables

### For Local Development
Create or update `functions/.env` file:
```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
SUPPORT_EMAIL=your-email@example.com
```

**Example** (if using same Gmail for both):
```
EMAIL_USER=myemail@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
SUPPORT_EMAIL=myemail@gmail.com
```

### For Firebase Functions (Production)
Set these in the Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Functions → Configuration → Environment Variables
4. Add:
   - `EMAIL_USER` = your Gmail address
   - `EMAIL_PASSWORD` = your app password (no spaces)
   - `SUPPORT_EMAIL` = where you want to receive emails (can be same as EMAIL_USER)

Or use Firebase CLI:
```bash
firebase functions:config:set email.user="your-gmail@gmail.com"
firebase functions:config:set email.password="your-app-password"
firebase functions:config:set support.email="your-email@example.com"
```

## Testing

After setting up the environment variables, test the email functionality by submitting a club creation request through the landing page form.

## Troubleshooting

- **"Email service is not configured"**: Check that `EMAIL_USER` and `EMAIL_PASSWORD` are set
- **"Support email is not configured"**: Check that `SUPPORT_EMAIL` is set
- **Authentication failed**: Verify you're using an App Password, not your regular Gmail password
- **Connection timeout**: Check your network/firewall settings

