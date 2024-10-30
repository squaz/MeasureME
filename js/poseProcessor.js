// poseProcessor.js

import { PoseLandmarker, FilesetResolver, DrawingUtils } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';
import { processPoseData } from './measurements.js';
import { video, webcamCanvas, cameraSelect } from './ui.js';

let poseLandmarker;
let webcamRunning = false;
let poseEstimationRunning = false;
let stream;

async function createPoseLandmarker() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.7,
            minPosePresenceConfidence: 0.7,
            minTrackingConfidence: 0.7,
            enableSmoothing: true
        });
    } catch (error) {
        console.error('Error initializing PoseLandmarker:', error);
    }
}
/*
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            webcamRunning = true;
        };
    } catch (err) {
        console.error('Error accessing webcam:', err);
        alert('Could not access webcam.');
        webcamRunning = false;
    }
}
*/


async function startCamera() {
    try {
        const facingMode = cameraSelect.value; // 'user' or 'environment'
        const constraints = {
            video: {
                facingMode: { exact: facingMode }, //facingMode
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            // Update canvas size to match video dimensions
            webcamCanvas.width = video.videoWidth;
            webcamCanvas.height = video.videoHeight;
            webcamRunning = true;
        };
    } catch (err) {
        console.error('Error accessing webcam:', err);
        alert('Could not access webcam.');
        webcamRunning = false;
    }
}

function stopCamera() {
    webcamRunning = false;
    if (video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
    }
}

async function startPoseProcessing(knownHeight) {
    if (!poseLandmarker) {
        await createPoseLandmarker();
    }
    if (!webcamRunning) {
        await startCamera();
    }
    poseEstimationRunning = true;
    predictWebcam(knownHeight);
}

function stopPoseProcessing() {
    poseEstimationRunning = false;
}

async function predictWebcam(knownHeight) {
    if (!poseEstimationRunning) return;

    const canvasCtx = webcamCanvas.getContext('2d');

    // Adjust canvas dimensions to match video dimensions
    webcamCanvas.width = video.videoWidth;
    webcamCanvas.height = video.videoHeight;

    const startTimeMs = performance.now();

    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
        // Clear the canvas
        canvasCtx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);

        if (result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];

            // Draw landmarks and connectors
            const drawingUtils = new DrawingUtils(canvasCtx);
            drawingUtils.drawLandmarks(landmarks, {
                color: 'white',
                radius: 3
            });
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: 'white'
            });

            // Process pose data
            processPoseData(landmarks, knownHeight, canvasCtx);
        } else {
            console.warn('No pose detected.');
        }
    });

    requestAnimationFrame(() => predictWebcam(knownHeight));
}

export {
    startPoseProcessing,
    stopPoseProcessing,
    startCamera,
    stopCamera
};
