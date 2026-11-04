import { supabase } from '@/integrations/supabase/client';
import { parseSignalData, SignalData } from './PeerConnection';

export type OnSignalReceivedCallback = (fromUserId: string, signal: SignalData) => void | Promise<void>;

export class SignalingService {
  private channelId: string;
  private userId: string;
  private onSignalReceived: OnSignalReceivedCallback;
  private subscription: ReturnType<typeof supabase.channel> | null = null;
  private instanceId: string;
  private processingSignalIds = new Set<string>();
  private processedSignalIds = new Set<string>();

  constructor(channelId: string, userId: string, onSignalReceived: OnSignalReceivedCallback) {
    this.channelId = channelId;
    this.userId = userId;
    this.onSignalReceived = onSignalReceived;
    this.instanceId = crypto.randomUUID();
  }

  get isConnected(): boolean {
    return (this.subscription as unknown as { state?: string } | null)?.state === 'joined';
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
          await this.processSignal(payload.new as {
            id: string;
            channel_id: string;
            from_user_id: string;
            signal_type: string;
            signal_data: unknown;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void this.drainPendingSignals();
      });
  }

  async reconnect(): Promise<void> {
    if (this.subscription) {
      await supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
    await this.start();
  }

  private async drainPendingSignals(): Promise<void> {
    const { data, error } = await supabase
      .from('voice_signals')
      .select('id, channel_id, from_user_id, signal_type, signal_data')
      .eq('channel_id', this.channelId)
      .eq('to_user_id', this.userId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      console.error('[SignalingService] Failed to recover missed voice signals:', error);
      return;
    }

    for (const signal of data ?? []) {
      await this.processSignal(signal);
    }
  }

  private async processSignal(signal: {
    id: string;
    channel_id: string;
    from_user_id: string;
    signal_type: string;
    signal_data: unknown;
  }): Promise<void> {
    if (signal.channel_id !== this.channelId) return;
    if (this.processingSignalIds.has(signal.id) || this.processedSignalIds.has(signal.id)) return;
    this.processingSignalIds.add(signal.id);
    try {
      const parsedSignal = parseSignalData(signal.signal_type, signal.signal_data);
      if (!parsedSignal) {
        console.error('[SignalingService] Discarding invalid voice signal:', signal.id);
        return;
      }
      await this.onSignalReceived(signal.from_user_id, parsedSignal);
      this.processedSignalIds.add(signal.id);
      const { error } = await supabase.from('voice_signals').delete().eq('id', signal.id);
      if (error) console.error('[SignalingService] Failed to delete processed signal:', error);
    } catch (error) {
      console.error('[SignalingService] Failed to process voice signal:', error);
    } finally {
      this.processingSignalIds.delete(signal.id);
    }
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
