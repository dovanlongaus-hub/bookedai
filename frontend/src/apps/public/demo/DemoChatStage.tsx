import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { ArrowUp, Mic, Sparkles } from 'lucide-react';

import { DEMO_PROMPTS } from './constants';
import type { DemoAssessmentSession, DemoMessage } from './types';

function messageToneClasses(tone: DemoMessage['tone'], role: DemoMessage['role']) {
  if (role === 'user') {
    return 'bookedai-saas-chat-bubble bookedai-saas-chat-bubble-user ml-auto text-white';
  }

  if (tone === 'success') {
    return 'bookedai-saas-chat-bubble bookedai-saas-chat-bubble-success text-[#D6FFF2]';
  }

  if (tone === 'warning' || role === 'system') {
    return 'bookedai-saas-chat-bubble bookedai-saas-chat-bubble-warning text-[#FFE8C2]';
  }

  return 'bookedai-saas-chat-bubble bookedai-saas-chat-bubble-assistant text-slate-200';
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
    <section className="bookedai-saas-panel relative flex min-h-[680px] flex-col overflow-hidden rounded-[28px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_34%)]" />

      <div className="relative border-b border-white/8 px-5 pb-7 pt-8 sm:px-7 sm:pb-8 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          className="mx-auto max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#20F6B3]/20 bg-[#20F6B3]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#BFFFEF]">
            <Sparkles className="h-3.5 w-3.5" />
            AI intake
          </div>
          <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
            Place the right student, then book the class.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            A parent describes the goal once. BookedAI searches the academy, runs the intake, recommends a pathway, and opens booking without losing context.
          </p>

          {props.isAutoPlaying ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[#20F6B3]/20 bg-[#20F6B3]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#BFFFEF]"
            >
              <span className="h-2 w-2 rounded-full bg-[#20F6B3]" />
              Watch it book
            </motion.div>
          ) : null}

          <div className="bookedai-saas-focus-ring bookedai-saas-panel mt-8 rounded-[26px] p-3">
            <div className="flex items-end gap-3">
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
                placeholder="Example: Chess classes for my 8 year old in Sydney"
                className="min-h-[112px] flex-1 resize-none bg-transparent px-3 py-2 text-base leading-8 text-white outline-none placeholder:text-slate-500 sm:text-lg"
              />

              <div className="flex items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={props.onVoiceInput}
                  disabled={!props.voiceSupported || props.voiceListening}
                  className="bookedai-saas-icon-button inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Start voice input"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={props.onSubmit}
                  disabled={props.searching}
                  className="bookedai-saas-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {props.searching ? 'Finding...' : 'Run flow'}
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 px-3 pb-1 text-xs text-slate-500">
              <span>{props.voiceListening ? 'Listening...' : 'Type or speak'}</span>
              <span>{'Search · assess · place · book'}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {DEMO_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => props.onPromptClick(prompt)}
                className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-[#20F6B3]/35 hover:bg-white/[0.08] hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Live tenant search', 'Skill assessment', 'Portal-ready report'].map((label) => (
              <div key={label} className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
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
            className="rounded-[24px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.12),rgba(0,209,255,0.08))] p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#BFFFEF]">Assessment</div>
                <div className="mt-2 text-lg font-semibold">{props.assessment.academyName}</div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-200">
                {props.assessment.progressPercent}% complete
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#20F6B3_0%,#00D1FF_100%)]"
                style={{ width: `${props.assessment.progressPercent}%` }}
              />
            </div>

            {props.assessment.result ? (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/15 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Level placed</div>
                <div className="mt-2 text-xl font-semibold text-white">{props.assessment.result.level}</div>
                <div className="mt-1 text-sm text-slate-200">{props.assessment.result.summary}</div>
              </div>
            ) : props.assessment.currentQuestion ? (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/15 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Question {props.assessment.answeredCount + 1} of {props.assessment.totalQuestions}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{props.assessment.currentQuestion.prompt}</div>
                {props.assessment.currentQuestion.helper_text ? (
                  <div className="mt-2 text-sm text-slate-300">{props.assessment.currentQuestion.helper_text}</div>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {props.assessment.currentQuestion.options.map((option) => (
                    <button
                      key={option.option_id}
                      type="button"
                      onClick={() => props.onAssessmentAnswer(option.option_id)}
                      disabled={props.assessmentPending}
                      className="rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-left text-sm text-slate-100 transition hover:border-[#20F6B3]/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="font-medium text-white">{option.label}</div>
                      {option.description ? <div className="mt-1 text-xs text-slate-400">{option.description}</div> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {props.assessmentError ? (
              <div className="mt-4 rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
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
            className={`max-w-[88%] rounded-[24px] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${messageToneClasses(message.tone, message.role)}`}
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
            className="bookedai-saas-chat-bubble bookedai-saas-chat-bubble-assistant max-w-[88%] rounded-[24px] px-4 py-3 text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">BookedAI</div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#20F6B3] [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#20F6B3] [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#20F6B3]" />
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
