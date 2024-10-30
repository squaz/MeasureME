// ui.js

import { startPoseProcessing, stopPoseProcessing, startCamera } from './poseProcessor.js';
import { resetMeasurements } from './measurements.js';

// DOM Elements
const knownHeightInput = document.getElementById('knownHeightInput');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const startCameraButton = document.getElementById('startCameraButton');
const saveSettingsButton = document.getElementById('saveSettingsButton');

// Settings Measurement filter
const armRatioMinInput = document.getElementById('armRatioMin');
const armRatioMaxInput = document.getElementById('armRatioMax');
const legRatioMinInput = document.getElementById('legRatioMin');
const legRatioMaxInput = document.getElementById('legRatioMax');
const upBodyRatioMinInput = document.getElementById('upBodyRatioMin');
const upBodyRatioMaxInput = document.getElementById('upBodyRatioMax');
const shoulderRatioMinInput = document.getElementById('shoulderRatioMin');
const shoulderRatioMaxInput = document.getElementById('shoulderRatioMax');
const measurementTypeSelect = document.getElementById('measurementType');
const limbVariationThresholdInput = document.getElementById('limbVariationThreshold');
const rotateCameraCheckbox = document.getElementById('rotateCamera');
const cameraSelect = document.getElementById('cameraSelect');

// Measurement display elements
const currentMeasurementsRow = document.getElementById('currentMeasurementsRow');
const averagedMeasurementsRow = document.getElementById('averagedMeasurementsRow');
const confidenceScoreDiv = document.getElementById('confidenceScore');
const averagedConfidenceScoreDiv = document.getElementById('averagedConfidenceScore');
const logList = document.getElementById('logList');

// Pages
const homePage = document.getElementById('homePage');
const settingsPage = document.getElementById('settingsPage');

// Live view
const liveView = document.getElementById('liveView');
const video = document.getElementById('webcam');
const webcamCanvas = document.getElementById('webcamCanvas');

function initUI() {
  // Load settings from local storage
  loadSettings();

  // Start Camera Button Handler
  startCameraButton.addEventListener('click', async () => {
      startCameraButton.disabled = true;
      await startCamera();
      startButton.disabled = false;
      liveView.style.display = 'block';
  });

  // Start and Stop Button Handlers
  startButton.addEventListener('click', async () => {
      const knownHeight = parseFloat(knownHeightInput.value);
      if (isNaN(knownHeight) || knownHeight <= 0) {
        alert('Please enter a valid known height in centimeters.');
        return;
      }

      startButton.disabled = true;
      stopButton.disabled = false;

      // Reset background color
      resetBackgroundColor();

      // Start pose processing
      await startPoseProcessing(knownHeight);
    });

    stopButton.addEventListener('click', () => {
        startButton.disabled = false;
        stopButton.disabled = true;

        // Stop pose processing
        stopPoseProcessing();

        // Reset measurements and clear display
        resetMeasurements();
        clearDisplay();
    });

  // Camera Rotation Toggle Handler
  rotateCameraCheckbox.addEventListener('change', () => {
    if (rotateCameraCheckbox.checked) {
      liveView.classList.add('rotate-90');
    } else {
      liveView.classList.remove('rotate-90');
    }
  });

  // Save Settings Button Handler
  saveSettingsButton.addEventListener('click', () => {
    saveSettings();
    alert('Settings saved!');
  });
}

function switchPage(pageId) {
  // Hide all pages
  homePage.style.display = 'none';
  settingsPage.style.display = 'none';

  // Remove 'active' class from all navbar links
  document.getElementById('homeLink').classList.remove('active');
  document.getElementById('settingsLink').classList.remove('active');

  // Show the selected page and set navbar link as active
  if (pageId === 'homePage') {
    homePage.style.display = 'block';
    document.getElementById('homeLink').classList.add('active');
  } else if (pageId === 'settingsPage') {
    settingsPage.style.display = 'block';
    document.getElementById('settingsLink').classList.add('active');
  }
}

function clearDisplay() {
  currentMeasurementsRow.innerHTML = '';
  averagedMeasurementsRow.innerHTML = '';
  confidenceScoreDiv.textContent = '';
  logList.innerHTML = '';
}

function saveSettings() {
  const settings = {
    knownHeight: knownHeightInput.value,
    armRatioMax: armRatioMaxInput.value,
    legRatioMin: legRatioMinInput.value,
    legRatioMax: legRatioMaxInput.value,
    upBodyRatioMin: upBodyRatioMinInput.value,
    upBodyRatioMax: upBodyRatioMaxInput.value,
    shoulderRatioMin: shoulderRatioMinInput.value,
    shoulderRatioMax: shoulderRatioMaxInput.value,
    measurementType: measurementTypeSelect.value,
    limbVariationThreshold: limbVariationThresholdInput.value,
    rotateCamera: rotateCameraCheckbox.checked,
    cameraFacingMode: cameraSelect.value, 
  };
  localStorage.setItem('poseAppSettings', JSON.stringify(settings));
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('poseAppSettings'));
  if (settings) {
    knownHeightInput.value = settings.knownHeight || '';
    armRatioMinInput.value = settings.armRatioMin || '30';
    armRatioMaxInput.value = settings.armRatioMax || '55';
    legRatioMinInput.value = settings.legRatioMin || '30';
    legRatioMaxInput.value = settings.legRatioMax || '55';
    upBodyRatioMinInput.value = settings.upBodyRatioMin || '30';
    upBodyRatioMaxInput.value = settings.upBodyRatioMax || '60';
    shoulderRatioMinInput.value = settings.shoulderRatioMin || '15';
    shoulderRatioMaxInput.value = settings.shoulderRatioMax || '25';
    measurementTypeSelect.value = settings.measurementType || 'Anatomical Path';
    limbVariationThresholdInput.value = settings.limbVariationThreshold || '8';
    rotateCameraCheckbox.checked = settings.rotateCamera || false;
    cameraSelect.value = settings.cameraFacingMode || 'user';
  }
}

function updateBackgroundColor(color) {
  document.body.style.backgroundColor = color;
}
  
function resetBackgroundColor() {
  // Explicitly set the background color to the default
  document.body.style.backgroundColor = '#f5f5f5'; // Or whatever your default background color is
}

export {
  initUI,
  currentMeasurementsRow,
  averagedMeasurementsRow,
  confidenceScoreDiv,
  averagedConfidenceScoreDiv,
  logList,
  video,
  webcamCanvas,
  knownHeightInput,
  armRatioMinInput,
  armRatioMaxInput,
  legRatioMinInput,
  legRatioMaxInput,
  upBodyRatioMinInput,
  upBodyRatioMaxInput,
  shoulderRatioMinInput,
  shoulderRatioMaxInput,
  measurementTypeSelect,
  limbVariationThresholdInput,
  rotateCameraCheckbox,
  cameraSelect,
  switchPage,
  updateBackgroundColor,
  resetBackgroundColor
};
