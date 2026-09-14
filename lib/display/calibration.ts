/**
 * Global toggle for the on-screen registration markers (see
 * components/display/CalibrationOverlay).
 *
 * Global rather than per-display on purpose: the test is a COMPARISON. You need
 * the markers up on a panel that renders correctly and one that does not at the
 * same moment, or you are comparing a screen against your memory of another.
 */
export const CALIBRATION_SETTING_KEY = "calibration:enabled";
