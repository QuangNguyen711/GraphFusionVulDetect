# Docker Deployment Guide

This directory contains Docker configuration files for the GraphFusionVulDetect application.

## Files Overview

### Docker Compose Files
- `docker-compose.yml` - Basic setup for local development and testing
- `docker-compose.dev.yml` - Development environment with hot reload and volume mounts
- `docker-compose.prod.yml` - Production environment with optimized builds

### Dockerfiles
- `docker/be.dockerfile` - Basic backend Dockerfile
- `docker/be.prod.dockerfile` - Production-optimized backend with security features
- `docker/fe.dockerfile` - Development frontend Dockerfile
- `docker/fe.prod.dockerfile` - Production frontend with Nginx
- `docker/nginx.conf` - Nginx configuration for production frontend

## Usage

### Development Environment
```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Stop and remove containers
docker-compose -f docker-compose.dev.yml down
```

### Basic Local Testing
```bash
# Start basic environment
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop services
docker-compose down
```

### Production Environment
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up --build -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

## Services

### Backend (GraphFusion API)
- **Port**: 8000
- **Health Check**: http://localhost:8000/health
- **Framework**: FastAPI with uvicorn
- **Python**: 3.12

### Frontend (React Web App)
- **Port**: 8080
- **Framework**: React + Vite
- **Production**: Served by Nginx
- **API Proxy**: `/api/*` routes to backend

### Redis (Caching & Session Store)
- **Port**: 6379
- **Version**: Redis 7 Alpine
- **Health Check**: `redis-cli ping`
- **Persistence**: AOF + RDB snapshots
- **Memory Limit**: 512MB (production), 256MB (development)

### MongoDB (Primary Database)
- **Port**: 27017
- **Version**: MongoDB 7
- **Health Check**: `mongosh --eval "db.adminCommand('ping')"`
- **Authentication**: Username/password based
- **Persistence**: Data and config volumes

### MinIO (Object Storage)
- **Ports**: 9000 (API), 9001 (Console)
- **Version**: Latest MinIO
- **Health Check**: `/minio/health/live`
- **Buckets**: graphfusion-data, graphfusion-models, graphfusion-artifacts
- **Console**: Web UI at port 9001

## Environment Variables

### Backend
- `PYTHONPATH`: Set to `/graphfusion`
- `ENVIRONMENT`: `development` or `production`
- `RELOAD`: Enable hot reload in development
- `REDIS_URL`: Redis connection string (e.g., `redis://redis:6379/0`)
- `MONGODB_URL`: MongoDB connection string
- `MINIO_ENDPOINT`: MinIO server endpoint
- `GEMINI_API_KEY`: Google Gemini API key
- `SECRET_KEY`: Application secret key
- `JWT_SECRET`: JWT signing secret

### Frontend
- `NODE_ENV`: `development` or `production`
- `VITE_API_URL`: Backend API URL
- `CHOKIDAR_USEPOLLING`: Enable for file watching in containers

## Volumes

### Development
- Source code mounted for hot reload
- Configuration files mounted
- Redis data persistence

### Production
- Data directories mounted as read-only where appropriate
- Storage mounted for persistent data
- Redis data with optimized persistence settings

## Networks

All services communicate through a custom bridge network:
- Development: `graphfusion-network-dev`
- Production: `graphfusion-network-prod`

## Health Checks

Both services include health checks:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 40 seconds

## Security Features (Production)

### Backend
- Non-root user execution
- Minimal system dependencies
- Health check endpoint

### Frontend
- Security headers (X-Frame-Options, CSP, etc.)
- Gzip compression
- Static asset optimization
- CORS handling

## Troubleshooting

### Check service status
```bash
docker-compose ps
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart specific service
```bash
docker-compose restart backend
```

### Rebuild services
```bash
docker-compose up --build --force-recreate
```

### Access running containers
```bash
# Backend container
docker exec -it gfd-backend bash

# Frontend container (dev)
docker exec -it gfd-frontend sh

# Frontend container (prod)
docker exec -it gfd-frontend-prod sh

# Redis container
docker exec -it gfd-redis redis-cli

# Redis with authentication (production)
docker exec -it gfd-redis-prod redis-cli -a your_redis_password_here
```

### Redis specific commands
```bash
# Check Redis status
docker exec -it gfd-redis redis-cli ping

# Monitor Redis activity
docker exec -it gfd-redis redis-cli monitor

# Check Redis info
docker exec -it gfd-redis redis-cli info

# View Redis logs
docker-compose logs -f redis
```
