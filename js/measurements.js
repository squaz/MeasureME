// measurements.js

import {
  currentMeasurementsRow,
  averagedMeasurementsRow,
  confidenceScoreDiv,
  averagedConfidenceScoreDiv,
  measurementTypeSelect,
  armRatioMinInput,
  armRatioMaxInput,
  legRatioMinInput,
  legRatioMaxInput,
  knownHeightInput,
  upBodyRatioMinInput,
  upBodyRatioMaxInput,
  shoulderRatioMinInput,
  shoulderRatioMaxInput,
  limbVariationThresholdInput,
  updateBackgroundColor,
  resetBackgroundColor
} from './ui.js';
import { calculateDistance, areLandmarksVisible } from './utils.js';

const MEASUREMENT_BUFFER_SIZE = 60;
const measurementBuffer = [];
let measurementsAveraged = {};

const MIN_VISIBILITY_THRESHOLD = 0.8;
const MIN_GOOD_SAMPLES = 10; // Minimum number of valid measurements required

let highestConfidenceScore = 0;

function processPoseData(landmarks, knownHeight, canvasCtx) {
  console.log('Processing pose data...');
  // Required indices for measurements
  const requiredIndices = [
    0, // Nose
    11, 13, 15, // Left arm
    12, 14, 16, // Right arm
    23, 25, 27, // Left leg
    24, 26, 28, // Right leg
    23, 24, // Hips
    31, 32, // Feet
    7, 8 // Ears
  ];

  if (areLandmarksVisible(landmarks, requiredIndices, MIN_VISIBILITY_THRESHOLD)) {
    console.log('Required landmarks are visible.');
    // Calculate scale factor

    // Estimate top of the head
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];

    // Check if ear landmarks are valid
    if (!leftEar || !rightEar) {
      console.warn('Ear landmarks are not available.');
      return;
    }

    const earMidpoint = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2,
      z: (leftEar.z + rightEar.z) / 2
    };
    // Estimate top of the head by adding an offset upwards
    const headTopOffset = 0.1; // Adjust this value as needed
    const topOfHead = {
      x: earMidpoint.x,
      y: earMidpoint.y - headTopOffset,
      z: earMidpoint.z
    };

    // Calculate midpoint between left and right foot
    const leftFootIndex = landmarks[31];
    const rightFootIndex = landmarks[32];

    // Check if foot landmarks are valid
    if (!leftFootIndex || !rightFootIndex) {
      console.warn('Foot landmarks are not available.');
      return;
    }

    const feetMidpoint = {
      x: (leftFootIndex.x + rightFootIndex.x) / 2,
      y: (leftFootIndex.y + rightFootIndex.y) / 2,
      z: (leftFootIndex.z + rightFootIndex.z) / 2
    };

    // Draw measurement line in overlay
    drawMeasurementLine(canvasCtx, topOfHead, feetMidpoint);

    // Calculate person height
    const personHeight3D = calculateDistance(topOfHead, feetMidpoint);
    console.log('Person height (3D):', personHeight3D);

    const scaleFactor = knownHeight / personHeight3D;
    console.log('Scale factor:', scaleFactor);

    // Get measurement type
    const measurementType = measurementTypeSelect.value;

    // Measurements
    const newMeasurements = {};

    // Left Arm Length
    newMeasurements['ArmL'] = calculateLimbLength(
      landmarks,
      [11, 13, 15],
      scaleFactor,
      measurementType
    );

    // Right Arm Length
    newMeasurements['ArmR'] = calculateLimbLength(
      landmarks,
      [12, 14, 16],
      scaleFactor,
      measurementType
    );

    // Left Leg Length
    newMeasurements['LegL'] = calculateLimbLength(
      landmarks,
      [23, 25, 27],
      scaleFactor,
      measurementType
    );

    // Right Leg Length
    newMeasurements['LegR'] = calculateLimbLength(
      landmarks,
      [24, 26, 28],
      scaleFactor,
      measurementType
    );

    // Upper Body Length (Top of Head to Mid Hips)
    const midHips = {
      x: (landmarks[23].x + landmarks[24].x) / 2,
      y: (landmarks[23].y + landmarks[24].y) / 2,
      z: (landmarks[23].z + landmarks[24].z) / 2
    };
    newMeasurements['UpBody'] = calculateDistance(
      topOfHead,
      midHips
    ) * scaleFactor;

    // Shoulder Width
    newMeasurements['Shoulder'] = calculateDistance(
      landmarks[11],
      landmarks[12]
    ) * scaleFactor;

    console.log('New measurements:', newMeasurements);

    // Update measurement buffer and process measurements
    updateMeasurementBuffer(newMeasurements);

    // Draw measurement lines
    drawMeasurementLines(landmarks, canvasCtx, measurementType);

    // Display current measurements
    displayCurrentMeasurements(newMeasurements);
  } else {
    console.warn('Not all required landmarks are visible with sufficient confidence.');
  }
}

