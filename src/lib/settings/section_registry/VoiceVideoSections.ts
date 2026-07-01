import type { SectionDefinition } from './SectionRegistryTypes';

export const voiceVideoSections = [
  {
    id: 'input-device',
    tabType: 'voice_video',
    label: "Périphérique d'entrée",
    description: 'Choix du microphone par défaut.',
    keywords: ['micro', 'microphone', 'entrée', 'audio', 'input', 'périphérique'],
    isAdvanced: false,
  },
  {
    id: 'output-device',
    tabType: 'voice_video',
    label: 'Périphérique de sortie',
    description: 'Choix du haut-parleur ou casque par défaut.',
    keywords: ['sortie', 'casque', 'haut-parleur', 'speaker', 'output', 'audio'],
    isAdvanced: false,
  },
  {
    id: 'camera',
    tabType: 'voice_video',
    label: 'Caméra',
    description: 'Caméra utilisée pour la vidéo.',
    keywords: ['caméra', 'camera', 'vidéo', 'webcam'],
    isAdvanced: false,
  },
  {
    id: 'noise-suppression',
    tabType: 'voice_video',
    label: 'Suppression de bruit',
    description: 'Activation par défaut de RNNoise.',
    keywords: ['bruit', 'noise', 'rnnoise', 'suppression', 'anti-bruit'],
    isAdvanced: false,
  },
  {
    id: 'push-to-talk',
    tabType: 'voice_video',
    label: 'Push-to-Talk',
    description: 'Parler uniquement quand la touche est enfoncée.',
    keywords: ['push to talk', 'ptt', 'raccourci', 'appuyer', 'parler'],
    isAdvanced: false,
  },
] as const satisfies ReadonlyArray<SectionDefinition>;
