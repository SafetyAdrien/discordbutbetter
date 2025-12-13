import { useState, useEffect, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

interface AudioSettings {
  inputDeviceId: string;
  outputDeviceId: string;
  cameraDeviceId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  vadSensitivity: number;
  masterVolume: number;
}

const DEFAULT_SETTINGS: AudioSettings = {
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  cameraDeviceId: 'default',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  vadSensitivity: 50,
  masterVolume: 100,
};

const STORAGE_KEY = 'voice_settings';

export function useAudioDevices() {
  const [audioInputs, setAudioInputs] = useState<AudioDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<AudioDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<AudioDevice[]>([]);
  const [settings, setSettings] = useState<AudioSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs: AudioDevice[] = [];
      const outputs: AudioDevice[] = [];
      const cameras: AudioDevice[] = [];
      
      devices.forEach((device, index) => {
        if (device.kind === 'audioinput') {
          inputs.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
            kind: 'audioinput',
          });
        } else if (device.kind === 'audiooutput') {
          outputs.push({
            deviceId: device.deviceId,
            label: device.label || `Haut-parleur ${index + 1}`,
            kind: 'audiooutput',
          });
        } else if (device.kind === 'videoinput') {
          cameras.push({
            deviceId: device.deviceId,
            label: device.label || `Caméra ${index + 1}`,
            kind: 'videoinput',
          });
        }
      });
      
      setAudioInputs(inputs);
      setAudioOutputs(outputs);
      setVideoInputs(cameras);
    } catch (error) {
      console.error('[useAudioDevices] Failed to enumerate devices:', error);
    }
  }, []);

  // Initial enumeration and device change listener
  useEffect(() => {
    enumerateDevices();
    
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const setInputDevice = useCallback((deviceId: string) => {
    updateSettings({ inputDeviceId: deviceId });
  }, [updateSettings]);

  const setOutputDevice = useCallback((deviceId: string) => {
    updateSettings({ outputDeviceId: deviceId });
  }, [updateSettings]);

  const setCameraDevice = useCallback((deviceId: string) => {
    updateSettings({ cameraDeviceId: deviceId });
  }, [updateSettings]);

  const setNoiseSuppression = useCallback((enabled: boolean) => {
    updateSettings({ noiseSuppression: enabled });
  }, [updateSettings]);

  const setEchoCancellation = useCallback((enabled: boolean) => {
    updateSettings({ echoCancellation: enabled });
  }, [updateSettings]);

  const setAutoGainControl = useCallback((enabled: boolean) => {
    updateSettings({ autoGainControl: enabled });
  }, [updateSettings]);

  const setVadSensitivity = useCallback((value: number) => {
    updateSettings({ vadSensitivity: value });
  }, [updateSettings]);

  const setMasterVolume = useCallback((value: number) => {
    updateSettings({ masterVolume: value });
  }, [updateSettings]);

  return {
    audioInputs,
    audioOutputs,
    videoInputs,
    settings,
    setInputDevice,
    setOutputDevice,
    setCameraDevice,
    setNoiseSuppression,
    setEchoCancellation,
    setAutoGainControl,
    setVadSensitivity,
    setMasterVolume,
    refreshDevices: enumerateDevices,
  };
}
