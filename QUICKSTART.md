# Quick Start Guide - Backend API

Get the backend API running in 5 minutes! ⚡

## Step 1: Install Dependencies (1 min)

```bash
cd markdown-qa-api
npm install
```

## Step 2: Configure Environment (2 min)

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your_s3_bucket_name

# MongoDB
MONGODB_URI=mongodb+srv://admin:password@cluster.mongodb.net/
MONGODB_DATABASE=questions_db
MONGODB_COLLECTION=questions
```

## Step 3: Start Server (30 sec)

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║   🚀 Markdown Q&A API Server                          ║
║   Server running on: http://localhost:4000            ║
╚════════════════════════════════════════════════════════╝
```

## Step 4: Update Frontend (1 min)

In your frontend `.env` file, add:
```env
VITE_API_URL=http://localhost:4000
```

Restart frontend:
```bash
cd ../markdown-qa-app
npm run dev
```

## Step 5: Test It! (30 sec)

1. Open **http://localhost:3000**
2. Upload a markdown file
3. Click **"Push to DB"** on any question
4. Watch it upload to S3 and MongoDB! ✨

## Verify Backend is Working

**Test health check:**
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Markdown Q&A API is running"
}
```

## Troubleshooting

### Port 4000 already in use?
```bash
# Change PORT in .env to 4001 or any free port
# Then update VITE_API_URL in frontend .env
```

### MongoDB connection error?
- Check MongoDB URI format
- Ensure IP is whitelisted in MongoDB Atlas
- Verify username/password are correct

### S3 upload error?
- Verify AWS credentials
- Check S3 bucket exists
- Ensure bucket allows public-read

## What's Next?

- Upload questions and see them in MongoDB!
- Check your S3 bucket for uploaded images
- Try batch upload with "Push All to DB"

---

**That's it! Your backend API is ready!** 🎉
