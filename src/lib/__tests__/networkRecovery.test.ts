import { describe, expect, it } from 'vitest';
import { isTransientNetworkError } from '@/lib/networkErrors';
import { parseSignalData } from '@/utils/webrtc/PeerConnection';

describe('network recovery helpers', () => {
  it('retries transport failures but not HTTP responses', () => {
    expect(isTransientNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransientNetworkError(new Error('net::ERR_NETWORK_CHANGED'))).toBe(true);
    expect(isTransientNetworkError({ message: 'Bad request', status: 400 })).toBe(false);
    expect(isTransientNetworkError(new Error('Invalid message content'))).toBe(false);
  });

  it('accepts valid WebRTC signals and rejects malformed payloads', () => {
    expect(parseSignalData('offer', { type: 'offer', sdp: 'v=0' })).toEqual({
      type: 'offer',
      data: { type: 'offer', sdp: 'v=0' },
    });
    expect(parseSignalData('ice-candidate', { candidate: 'candidate:1' })).toEqual({
      type: 'ice-candidate',
      data: { candidate: 'candidate:1' },
    });
    expect(parseSignalData('answer', { type: 'answer' })).toBeNull();
    expect(parseSignalData('unknown', {})).toBeNull();
  });
});
