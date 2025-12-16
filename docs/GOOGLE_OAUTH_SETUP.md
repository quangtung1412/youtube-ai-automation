# 🔐 Google OAuth Setup Guide

## Step-by-Step Instructions

### 1. Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 2. Create a New Project (or select existing)

1. Click on the project dropdown at the top
2. Click "New Project"
3. Enter project name: "AI Video Automation"
4. Click "Create"

### 3. Enable Google+ API

1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### 4. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in required fields:
   - App name: "AI Video Automation"
   - User support email: Your email
   - Developer contact: Your email
5. Click "Save and Continue"
6. Skip "Scopes" page (click "Save and Continue")
7. Add test users (your email) if needed
8. Click "Save and Continue"

### 5. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Fill in:
   - Name: "AI Video Automation Web Client"
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
5. Click "Create"
6. **IMPORTANT**: Copy your Client ID and Client Secret

### 6. Update .env.local

Open `.env.local` and update:

```env
AUTH_SECRET="generate-random-string-here"
AUTH_GOOGLE_ID="your-client-id-from-step-5"
AUTH_GOOGLE_SECRET="your-client-secret-from-step-5"
NEXTAUTH_URL="http://localhost:3000"
```

### 7. Generate AUTH_SECRET

Run this command to generate a secure secret:

**PowerShell:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Or use this online:** https://generate-secret.vercel.app/32

Copy the generated string to `AUTH_SECRET` in `.env.local`

### 8. Restart Your Server

```bash
npm run dev
```

### 9. Test Authentication

1. Visit: http://localhost:3000
2. Click "Sign In to Get Started"
3. Click "Sign in with Google"
4. Select your Google account
5. You should be redirected to /dashboard

## ✅ Verification Checklist

- [ ] Google Cloud Project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Authorized redirect URI added: `http://localhost:3000/api/auth/callback/google`
- [ ] Client ID copied to .env.local
- [ ] Client Secret copied to .env.local
- [ ] AUTH_SECRET generated and added
- [ ] Server restarted
- [ ] Sign in works successfully

## 🚀 Production Setup

When deploying to production:

1. Add your production domain to authorized origins:
   ```
   https://yourdomain.com
   ```

2. Add production redirect URI:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

3. Update .env.local on production:
   ```env
   NEXTAUTH_URL="https://yourdomain.com"
   ```

4. Switch OAuth consent screen to "Production" when ready

## 🆘 Troubleshooting

### Error: "redirect_uri_mismatch"

**Solution**: Make sure the redirect URI in Google Console exactly matches:
```
http://localhost:3000/api/auth/callback/google
```

### Error: "invalid_client"

**Solution**: Double-check your Client ID and Secret are correctly copied to .env.local

### Error: "Access blocked: This app's request is invalid"

**Solution**: 
1. Make sure Google+ API is enabled
2. OAuth consent screen is configured
3. Your email is added as a test user

### Can't see sign in page

**Solution**: Make sure middleware is not blocking /auth/signin route

## 📚 Additional Resources

- [NextAuth.js Documentation](https://authjs.dev/)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth Google Provider](https://authjs.dev/getting-started/providers/google)

---

**Need help?** Check the main SETUP_GUIDE.md or open an issue on GitHub.