function calculateLimbLength(landmarks, indices, scaleFactor, measurementType) {
  if (measurementType === 'direct') {
    // Direct line between endpoints
    return (
      calculateDistance(landmarks[indices[0]], landmarks[indices[indices.length - 1]]) *
      scaleFactor
    );
  } else {
    // Anatomical path (sum of segments)
    let totalLength = 0;
    for (let i = 0; i < indices.length - 1; i++) {
      totalLength += calculateDistance(landmarks[indices[i]], landmarks[indices[i + 1]]);
    }
    return totalLength * scaleFactor;
  }
}

function updateMeasurementBuffer(newMeasurements) {
  measurementBuffer.push(newMeasurements);
  if (measurementBuffer.length > MEASUREMENT_BUFFER_SIZE) {
    measurementBuffer.shift();
  }

  console.log('Measurement buffer size:', measurementBuffer.length);

  // Filter out outliers and measurements outside acceptable ranges
  const filteredMeasurements = filterMeasurements(measurementBuffer);

  console.log('Filtered measurements count:', filteredMeasurements.length);

  // Only proceed if we have at least MIN_GOOD_SAMPLES valid measurements
  if (filteredMeasurements.length >= MIN_GOOD_SAMPLES) {
    // Calculate averages for current buffer
    const measurementKeys = Object.keys(newMeasurements);
    const currentAverages = {};
    measurementKeys.forEach((key) => {
      const values = filteredMeasurements.map((m) => m[key]);
      const sum = values.reduce((a, b) => a + b, 0);
      currentAverages[key] = sum / values.length;
    });

    console.log('Current averages:', currentAverages);

    // Calculate current confidence score
    const currentConfidenceScore = calculateConfidenceScore(filteredMeasurements, currentAverages);

    console.log('Current confidence score:', currentConfidenceScore);

    // Update the current confidence score display
    confidenceScoreDiv.textContent = `${currentConfidenceScore.toFixed(2)}%`;

    // Compare with highest confidence score
    if (currentConfidenceScore > highestConfidenceScore) {
      // Update measurementsAveraged and highestConfidenceScore
      measurementsAveraged = currentAverages;
      highestConfidenceScore = currentConfidenceScore;

      // Update averaged measurements display
      displayAveragedMeasurements();
      // Update averaged confidence score display
      averagedConfidenceScoreDiv.textContent = `${currentConfidenceScore.toFixed(2)}%`;

      // Update background color if confidence is at least 95%
      if (highestConfidenceScore >= 95) {
        updateBackgroundColor('green');
      }
    }
  } else {
    // Update confidence score display
    confidenceScoreDiv.textContent = `Calculating...`;
  }
}

function filterMeasurements(measurements) {
  const knownHeight = parseFloat(knownHeightInput.value);
  const armRatioMin = parseFloat(armRatioMinInput.value) / 100;
  const armRatioMax = parseFloat(armRatioMaxInput.value) / 100;
  const legRatioMin = parseFloat(legRatioMinInput.value) / 100;
  const legRatioMax = parseFloat(legRatioMaxInput.value) / 100;
  const upBodyRatioMin = parseFloat(upBodyRatioMinInput.value) / 100;
  const upBodyRatioMax = parseFloat(upBodyRatioMaxInput.value) / 100;
  const shoulderRatioMin = parseFloat(shoulderRatioMinInput.value) / 100;
  const shoulderRatioMax = parseFloat(shoulderRatioMaxInput.value) / 100;
  const limbVariationThreshold = parseFloat(limbVariationThresholdInput.value) / 100;

  const measurementKeys = Object.keys(measurements[0]);
  const filteredMeasurements = measurements.filter((measurement, index) => {
    let isValid = true;

    measurementKeys.forEach((key) => {
      const value = measurement[key];

      // Acceptable ranges based on body ratios
      //TODO change ratios 
      let min = 0;
      let max = Infinity;
      if (key.includes("Arm")) {
        min = knownHeight * armRatioMin;
        max = knownHeight * armRatioMax;
      } else if (key.includes("Leg")) {
        min = knownHeight * legRatioMin;
        max = knownHeight * legRatioMax;
      } else if (key === "UpBody") {
        min = knownHeight * 0.2; //upBodyRatioMin; //* 0.2;
        max = knownHeight * 0.8; //upBodyRatioMax; //0.8;
      } else if (key === "Shoulder") {
        min = knownHeight * 0.1; //shoulderRatioMin; //0.1;
        max = knownHeight * 0.8; //shoulderRatioMax; //0.8;
      }

      if (value < min || value > max) {
        console.log(`Measurement ${index} for ${key} is out of range: ${value.toFixed(2)} cm (min: ${min.toFixed(2)}, max: ${max.toFixed(2)})`);
        isValid = false;
      }
    });
    

    // Check limb variation thresholds
    const leftArm = measurement['ArmL'];
    const rightArm = measurement['ArmR'];
    const leftLeg = measurement['LegL'];
    const rightLeg = measurement['LegR'];

    // Compare left and right limbs
    if (Math.abs(leftArm - rightArm) / Math.max(leftArm, rightArm) > limbVariationThreshold) {
      console.log(`Measurement ${index}: Arm length variation exceeds threshold.`);
      isValid = false;
    }
    if (Math.abs(leftLeg - rightLeg) / Math.max(leftLeg, rightLeg) > limbVariationThreshold) {
      console.log(`Measurement ${index}: Leg length variation exceeds threshold.`);
      isValid = false;
    }

    return isValid;
  });

  return filteredMeasurements;
}

