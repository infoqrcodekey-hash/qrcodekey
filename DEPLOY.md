# QR Code Tracking System - Deployment Guide

This guide walks you through deploying the QR Code Tracking System with the backend on Railway and frontend on Vercel.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment to Railway](#backend-deployment-to-railway)
3. [Frontend Deployment to Vercel](#frontend-deployment-to-vercel)
4. [Connecting Backend and Frontend](#connecting-backend-and-frontend)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

Before starting, you'll need:

- **Git account** (GitHub, GitLab, or Bitbucket)
- **Railway account** (https://railway.app) - Sign up with GitHub
- **Vercel account** (https://vercel.com) - Sign up with GitHub
- **MongoDB Atlas account** (https://www.mongodb.com/cloud/atlas) - For the database
- **SMTP credentials** (optional - for email notifications)
  - Gmail: Enable 2FA and create an [App Password](https://myaccount.google.com/apppasswords)
  - Or use SendGrid, Mailgun, etc.

---

## Backend Deployment to Railway

### Step 1: Prepare Your Repository

1. Ensure your backend code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
2. The `Procfile` and `railway.json` files are already in place in the backend directory

### Step 2: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project and cluster (free tier available)
3. Create a database user with a strong password
4. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/qrtracking`
5. Keep this connection string safe - you'll need it for Railway

### Step 3: Deploy to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **"Create New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your repository containing the backend code
5. Railway will automatically detect `railway.json` configuration
6. Wait for the build to complete

### Step 4: Configure Environment Variables on Railway

1. In your Railway project, go to **Variables**
2. Add the following environment variables:

   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qrtracking
   JWT_SECRET=generate_a_strong_random_string_here
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-gmail-app-password
   ```

3. Click **Deploy** to apply changes

### Step 5: Get Your Backend URL

1. In Railway, go to your project settings
2. Find the **Public URL** - it will look like: `https://your-project.railway.app`
3. Note this URL - you'll need it to configure the frontend

---

## Frontend Deployment to Vercel

### Step 1: Prepare Your Repository

1. Ensure your frontend code is pushed to your Git repository
2. The `vercel.json` file is already in place in the frontend directory

### Step 2: Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New" → "Project"**
3. Select your repository from the list
4. Vercel will auto-detect Next.js configuration
5. Click **"Deploy"**

### Step 3: Configure Environment Variables on Vercel

1. After deployment, go to your Vercel project **Settings**
2. Click **Environment Variables**
3. Add the following variables:

   ```
   NEXT_PUBLIC_API_URL=https://your-railway-project.railway.app/api
   NEXT_PUBLIC_SOCKET_URL=https://your-railway-project.railway.app
   ```

4. Make sure to select **Production**, **Preview**, and **Development** environments
5. Redeploy the project to apply changes:
   - Go to **Deployments**
   - Click the latest deployment
   - Click **Redeploy** button

### Step 4: Get Your Frontend URL

1. In Vercel, your deployment URL will be displayed on the main page
2. It will look like: `https://your-project-name.vercel.app`
3. Note this URL - you may need it for backend configuration

---

## Connecting Backend and Frontend

### Update Backend CORS Configuration

Your backend should already have CORS configured, but verify it includes your Vercel domain:

In `backend/server.js` or your CORS middleware:

```javascript
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})
```

### Update Frontend API Configuration

Ensure your frontend is using the environment variable for API calls:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
```

### Testing the Connection

1. Open your frontend URL in a browser
2. Open the browser console (F12 → Console tab)
3. Try to create a QR code or perform an action that calls the backend API
4. Check for any CORS or connection errors
5. If errors appear, verify:
   - Backend URL is correct in Vercel environment variables
   - Backend is running and accessible
   - CORS is properly configured on the backend
   - Network tab shows requests being made to the correct backend URL

---

## Custom Domain Setup

### For Vercel Frontend

1. Go to your Vercel project **Settings → Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `qrtracking.com`)
4. Choose your DNS provider and follow the instructions
5. Update your DNS records as shown by Vercel
6. Wait for DNS propagation (usually 5-30 minutes)

### For Railway Backend

1. Go to your Railway project
2. Click **"Domains"** tab
3. Click **"Generate Domain"** or add a custom domain
4. Add your backend domain (e.g., `api.qrtracking.com`)
5. Update DNS records as needed
6. Update your Vercel environment variables with the new backend URL

### Update Environment Variables

After adding custom domains, update:

- **Vercel**: Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to use your custom backend domain
- **Railway**: Set `FRONTEND_URL` to use your custom frontend domain

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Server port | `5000` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/qrtracking` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | Generate a strong random string |
| `FRONTEND_URL` | Yes | Frontend domain for CORS | `https://qrtracking.com` |
| `SMTP_HOST` | No | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | No | Email server port | `587` |
| `SMTP_USER` | No | Email server username | `your-email@gmail.com` |
| `SMTP_PASS` | No | Email server password | Your app password |

### Frontend (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `https://api.qrtracking.com/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | WebSocket server URL | `https://api.qrtracking.com` |

---

## Troubleshooting

### Build Failures

- **Railway**: Check logs in the **Logs** tab
- **Vercel**: Check logs in **Deployments → Function Logs**
- Ensure all dependencies are listed in `package.json`
- Verify Node version compatibility

### CORS Errors

- Verify `FRONTEND_URL` is correctly set in Railway environment variables
- Check that your frontend URL matches exactly (including protocol and domain)
- Restart the backend deployment after updating CORS configuration

### Database Connection Issues

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas has your IP whitelisted (or set to `0.0.0.0/0` for testing)
- Ensure the database user has proper permissions
- Test the connection string locally before deploying

### API Not Responding

- Check backend is deployed and running (Railway dashboard)
- Verify public URL is accessible
- Check network tab in browser for actual request URLs
- Ensure environment variables are set correctly

### WebSocket Connection Issues

- WebSocket should use the same domain as HTTP API
- Ensure `NEXT_PUBLIC_SOCKET_URL` matches the backend domain
- Check backend has WebSocket middleware properly configured

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` for templates only
2. **Rotate JWT secrets** periodically
3. **Use strong passwords** for database users and SMTP
4. **Enable HTTPS** - Both Vercel and Railway provide SSL by default
5. **Whitelist domains** in CORS - Don't use `*` in production
6. **Monitor logs** regularly for errors and suspicious activity
7. **Keep dependencies updated** - Run `npm audit` regularly

---

## Support

For issues:
- **Railway**: https://railway.app/support
- **Vercel**: https://vercel.com/support
- **MongoDB**: https://www.mongodb.com/docs/
- **Next.js**: https://nextjs.org/docs
- **Express.js**: https://expressjs.com/
