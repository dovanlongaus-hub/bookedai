import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { ArrowUp, Mic, Sparkles } from 'lucide-react';

import { DEMO_PROMPTS } from './constants';
import type { DemoAssessmentSession, DemoMessage } from './types';

function messageToneClasses(tone: DemoMessage['tone'], role: DemoMessage['role']) {
  if (role === 'user') {
    return 'ml-auto bg-apple-blue text-white';
  }

  if (tone === 'success') {
    return 'border border-apple-blue/30 bg-apple-blue/10 text-white';
  }

  if (tone === 'warning' || role === 'system') {
    return 'border border-amber-400/30 bg-amber-500/10 text-amber-50';
  }

  return 'border border-white/10 bg-apple-dark-2 text-white/85';
}

function AnimatedAssistantText(props: {
  body: string;
  animate: boolean;
}) {
  const [visibleWordCount, setVisibleWordCount] = useState(props.animate ? 0 : props.body.split(/\s+/).length);
  const words = props.body.split(/\s+/);

  useEffect(() => {
    if (!props.animate) {
      setVisibleWordCount(words.length);
      return;
    }

    setVisibleWordCount(0);
    const interval = window.setInterval(() => {
      setVisibleWordCount((current) => {
        if (current >= words.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 38);

    return () => window.clearInterval(interval);
  }, [props.animate, props.body, words.length]);

  return <>{words.slice(0, visibleWordCount).join(' ')}</>;
}

export function DemoChatStage(props: {
  messages: DemoMessage[];
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: () => void;
  onPromptClick: (prompt: string) => void;
  onVoiceInput: () => void;
  searching: boolean;
  assistantTyping: boolean;
  isAutoPlaying: boolean;
  voiceSupported: boolean;
  voiceListening: boolean;
  assessment: DemoAssessmentSession | null;
  assessmentPending: boolean;
  assessmentError: string;
  onAssessmentAnswer: (optionId: string) => void;
}) {
  return (
    <section className="relative flex min-h-[680px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-apple-dark-2">
      <div className="relative border-b border-white/10 px-5 pb-7 pt-8 sm:px-7 sm:pb-8 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          className="mx-auto max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-apple-blue/20 bg-apple-blue/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            <Sparkles className="h-3.5 w-3.5 text-apple-blue" aria-hidden="true" />
            ai intake
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Watch BookedAI place, book, pay, and follow up — live.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Real operator. Live Stripe. Full AI flow. Type a request like a real customer would, and watch BookedAI capture intent, match a service, take the booking, post the deposit, and send the follow-up — without losing context.
          </p>

          {props.isAutoPlaying ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-apple-blue/20 bg-apple-blue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white"
            >
              <span className="h-2 w-2 rounded-full bg-apple-blue" aria-hidden="true" />
              See it book a real customer
            </motion.div>
          ) : null}

          <div className="mt-8 rounded-[26px] border border-white/10 bg-black/30 p-3 focus-within:border-apple-blue/60 focus-within:ring-2 focus-within:ring-apple-blue/20 motion-safe:transition-all duration-200">
            <div className="flex items-end gap-3">
              <label htmlFor="demo-chat-composer" className="sr-only">
                Describe what you want to book
              </label>
              <textarea
                id="demo-chat-composer"
                value={props.draft}
                onChange={(event) => props.setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    props.onSubmit();
                  }
                }}
                placeholder="Example: Beginner swimming for my 8 year old in Sydney"
                className="min-h-[112px] flex-1 resize-none bg-transparent px-3 py-2 text-base leading-8 text-white outline-none placeholder:text-white/40 sm:text-lg"
              />

              <div className="flex items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={props.onVoiceInput}
                  disabled={!props.voiceSupported || props.voiceListening}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 motion-safe:transition-all duration-200 hover:border-apple-blue/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Start voice input"
                >
                  <Mic className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={props.onSubmit}
                  disabled={props.searching}
                  className="inline-flex h-12 min-h-[44px] items-center justify-center gap-2 rounded-full bg-apple-blue px-5 text-sm font-semibold text-white shadow-[0_9px_22px_rgba(0,113,227,0.18)] motion-safe:transition-all duration-200 hover:bg-apple-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-apple-dark-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {props.searching ? 'Searching live operators…' : 'Find & book'}
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 px-3 pb-1 text-xs text-white/50">
              <span>{props.voiceListening ? 'Listening…' : 'Type or speak'}</span>
              <span aria-hidden="true">Search · match · book · pay · follow up</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {DEMO_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => props.onPromptClick(prompt)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 motion-safe:transition-all duration-200 hover:border-apple-blue/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Live operator search', 'Smart intake', 'Customer report ready'].map((label) => (
              <div key={label} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
                {label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="relative flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
        {props.assessment ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] border border-apple-blue/25 bg-apple-blue/8 p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-apple-blue">Match in progress</div>
                <h2 className="mt-2 text-lg font-semibold text-white">{props.assessment.academyName}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/80">
                {props.assessment.progressPercent}% complete
              </div>
            </div>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={props.assessment.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-apple-blue motion-safe:transition-all duration-300"
                style={{ width: `${props.assessment.progressPercent}%` }}
              />
            </div>

            {props.assessment.result ? (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/55">Match found</div>
                <div className="mt-2 text-xl font-semibold text-white">{props.assessment.result.level}</div>
                <div className="mt-1 text-sm text-white/75">{props.assessment.result.summary}</div>
              </div>
            ) : props.assessment.currentQuestion ? (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/55">
                  Question {props.assessment.answeredCount + 1} of {props.assessment.totalQuestions}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">{props.assessment.currentQuestion.prompt}</h3>
                {props.assessment.currentQuestion.helper_text ? (
                  <div className="mt-2 text-sm text-white/70">{props.assessment.currentQuestion.helper_text}</div>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {props.assessment.currentQuestion.options.map((option) => (
                    <button
                      key={option.option_id}
                      type="button"
                      onClick={() => props.onAssessmentAnswer(option.option_id)}
                      disabled={props.assessmentPending}
                      className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-white motion-safe:transition-all duration-200 hover:border-apple-blue/40 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="font-medium text-white">{option.label}</div>
                      {option.description ? <div className="mt-1 text-xs text-white/55">{option.description}</div> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {props.assessmentError ? (
              <div className="mt-4 rounded-[18px] border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">
                {props.assessmentError}
              </div>
            ) : null}
          </motion.div>
        ) : null}

        {props.messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.02 }}
            className={`max-w-[88%] rounded-[24px] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.3)] ${messageToneClasses(message.tone, message.role)}`}
          >
            {message.title ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{message.title}</div> : null}
            <div className="mt-1 text-sm leading-7">
              {message.role === 'assistant' || message.role === 'system' ? (
                <AnimatedAssistantText
                  body={message.body}
                  animate={index === props.messages.length - 1}
                />
              ) : (
                message.body
              )}
            </div>
          </motion.div>
        ))}

        {props.assistantTyping ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[88%] rounded-[24px] border border-white/10 bg-apple-dark-2 px-4 py-3 text-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.3)]"
            aria-live="polite"
            aria-label="BookedAI is thinking"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">BookedAI</div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-apple-blue [animation-delay:-0.2s]" aria-hidden="true" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-apple-blue [animation-delay:-0.1s]" aria-hidden="true" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-apple-blue" aria-hidden="true" />
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
