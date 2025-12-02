# Environment Configuration Guide

## Overview
GraphFusionVulDetect uses environment variables for configuration. This guide explains how to set up and manage environment variables for different deployment scenarios.

## Environment Files

### `.env` 
Current environment configuration (used by docker-compose by default)

### `.env.example`
Template file with all available environment variables and their descriptions

### `.env.production`
Production-ready configuration with secure defaults

## Setup Instructions

### 1. Development Setup
```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your specific values
nano .env

# Start development environment
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Production Setup
```bash
# Copy the production template
cp .env.production .env

# Update with your production values
nano .env

# Start production environment
docker-compose -f docker-compose.prod.yml up --build -d
```

### 3. Testing Setup
```bash
# Use default development values
docker-compose up --build
```

## Key Environment Variables

### Required Variables
- `GEMINI_API_KEY`: Your Google Gemini API key for AI services
- `MONGODB_PASSWORD`: Database password (change from default)
- `MINIO_SECRET_KEY`: Object storage secret key
- `SECRET_KEY`: Application secret for encryption
- `JWT_SECRET`: JSON Web Token signing secret

### Database Configuration
- `MONGODB_URL`: Full MongoDB connection string
- `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE`: Individual MongoDB settings
- `REDIS_URL`: Redis connection string
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`: MinIO object storage settings

### Security Settings
- `BCRYPT_ROUNDS`: Password hashing strength (12-15 for production)
- `SESSION_TIMEOUT`: Session expiration in seconds
- `RATE_LIMIT_REQUESTS`: API rate limiting
- `CORS_ORIGINS`: Allowed origins for CORS

### Model Configuration
- `EMBEDDING_MODEL_PATH`: Path to embedding model
- `GRAPH_VUL_MODEL_PATH`: Path to graph vulnerability model
- `NODE_VUL_MODEL_PATH`: Path to node vulnerability model

## Environment-Specific Configurations

### Development
- `DEBUG=true`
- `LOG_LEVEL=debug`
- `ENVIRONMENT=development`
- Lower security requirements
- Hot reload enabled

### Production
- `DEBUG=false`
- `LOG_LEVEL=warn`
- `ENVIRONMENT=production`
- Strong passwords and secrets
- SSL/TLS enabled
- Monitoring configured

## Security Best Practices

### 1. Never commit sensitive values
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production.local" >> .gitignore
```

### 2. Use strong passwords
- MongoDB: Use complex passwords (min 16 characters)
- MinIO: Use different access/secret keys
- JWT/App secrets: Use cryptographically secure random strings

### 3. Generate secure secrets
```bash
# Generate random secrets
openssl rand -hex 32  # For SECRET_KEY
openssl rand -base64 32  # For JWT_SECRET
```

### 4. Rotate credentials regularly
- Change database passwords monthly
- Rotate API keys quarterly
- Update application secrets on deployment

## Troubleshooting

### Common Issues

#### 1. Connection refused errors
- Check if services are running: `docker-compose ps`
- Verify network connectivity: `docker network ls`
- Check service logs: `docker-compose logs [service_name]`

#### 2. Authentication failures
- Verify username/password combinations
- Check if initialization scripts ran successfully
- Ensure environment variables are properly loaded

#### 3. File permission errors
- Check volume mount permissions
- Verify container user permissions
- Review Docker volume configurations

### Debugging Environment Variables

#### Check if variables are loaded
```bash
# In running container
docker exec -it gfd-backend env | grep -E "(MONGODB|REDIS|MINIO)"
```

#### Validate configuration
```bash
# Test database connection
docker exec -it gfd-mongodb mongosh --eval "db.adminCommand('ping')"

# Test Redis connection  
docker exec -it gfd-redis redis-cli ping

# Test MinIO connection
docker exec -it gfd-minio curl http://localhost:9000/minio/health/live
```

## Environment Variable Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEMINI_API_KEY` | string | required | Google Gemini API key |
| `MONGODB_URL` | string | required | MongoDB connection string |
| `REDIS_URL` | string | required | Redis connection string |
| `MINIO_ENDPOINT` | string | required | MinIO server endpoint |
| `SECRET_KEY` | string | required | Application encryption key |
| `JWT_SECRET` | string | required | JWT signing secret |
| `ENVIRONMENT` | string | development | deployment environment |
| `DEBUG` | boolean | false | Enable debug mode |
| `LOG_LEVEL` | string | info | Logging level |
| `API_PORT` | integer | 8000 | API server port |
| `MAX_FILE_SIZE` | string | 100MB | Maximum upload size |

For a complete list of all available environment variables, see `.env.example`.
