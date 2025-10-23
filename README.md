# Markdown Q&A API

Backend API server for the Markdown Q&A Processor. Handles S3 image uploads and MongoDB storage securely on the server side.

## 🎯 Features

- **S3 Image Upload** - Upload images to AWS S3 with unique hash-based filenames
- **MongoDB Storage** - Store question data in MongoDB
- **Rollback Mechanism** - Automatic rollback on upload failures
- **Batch Operations** - Upload multiple questions at once
- **RESTful API** - Clean, documented API endpoints
- **Security** - Helmet, CORS, and secure credential management
- **Error Handling** - Comprehensive error handling and logging

## 📋 Prerequisites

- Node.js v18 or higher
- npm or yarn
- AWS S3 account with bucket and credentials
- MongoDB database (Atlas or self-hosted)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd markdown-qa-api
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your_s3_bucket_name

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE=questions_db
MONGODB_COLLECTION=questions
```

### 3. Start Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will start at **http://localhost:4000**

## 📚 API Endpoints

### Health Check

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "success": true,
  "message": "Markdown Q&A API is running",
  "timestamp": "2025-10-21T08:00:00.000Z",
  "environment": "development"
}
```

### Upload Single Question

**POST** `/api/questions/upload`

Upload a single question to S3 and MongoDB.

**Request Body:**
```json
{
  "question": {
    "id": 1,
    "description": "What is React?",
    "options": ["A library", "A framework", "A language", "An IDE"],
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully uploaded to database!",
  "s3Url": "https://bucket.s3.amazonaws.com/questions/hash.jpg",
  "mongoId": "507f1f77bcf86cd799439011"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Question 1 already exists in database."
}
```

### Upload Multiple Questions

**POST** `/api/questions/upload-batch`

Upload multiple questions at once.

**Request Body:**
```json
{
  "questions": [
    {
      "id": 1,
      "description": "Question 1",
      "options": ["A", "B", "C", "D"]
    },
    {
      "id": 2,
      "description": "Question 2",
      "options": ["A", "B", "C", "D"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "message": "Successfully uploaded to database!",
      "mongoId": "..."
    },
    {
      "success": true,
      "message": "Successfully uploaded to database!",
      "mongoId": "..."
    }
  ]
}
```

### Get All Questions

**GET** `/api/questions`

Retrieve all questions from MongoDB.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "questions": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "id": 1,
      "description": "Question text",
      "options": ["A", "B", "C", "D"],
      "imageUrl": "https://...",
      "uploadedAt": "2025-10-21T08:00:00.000Z"
    }
  ]
}
```

### Get Question by ID

**GET** `/api/questions/:id`

Get a specific question by its ID.

**Response:**
```json
{
  "success": true,
  "question": {
    "_id": "507f1f77bcf86cd799439011",
    "id": 1,
    "description": "Question text",
    "options": ["A", "B", "C", "D"]
  }
}
```

## 🏗️ Project Structure

```
markdown-qa-api/
├── src/
│   ├── services/
│   │   ├── s3.js              # S3 upload/delete operations
│   │   ├── mongodb.js         # MongoDB CRUD operations
│   │   └── uploadService.js   # Upload orchestration with rollback
│   ├── routes/
│   │   └── questions.js       # API route handlers
│   ├── middleware/
│   │   └── errorHandler.js    # Error handling middleware
│   └── server.js              # Express server setup
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── ecosystem.config.cjs       # PM2 configuration
├── deploy.sh                  # Automated deployment script
├── setup-pm2.sh               # PM2 initial setup script
├── EC2_DEPLOYMENT.md          # EC2 deployment guide
├── PM2_QUICK_REFERENCE.md     # PM2 command reference
└── README.md                  # This file
```

## 🔒 Security Features

### Implemented

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing protection
- **Environment Variables** - Secure credential management
- **Input Validation** - Request body validation
- **Error Handling** - Sanitized error messages
- **Rollback Mechanism** - Prevents data inconsistency

### Best Practices

✅ Credentials stored server-side only
✅ CORS configured for specific frontend origin
✅ Request size limits (10MB)
✅ Logging for debugging and monitoring
✅ Graceful shutdown handling

## 🔄 How Upload Works

1. **Receive Request** - Frontend sends question data
2. **Check Duplicates** - Verify question doesn't exist
3. **Upload to S3** - Download image and upload to S3
4. **Save to MongoDB** - Store question with S3 URL
5. **Rollback on Error** - Delete S3 image and MongoDB entry if any step fails
6. **Return Result** - Send success/error response to frontend

## 🧪 Testing

### Test with curl

**Health check:**
```bash
curl http://localhost:4000/health
```

**Upload question:**
```bash
curl -X POST http://localhost:4000/api/questions/upload \
  -H "Content-Type: application/json" \
  -d '{
    "question": {
      "id": 1,
      "description": "Test question",
      "options": ["A", "B", "C", "D"]
    }
  }'
