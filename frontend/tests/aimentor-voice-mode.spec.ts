import { expect, test, type Page } from '@playwright/test';

/**
 * AIMentorChat — Voice mode toggle + STT/TTS regression.
 *
 * The chat is mounted directly on the `/aimentor` landing page (see
 * `AIMentorBookedAIApp.tsx`), so navigation is just `goto('/aimentor')`.
 *
 * Voice surface under test:
 * - Header "Voice off" / "Voice on" toggle button.
 * - When toggled on, `MentorVoiceController` renders next to the send button —
 *   it's `<button class="aim-mic-button">`.
 * - Mic click starts `webkitSpeechRecognition`; final transcripts are routed
 *   into `handleQuery(text)` which appends a user message bubble + a canned
 *   mentor `programNoMatch` reply (when the transcript doesn't match a
 *   program).
 * - The TTS effect watches `messages` and forwards each new assistant text
 *   message into `MentorVoiceController.speakText`, which in turn calls
 *   `window.speechSynthesis.speak(utterance)` with a male voice (e.g. Daniel).
 *
 * Real microphones / real synthesis are stubbed via `addInitScript`.
 */

const ROUTE = '/aimentor';

/**
 * Stubs `webkitSpeechRecognition` so a single click on the mic button
 * synchronously emits a final transcript and ends.
 */
async function stubSpeechRecognition(page: Page, transcript: string) {
  await page.addInitScript((text) => {
    class FakeSR {
      lang = 'en-US';
      interimResults = false;
      continuous = false;
      onresult: ((e: unknown) => void) | null = null;
      onend: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;

      start() {
        window.setTimeout(() => {
          const result = {
            0: { transcript: text },
            isFinal: true,
            length: 1,
            item: () => ({ transcript: text }),
          };
          this.onresult?.({
            resultIndex: 0,
            results: {
              0: result,
              length: 1,
              item: () => result,
            },
          });
          this.onend?.({});
        }, 50);
      }

      stop() {
        this.onend?.({});
      }

      abort() {
        this.onend?.({});
      }
    }

    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: FakeSR,
    });
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: FakeSR,
    });
  }, transcript);
}

/**
 * Stubs `window.speechSynthesis` AND `window.SpeechSynthesisUtterance` so we
 * can capture utterances + voice picks without a real audio backend. Also
 * stubs `getVoices` to return a known male voice ("Daniel") so
 * `pickMaleVoice` has a deterministic match.
 *
 * Why we replace `SpeechSynthesisUtterance` too: the production code does
 * `utterance.voice = pickedVoice`. The real WebKit/Blink Utterance rejects
 * any value that isn't a real `SpeechSynthesisVoice` — and we can't
 * construct those in JS, so we have to swap the constructor as well.
 */
async function stubSpeechSynthesis(page: Page) {
  await page.addInitScript(() => {
    const calls: Array<{ text: string; voice: string | null; lang: string }> = [];
    const fakeVoices = [
      { name: 'Daniel', lang: 'en-US', default: false, localService: false, voiceURI: 'Daniel' },
      { name: 'Samantha', lang: 'en-US', default: true, localService: false, voiceURI: 'Samantha' },
    ];

    class FakeUtterance {
      text: string;
      lang = '';
      voice: { name?: string } | null = null;
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      onstart: ((ev: Event) => void) | null = null;
      onpause: ((ev: Event) => void) | null = null;
      onresume: ((ev: Event) => void) | null = null;
      onmark: ((ev: Event) => void) | null = null;
      onboundary: ((ev: Event) => void) | null = null;
      constructor(t?: string) {
        this.text = t ?? '';
      }
    }

    const fakeSynth = {
      cancel: () => undefined,
      speak: (utterance: FakeUtterance) => {
        calls.push({
          text: utterance.text,
          voice: utterance.voice?.name ?? null,
          lang: utterance.lang,
        });
        // Fire onend on the next tick so the controller releases pendingSpeak.
        window.setTimeout(() => {
          try {
            utterance.onend?.(new Event('end'));
          } catch {
            /* ignore */
          }
        }, 30);
      },
      getVoices: () => fakeVoices,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: fakeSynth,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });

    (window as unknown as { __ttsCalls: typeof calls }).__ttsCalls = calls;
  });
}

