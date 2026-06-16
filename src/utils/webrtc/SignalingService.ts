import { supabase } from '@/integrations/supabase/client';
import { SignalData, SignalType } from './PeerConnection';

export type OnSignalReceivedCallback = (fromUserId: string, signal: SignalData) => void;

export class SignalingService {
  private channelId: string;
  private userId: string;
  private onSignalReceived: OnSignalReceivedCallback;
  private subscription: ReturnType<typeof supabase.channel> | null = null;
  private instanceId: string;

  constructor(channelId: string, userId: string, onSignalReceived: OnSignalReceivedCallback) {
    this.channelId = channelId;
    this.userId = userId;
    this.onSignalReceived = onSignalReceived;
    this.instanceId = crypto.randomUUID();
  }

  async start(): Promise<void> {
    console.log('[SignalingService] Starting for channel:', this.channelId, 'instance:', this.instanceId);

    this.subscription = supabase
      .channel(`voice-signals-${this.channelId}-${this.instanceId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_signals',
          filter: `to_user_id=eq.${this.userId}`,
        },
        async (payload) => {
          const signal = payload.new as {
            id: string;
            from_user_id: string;
            signal_type: SignalType;
            signal_data: any;
          };

          console.log('[SignalingService] Received signal:', signal.signal_type, 'from:', signal.from_user_id);

          this.onSignalReceived(signal.from_user_id, {
            type: signal.signal_type,
            data: signal.signal_data,
          });

          // Clean up the processed signal
          await supabase
            .from('voice_signals')
            .delete()
            .eq('id', signal.id);
        }
      )
      .subscribe();
  }

  async sendSignal(toUserId: string, signal: SignalData): Promise<void> {
    console.log('[SignalingService] Sending signal:', signal.type, 'to:', toUserId);

    // Convert signal data to JSON-compatible format
    const signalDataJson = JSON.parse(JSON.stringify(signal.data));

    const { error } = await supabase.from('voice_signals').insert([{
      from_user_id: this.userId,
      to_user_id: toUserId,
      channel_id: this.channelId,
      signal_type: signal.type,
      signal_data: signalDataJson,
    }]);

    if (error) {
      console.error('[SignalingService] Failed to send signal:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.subscription) {
      await supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    // Clean up any pending signals
    await supabase
      .from('voice_signals')
      .delete()
      .or(`from_user_id.eq.${this.userId},to_user_id.eq.${this.userId}`)
      .eq('channel_id', this.channelId);

    console.log('[SignalingService] Stopped');
  }
}
