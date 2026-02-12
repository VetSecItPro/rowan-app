/**
 * Voice Recorder Native Bridge
 *
 * Wraps capacitor-voice-recorder for native audio recording on iOS/Android.
 * Falls back to the browser MediaRecorder API on web.
 * Returns null when recording is not available on the current platform.
 */

import { isNative, isPluginAvailable } from './capacitor';

// Dynamic import to avoid bundling the native plugin on web
type VoiceRecorderPluginType =
  typeof import('capacitor-voice-recorder').VoiceRecorder;

let VoiceRecorderPlugin: VoiceRecorderPluginType | null = null;

async function getPlugin(): Promise<VoiceRecorderPluginType | null> {
  if (!isNative || !isPluginAvailable('VoiceRecorder')) return null;

  if (!VoiceRecorderPlugin) {
    const mod = await import('capacitor-voice-recorder');
    VoiceRecorderPlugin = mod.VoiceRecorder;
  }
  return VoiceRecorderPlugin;
}

// ---------- Web MediaRecorder state ----------
let webMediaRecorder: MediaRecorder | null = null;
let webAudioChunks: Blob[] = [];
let webRecordingStartTime = 0;

/**
 * Check if audio recording is available on this device/browser.
 */
export async function isRecordingAvailable(): Promise<boolean> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      const result = await plugin.canDeviceVoiceRecord();
      return result.value;
    } catch {
      return false;
    }
  }

  // Web fallback — check for MediaRecorder + getUserMedia
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function'
  );
}

/**
 * Request microphone permission.
 * Returns true if permission is granted.
 */
export async function requestAudioPermission(): Promise<boolean> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      const result = await plugin.requestAudioRecordingPermission();
      return result.value;
    } catch {
      return false;
    }
  }

  // Web fallback — requesting getUserMedia triggers the permission prompt
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately — we only needed it for the permission prompt
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Start recording audio.
 */
export async function startRecording(): Promise<void> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      await plugin.startRecording();
      return;
    } catch {
      // Fall through to web fallback
    }
  }

  // Web fallback
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    webAudioChunks = [];
    webRecordingStartTime = Date.now();
    webMediaRecorder = new MediaRecorder(stream);

    webMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        webAudioChunks.push(event.data);
      }
    };

    webMediaRecorder.start();
  } catch {
    // Silently fail — caller can check isRecordingAvailable first
  }
}

/**
 * Stop recording and return the captured audio.
 * Returns null if recording was not active or failed.
 */
export async function stopRecording(): Promise<{
  blob: Blob;
  duration: number;
} | null> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      const result = await plugin.stopRecording();
      // The native plugin returns base64-encoded audio data
      const base64Data = result.value.recordDataBase64;
      const mimeType = result.value.mimeType || 'audio/aac';
      const byteString = atob(base64Data ?? '');
      const arrayBuffer = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        arrayBuffer[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([arrayBuffer], { type: mimeType });
      const duration = result.value.msDuration ?? 0;

      return { blob, duration };
    } catch {
      return null;
    }
  }

  // Web fallback
  if (!webMediaRecorder || webMediaRecorder.state === 'inactive') {
    return null;
  }

  return new Promise((resolve) => {
    if (!webMediaRecorder) {
      resolve(null);
      return;
    }

    webMediaRecorder.onstop = () => {
      const duration = Date.now() - webRecordingStartTime;
      const blob = new Blob(webAudioChunks, {
        type: webMediaRecorder?.mimeType || 'audio/webm',
      });

      // Release the microphone stream
      webMediaRecorder?.stream
        .getTracks()
        .forEach((track) => track.stop());
      webMediaRecorder = null;
      webAudioChunks = [];

      resolve({ blob, duration });
    };

    webMediaRecorder.stop();
  });
}

/**
 * Pause the current recording.
 */
export async function pauseRecording(): Promise<void> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      await plugin.pauseRecording();
      return;
    } catch {
      // Fall through to web fallback
    }
  }

  // Web fallback
  if (webMediaRecorder && webMediaRecorder.state === 'recording') {
    webMediaRecorder.pause();
  }
}

/**
 * Resume a paused recording.
 */
export async function resumeRecording(): Promise<void> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      await plugin.resumeRecording();
      return;
    } catch {
      // Fall through to web fallback
    }
  }

  // Web fallback
  if (webMediaRecorder && webMediaRecorder.state === 'paused') {
    webMediaRecorder.resume();
  }
}
