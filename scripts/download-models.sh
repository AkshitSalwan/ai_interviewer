#!/bin/bash

# Download Face API models
echo "Downloading Face API models..."

# Create models directory if it doesn't exist
mkdir -p public/models

# Download models (you'll need to run this after setting up the project)
echo "Note: Face API models need to be downloaded separately."
echo "Please run the following commands to download the models:"
echo ""
echo "cd public/models"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-weights_manifest.json"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-weights_manifest.json"
echo "wget https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-shard1"
echo ""
echo "Or use curl if wget is not available:"
echo "curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/[model-files]"
