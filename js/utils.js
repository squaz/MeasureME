// utils.js

function areLandmarksVisible(landmarks, requiredIndices, threshold) {
  return requiredIndices.every(
      (index) =>
          landmarks[index] &&
          (landmarks[index].visibility === undefined ||
              landmarks[index].visibility >= threshold)
  );
}

function calculateDistance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateTotalLength(landmarks, indices) {
  let totalLength = 0;
  for (let i = 0; i < indices.length - 1; i++) {
      const idx1 = indices[i];
      const idx2 = indices[i + 1];
      totalLength += calculateDistance(landmarks[idx1], landmarks[idx2]);
  }
  return totalLength;
}

export {
  areLandmarksVisible,
  calculateDistance,
  calculateTotalLength
};
