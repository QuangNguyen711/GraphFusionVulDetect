#!/bin/bash
# MinIO initialization script

# Wait for MinIO to be ready
echo "Waiting for MinIO to start..."
until curl -f http://localhost:9000/minio/health/live; do
    sleep 5
done

echo "MinIO is ready. Creating buckets..."

# Configure MinIO client
mc config host add myminio http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# Create buckets
mc mb myminio/graphfusion-data --ignore-existing
mc mb myminio/graphfusion-models --ignore-existing  
mc mb myminio/graphfusion-artifacts --ignore-existing
mc mb myminio/graphfusion-temp --ignore-existing

# Set bucket policies
mc policy set public myminio/graphfusion-data
mc policy set private myminio/graphfusion-models
mc policy set private myminio/graphfusion-artifacts
mc policy set private myminio/graphfusion-temp

# Create folder structure
mc cp --recursive /tmp/folder-structure/ myminio/graphfusion-data/

echo "MinIO buckets created successfully!"
echo "Available buckets:"
mc ls myminio/