```

**Get all questions:**
```bash
curl http://localhost:4000/api/questions
```

### Test with Postman

1. Import the API endpoints
2. Set `Content-Type: application/json`
3. Send requests to `http://localhost:4000`

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### MongoDB Connection Error

- Check MongoDB URI in `.env`
- Verify MongoDB Atlas IP whitelist
- Ensure correct username/password

### S3 Upload Error

- Verify AWS credentials in `.env`
- Check S3 bucket permissions
- Ensure bucket allows public-read ACL

### CORS Error

- Update `FRONTEND_URL` in `.env`
- Ensure frontend is running on correct port

## 📊 Monitoring

### Logs

The server logs all requests and errors:
- **Development**: Detailed logging with morgan 'dev'
- **Production**: Combined format logging

### Health Check

Regular health checks:
```bash
# Every 30 seconds
watch -n 30 curl http://localhost:4000/health
```

## 🚀 Deployment

### Heroku

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set PORT=4000
heroku config:set AWS_REGION=us-east-1
# ... set other env vars

# Deploy
git push heroku main
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### PM2 (Process Manager)

**See [EC2_DEPLOYMENT.md](./EC2_DEPLOYMENT.md) for complete deployment guide.**

> **Note:** The ecosystem file uses `.cjs` extension because this project uses ES modules (`"type": "module"`). PM2 ecosystem files must be in CommonJS format.

```bash
# Install PM2 globally
npm install -g pm2

# Start in production mode
npm run pm2:start

# Start in development mode
npm run pm2:dev

# View status
npm run pm2:status

# View logs
npm run pm2:logs

# Monitor in real-time
npm run pm2:monit

# Restart application
npm run pm2:restart

# Zero-downtime reload
npm run pm2:reload

# Stop application
npm run pm2:stop

# Save PM2 configuration
pm2 save

# Auto-start on reboot
pm2 startup
```

**Quick Start on EC2:**
```bash
# After cloning repo and installing dependencies
mkdir logs
npm run pm2:start
pm2 save
pm2 startup
```

**Automated Deployment:**
```bash
# Pull latest changes and restart server
./deploy.sh
```

The `deploy.sh` script automatically pulls changes, reinstalls dependencies, and restarts PM2.

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `FRONTEND_URL` | No | http://localhost:3000 | Frontend URL for CORS |
| `AWS_REGION` | Yes | - | AWS region |
| `AWS_ACCESS_KEY_ID` | Yes | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | - | AWS secret key |
| `S3_BUCKET_NAME` | Yes | - | S3 bucket name |
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `MONGODB_DATABASE` | Yes | - | MongoDB database name |
| `MONGODB_COLLECTION` | No | questions | MongoDB collection name |

## 📝 Notes

- Uses ES6 modules (`"type": "module"` in package.json)
- Compatible with Node.js v18+
- Requires AWS S3 bucket with public-read ACL
- MongoDB Atlas free tier supported

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License

---

**Made with ❤️ for Markdown Q&A Processor**
