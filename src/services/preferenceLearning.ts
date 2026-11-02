// ============================================================================
// AeroPersona – Preference Learning Service
// Weighted-average learning algorithm for personalized fan speed preferences
// ============================================================================

import type { PreferenceRecord, UserPreferenceSummary } from '../types';

/**
 * Calculate the similarity weight between two environmental conditions.
 * Uses Gaussian-like decay based on temperature and humidity differences.
 * Closer conditions get higher weight (0 to 1).
 */
function calculateSimilarityWeight(
  recordTemp: number,
  recordHumidity: number,
  currentTemp: number,
  currentHumidity: number
): number {
  // Temperature difference weight (σ = 3°C)
  const tempDiff = Math.abs(recordTemp - currentTemp);
  const tempWeight = Math.exp(-(tempDiff * tempDiff) / (2 * 3 * 3));

  // Humidity difference weight (σ = 10%)
  const humDiff = Math.abs(recordHumidity - currentHumidity);
  const humWeight = Math.exp(-(humDiff * humDiff) / (2 * 10 * 10));

  return tempWeight * humWeight;
}

/**
 * Apply a time-decay factor so more recent preferences carry more weight.
 * Half-life of 7 days: preferences from a week ago weigh half as much.
 */
function calculateTimeDecay(recordTimestamp: number, now: number): number {
  const halfLifeMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  const age = now - recordTimestamp;
  return Math.pow(0.5, age / halfLifeMs);
}

/**
 * Estimate a user's preferred fan speed at the given environmental conditions
 * using weighted averaging of their preference history.
 *
 * Algorithm:
 * 1. For each historical record, compute a combined weight:
 *    weight = similarity(env conditions) × timeDecay(record age)
 * 2. The estimated speed = Σ(weight_i × speed_i) / Σ(weight_i)
 *
 * This is a transparent, interpretable algorithm – no black-box ML.
 */
export function estimatePreferredSpeed(
  records: PreferenceRecord[],
  currentTemp: number,
  currentHumidity: number,
  minSamplesRequired: number = 0
): number | null {
  // Only evaluate solo observations to avoid group compromise bias
  const soloRecords = records.filter((r) => (r.occupantCount ?? 1) <= 1);

  if (soloRecords.length === 0 || soloRecords.length < minSamplesRequired) {
    return null;
  }

  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const record of soloRecords) {
    const similarityWeight = calculateSimilarityWeight(
      record.temperatureC,
      record.humidityPct,
      currentTemp,
      currentHumidity
    );
    const timeDecay = calculateTimeDecay(record.timestamp, now);
    const combinedWeight = similarityWeight * timeDecay;

    weightedSum += combinedWeight * record.speedPercent;
    totalWeight += combinedWeight;
  }

  if (totalWeight < 0.001) return null; // No meaningful data for these conditions

  return Math.round(weightedSum / totalWeight);
}

/**
 * Determine the learning status based on number of records.
 */
export function getLearningStatus(
  sampleCount: number,
  minRequired: number
): UserPreferenceSummary['learningStatus'] {
  if (sampleCount < minRequired) return 'insufficient_data';
  if (sampleCount < minRequired * 3) return 'learning';
  return 'stable';
}

/**
 * Generate a complete preference summary for a user.
 */
export function getUserPreferenceSummary(
  userId: string,
  records: PreferenceRecord[],
  currentTemp: number,
  currentHumidity: number,
  minSamples: number
): UserPreferenceSummary {
  const userRecords = records.filter((r) => r.userId === userId);

  return {
    userId,
    totalSamples: userRecords.length,
    estimatedSpeedAtCurrentConditions: estimatePreferredSpeed(
      userRecords,
      currentTemp,
      currentHumidity,
      minSamples
    ),
    learningStatus: getLearningStatus(userRecords.length, minSamples),
    minSamplesRequired: minSamples,
  };
}

/**
 * Calculate the shared speed for multiple present users.
 *
 * Rules from spec:
 * - One user → that user's preferred speed
 * - Two users → average of their preferred speeds
 * - Three or more → average of all detected users' preferred speeds
 * - Occupancy but no registered user → default speed
 */
export function calculateMultiUserSpeed(
  presentUserIds: string[],
  allRecords: PreferenceRecord[],
  currentTemp: number,
  currentHumidity: number,
  defaultSpeed: number,
  minSamplesRequired: number = 0
): {
  speed: number;
  userSpeeds: { userId: string; speed: number }[];
  explanation: string;
} {
  if (presentUserIds.length === 0) {
    return {
      speed: defaultSpeed,
      userSpeeds: [],
      explanation: 'No registered users detected. Using default speed.',
    };
  }

  const userSpeeds: { userId: string; speed: number }[] = [];

  for (const userId of presentUserIds) {
    const userRecords = allRecords.filter((r) => r.userId === userId);
    const estimated = estimatePreferredSpeed(
      userRecords,
      currentTemp,
      currentHumidity,
      minSamplesRequired
    );
    userSpeeds.push({
      userId,
      speed: estimated ?? defaultSpeed,
    });
  }

  const avgSpeed = Math.round(
    userSpeeds.reduce((sum, u) => sum + u.speed, 0) / userSpeeds.length
  );

  let explanation: string;
  if (presentUserIds.length === 1) {
    explanation = `One registered user detected. Applying preferred speed: ${avgSpeed}%.`;
  } else {
    const details = userSpeeds.map((u) => `${u.userId}: ${u.speed}%`).join(', ');
    explanation = `${presentUserIds.length} registered users detected. ${details}. Shared speed: ${avgSpeed}%.`;
  }

  return { speed: avgSpeed, userSpeeds, explanation };
}
