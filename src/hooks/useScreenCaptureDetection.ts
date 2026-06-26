import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type CaptureEvent =
  | 'screenshot'
  | 'screen_recording_start'
  | 'screen_recording_stop';

/**
 * Detects native screen captures / screen recordings while the user is in a
 * DM conversation, and posts a system message to that conversation via the
 * `report_screen_capture` RPC.
 *
 * On the web (no Capacitor native runtime), this is a no-op — the privacy-screen
 * plugin's APIs only exist inside a native shell.
 *
 * The caller's preference (`profiles.notify_screenshot_capture`) is enforced
 * server-side: if disabled, the RPC silently skips the insert.
 */
export function useScreenCaptureDetection(conversationId: string | null) {
  useEffect(() => {
    if (!conversationId) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      let Capacitor: any;
      let PrivacyScreen: any;
      try {
        ({ Capacitor } = await import('@capacitor/core'));
      } catch {
        return;
      }
      if (!Capacitor?.isNativePlatform?.()) return;

      try {
        const mod: any = await import('@capacitor-community/privacy-screen');
        PrivacyScreen = mod.PrivacyScreen ?? mod.default;
      } catch {
        return;
      }
      if (cancelled || !PrivacyScreen?.addListener) return;

      const report = (event: CaptureEvent) => {
        supabase
          .rpc('report_screen_capture', {
            _conversation_id: conversationId,
            _event: event,
          })
          .then(({ error }) => {
            if (error) console.error('[screen-capture] report failed', error);
          });
      };

      const handles: Array<{ remove: () => void } | undefined> = [];
      const events: Array<[string, CaptureEvent]> = [
        ['screenshotTaken', 'screenshot'],
        ['screenRecordingStarted', 'screen_recording_start'],
        ['screenRecordingStopped', 'screen_recording_stop'],
      ];
      for (const [name, type] of events) {
        try {
          const h = await PrivacyScreen.addListener(name, () => report(type));
          handles.push(h);
        } catch {/* event may not exist on this platform */}
      }

      cleanup = () => {
        for (const h of handles) {
          try { h?.remove?.(); } catch {/* */}
        }
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [conversationId]);
}