function calculateConfidenceScore(measurements, averages) {
  const measurementKeys = Object.keys(averages);
  let totalVariation = 0;
  measurementKeys.forEach((key) => {
    const values = measurements.map((m) => m[key]);
    const mean = averages[key];
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1 || 1);
    const stdDev = Math.sqrt(variance);
    totalVariation += stdDev;
    console.log(`Standard deviation for ${key}: ${stdDev.toFixed(2)} cm`);
  });
  const maxVariation = 10; // Adjusted max variation for better scaling
  const confidence = Math.max(0, 100 - (totalVariation / (measurementKeys.length * maxVariation)) * 100);
  return confidence;
}

function displayCurrentMeasurements(currentMeasurements) {
  // Clear existing current measurements row
  currentMeasurementsRow.innerHTML = '';

  // Measurement keys in the desired order
  const measurementKeys = ['LegL', 'LegR', 'ArmL', 'ArmR', 'Shoulder', 'UpBody'];

  // Display current measurements
  measurementKeys.forEach((key) => {
    const value = currentMeasurements[key];
    const td = document.createElement('td');
    td.textContent = `${value.toFixed(2)}`;
    currentMeasurementsRow.appendChild(td);
  });
}

function displayAveragedMeasurements() {
  // Clear existing averaged measurements row
  averagedMeasurementsRow.innerHTML = '';

  // Measurement keys in the desired order
  const measurementKeys = ['LegL', 'LegR', 'ArmL', 'ArmR', 'Shoulder', 'UpBody'];

  // Display averaged measurements
  measurementKeys.forEach((key) => {
    const value = measurementsAveraged[key];
    const td = document.createElement('td');
    td.textContent = `${value.toFixed(2)}`;
    td.style.color = 'green';
    averagedMeasurementsRow.appendChild(td);
  });
}

function drawMeasurementLines(landmarks, canvasCtx, measurementType) {
  // Draw colored lines for measurements
  const limbColors = {
    'ArmL': 'red',
    'ArmR': 'blue',
    'LegL': 'green',
    'LegR': 'orange',
    'Shoulder': 'purple'
  };

  const limbs = {
    'ArmL': [11, 13, 15],
    'ArmR': [12, 14, 16],
    'LegL': [23, 25, 27],
    'LegR': [24, 26, 28],
    'Shoulder': [11, 12]
  };

  Object.keys(limbs).forEach((limbName) => {
    const indices = limbs[limbName];
    const color = limbColors[limbName];
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 4;
    canvasCtx.beginPath();
    const startPoint = landmarks[indices[0]];
    canvasCtx.moveTo(startPoint.x * canvasCtx.canvas.width, startPoint.y * canvasCtx.canvas.height);
    if (measurementType === 'direct' || limbName === 'Shoulder') {
      const endPoint = landmarks[indices[indices.length - 1]];
      canvasCtx.lineTo(endPoint.x * canvasCtx.canvas.width, endPoint.y * canvasCtx.canvas.height);
    } else {
      for (let i = 1; i < indices.length; i++) {
        const point = landmarks[indices[i]];
        canvasCtx.lineTo(point.x * canvasCtx.canvas.width, point.y * canvasCtx.canvas.height);
      }
    }
    canvasCtx.stroke();
  });
}

function drawMeasurementLine(canvasCtx, topPoint, bottomPoint) {
  canvasCtx.strokeStyle = 'yellow';
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(topPoint.x * canvasCtx.canvas.width, topPoint.y * canvasCtx.canvas.height);
  canvasCtx.lineTo(bottomPoint.x * canvasCtx.canvas.width, bottomPoint.y * canvasCtx.canvas.height);
  canvasCtx.stroke();
}

function resetMeasurements() {
  measurementBuffer.length = 0;
  measurementsAveraged = {};
  highestConfidenceScore = 0;
  averagedConfidenceScoreDiv = 0;
  resetBackgroundColor(); // Reset background color when measurements are reset
}

export {
  processPoseData,
  resetMeasurements
};
