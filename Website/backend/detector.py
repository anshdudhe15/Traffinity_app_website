from ultralytics import YOLO
import cv2
import numpy as np

# Load YOLOv8 model (pretrained on COCO dataset)
# It will download 'yolov8n.pt' on first run
model = YOLO('yolov8n.pt')

# COCO Class IDs relevant to traffic
VEHICLE_CLASSES = {
    1: 'bicycle',    # bicycle
    2: 'car',        # car
    3: 'motorcycle', # motorcycle
    5: 'bus',        # bus
    7: 'truck'       # truck
}

# Weight Factors
WEIGHTS = {
    'bicycle': 0.3,
    'motorcycle': 0.3,
    'car': 1.0,
    'bus': 2.3,
    'truck': 2.0,
    'emergency': 3.0 # Custom detection needed for ambulance/fire truck
}

def analyze_image(image_path):
    results = model(image_path)
    
    counts = {
        'bicycle': 0,
        'motorcycle': 0,
        'car': 0,
        'bus': 0,
        'truck': 0,
        'emergency': 0
    }
    
    # Process detections
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            
            if cls_id in VEHICLE_CLASSES:
                class_name = VEHICLE_CLASSES[cls_id]
                counts[class_name] += 1
                
            # Note: Standard YOLOv8 COCO doesn't have specific 'ambulance' class.
            # In a real scenario, we would train a custom model for emergency vehicles.
            # For now, we assume standard vehicles.
            
    # Calculate EVL (Effective Vehicle Load)
    # EVL = Sum(Ni * Wi)
    
    evl = 0
    evl += (counts['bicycle'] + counts['motorcycle']) * WEIGHTS['bicycle']
    evl += counts['car'] * WEIGHTS['car']
    evl += counts['bus'] * WEIGHTS['bus']
    evl += counts['truck'] * WEIGHTS['truck']
    
    return {
        "counts": {
            "bikes": counts['bicycle'] + counts['motorcycle'],
            "cars": counts['car'],
            "trucks": counts['truck'],
            "buses": counts['bus']
        },
        "evl": evl,
        "emergency_detected": counts['emergency'] > 0
    }
