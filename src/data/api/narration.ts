'use client';
import { getApiMode } from './client';

export type NarrationPhase = 'scene' | 'denouement';

export type NarrationHandlers = {
  onDelta: (text: string) => void;
  onDone: () => void;
  /** The narrator failed and sent a canned text. The UI must tell the user (never silent). */
  onFallback: (text: string) => void;
  onError: (error: Error) => void;
};

/** Reads the server-sent event stream. Returns a cancel function. Reconnects once on a dropped stream. */
export function streamNarration(sessionId: string, beatId: string, phase: NarrationPhase, h: NarrationHandlers) {
  const controller = new AbortController();
  let finished = false;

  async function run(attempt: number): Promise<void> {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/beats/${beatId}/narration?phase=${phase}`, {
        headers: { accept: 'text/event-stream', 'x-nx-mode': getApiMode() },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Narration stream failed (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const event = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.*)$/m.exec(block)?.[1];
          if (!event || data === undefined) continue;
          const payload = data ? (JSON.parse(data) as { delta?: string; text?: string }) : {};
          if (event === 'scene' || event === 'denouement') h.onDelta(payload.delta ?? '');
          else if (event === 'fallback') {
            finished = true;
            h.onFallback(payload.text ?? '');
            return;
          } else if (event === 'done') {
            finished = true;
            h.onDone();
            return;
          }
        }
      }
      if (!finished) throw new Error('Narration stream ended early');
    } catch (e) {
      if (controller.signal.aborted) return;
      if (attempt === 0) return run(1);
      h.onError(e instanceof Error ? e : new Error('Narration stream failed'));
    }
  }
  void run(0);
  return () => controller.abort();
}