test.describe('AIMentor voice mode', () => {
  test('voice toggle button is present and switches state', async ({ page }) => {
    // Recognition stub isn't strictly required here, but we load it so the
    // controller reports `supported = true` (otherwise the mic button is
    // disabled with the "Voice not supported" title).
    await stubSpeechRecognition(page, 'hello');
    await stubSpeechSynthesis(page);

    await page.goto(ROUTE);

    const toggle = page.getByRole('button', { name: /voice off|voice on/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText(/voice off/i);

    // Mic button is hidden until voice mode is on.
    await expect(page.locator('.aim-mic-button')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveText(/voice on/i);
    await expect(page.locator('.aim-mic-button')).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveText(/voice off/i);
    await expect(page.locator('.aim-mic-button')).toHaveCount(0);
  });

  test('stubbed transcript triggers user message in the chat', async ({ page }) => {
    const TRANSCRIPT = 'I want to learn AI automation';
    await stubSpeechRecognition(page, TRANSCRIPT);
    await stubSpeechSynthesis(page);

    await page.goto(ROUTE);

    const toggle = page.getByRole('button', { name: /voice off|voice on/i });
    await toggle.click();

    const mic = page.locator('.aim-mic-button');
    await expect(mic).toBeVisible();
    await mic.click();

    // The user bubble renders the raw transcript text. We don't have a
    // dedicated `data-role="user"` attribute — match by text alone, which is
    // unique enough for the spoken transcript string.
    await expect(page.getByText(TRANSCRIPT)).toBeVisible({ timeout: 5_000 });
  });

  test('TTS speaks last mentor message with the pinned male voice when voice mode is on', async ({
    page,
  }) => {
    await stubSpeechRecognition(page, 'unused');
    await stubSpeechSynthesis(page);

    // Stall the slots fetch indefinitely so the "Picked X. Loading open
    // slots…" assistant TEXT message stays as the LAST message in the
    // transcript long enough for the TTS effect (which only fires when the
    // last message is `kind: 'text'`) to pick it up. Without this, the
    // resolved-slots payload would push a non-text `slots` payload onto the
    // tail of the conversation and the TTS effect would short-circuit.
    await page.route('**/api/v1/aimentor/services/*/slots', async () => {
      // Hang the request — never fulfilled.
      await new Promise(() => undefined);
    });

    await page.goto(ROUTE);

    const toggle = page.getByRole('button', { name: /voice off|voice on/i });
    await toggle.click();
    await expect(toggle).toHaveText(/voice on/i);

    // Trigger the `aimentor:open-with-program` event the same way the
    // upstream program cards do (see `AIMentorBookedAIApp.tsx`). The chat
    // appends a synchronous user-text + assistant-text pair, so the
    // assistant text is the last message until the (stalled) slots fetch
    // resolves — that's the window the TTS effect uses to fire `speak`.
    // Small wait gives the chat's `useEffect` a beat to register its
    // window-level listener after the voice-toggle re-render.
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('aimentor:open-with-program', {
          detail: { programId: 'ai-mentor-private-first-ai-app-60' },
        }),
      );
    });

    // The English assistant text appended by the event handler.
    // Use a substring selector — regex `getByText` whitespace-normalisation
    // can miss the em-dash/ellipsis inside the rendered bubble.
    const mentorReply = page.locator('text=Loading open slots').first();
    await expect(mentorReply).toBeVisible({ timeout: 5_000 });

    // Give the TTS effect a beat to fire `speak`.
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              (
                (window as unknown as {
                  __ttsCalls?: Array<{ text: string; voice: string | null }>;
                }).__ttsCalls || []
              ).length,
          ),
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);

    const calls = await page.evaluate(
      () =>
        (
          window as unknown as {
            __ttsCalls: Array<{ text: string; voice: string | null; lang: string }>;
          }
        ).__ttsCalls,
    );

    expect(calls.length).toBeGreaterThan(0);
    // The first speak() call should be the mentor's text reply.
    expect(calls[0].text).toMatch(/Loading open slots/i);
    // `pickMaleVoice` should select "Daniel" out of the (Daniel, Samantha)
    // pair because Daniel matches the male-voice regex.
    expect(calls[0].voice).toBe('Daniel');
  });
});
