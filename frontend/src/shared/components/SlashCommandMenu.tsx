import {
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * <SlashCommandMenu> — Lane 7 P2 (review-2026-04-28).
 *
 * Floating verb-noun command menu that appears when a user types `/` inside a
 * composer textarea/input. Each command rewrites the prompt template + sends
 * a typed `intent_hint` to the backend via `context.intent_hint` on the next
 * `createCustomerAgentTurn` call.
 *
 * Design constraints honored:
 *   - Zero arbitrary hex colors. All surfaces use design tokens
 *     (apple-blue, apple-paper-blue-100, apple-paper-blue-200,
 *      apple-near-black, shadow-apple-pop, …).
 *   - 44×44 minimum tap target on every command row.
 *   - Mobile (≤ 640px): full-width drawer-style at the bottom of the viewport.
 *   - Desktop: rounded card with 12px radius (`rounded-xl`) anchored above or
 *     below the textarea, max-w-[420px].
 *   - Keyboard: ArrowUp / ArrowDown / Enter to pick, ESC to close. Focus
 *     stays in the textarea (no focus trap) so the user can keep typing.
 *   - Accessibility: `role="listbox"` on the menu, `role="option"` on each
 *     row, `aria-activedescendant` on the anchor textarea.
 *
 * Usage pattern (from `HomepageSearchExperience.tsx` and `SandboxApp.tsx`):
 *
 *   const composerRef = useRef<HTMLTextAreaElement | null>(null);
 *   const [value, setValue] = useState('');
 *   const [intentHint, setIntentHint] = useState<string | null>(null);
 *
 *   <textarea
 *     ref={composerRef}
 *     value={value}
 *     onChange={(e) => setValue(e.target.value)}
 *     aria-haspopup="listbox"
 *     aria-expanded={value.startsWith('/')}
 *     aria-controls="bookedai-slash-menu"
 *   />
 *   <SlashCommandMenu
 *     anchorEl={composerRef.current}
 *     inputValue={value}
 *     onValueChange={setValue}
 *     onSubmit={(template, hint) => {
 *       setIntentHint(hint);
 *       runSearch(template, { intentHint: hint });
 *     }}
 *   />
 */

export type SlashCommand = {
  /** Stable id for keys + analytics. */
  id: string;
  /** Visible label, e.g. "/find a service". */
  label: string;
  /** Right-side hint, e.g. "Search nearby providers". */
  hint: string;
  /** Template inserted into the textarea on select. Placeholders use `{name}`. */
  promptTemplate: string;
  /** Typed verb passed to backend as `context.intent_hint`. */
  intentHint: string;
  /** Optional shortcut prefix (e.g. "/find") used for filtering. */
  shortcut?: string;
};

export type SlashCommandMenuProps = {
  /**
   * The textarea/input the menu anchors to. The component uses
   * `getBoundingClientRect()` to position itself in fixed coordinates.
   */
  anchorEl: HTMLElement | null;
  /** Current textarea value. The menu hides if it does not start with `/`. */
  inputValue: string;
  /** Replace the textarea value (used when a command is picked). */
  onValueChange: (next: string) => void;
  /**
   * Fired when the user picks a command. The caller decides whether to
   * immediately submit, or to leave the template in the input for further
   * editing. The `intentHint` is the typed verb to forward to the backend.
   */
  onSubmit: (template: string, intentHint: string) => void;
  /** Optional override of the default 6-command set. */
  commands?: SlashCommand[];
  /**
   * Default `'above'`. The mobile-first homepage composer is sticky-bottom,
   * so the menu opens above by default. Desktop / sandbox surfaces can
   * pass `'below'`.
   */
  position?: 'above' | 'below';
  /** Optional class hook for tests / overrides. */
  className?: string;
};

export const defaultSlashCommands: SlashCommand[] = [
  {
    id: 'find',
    label: '/find a service',
    hint: 'Search nearby providers',
    promptTemplate: 'Find {service} near {location}',
    intentHint: 'find_service',
    shortcut: '/find',
  },
  {
    id: 'compare',
    label: '/compare options',
    hint: 'Side-by-side compare',
    promptTemplate: 'Compare {option_1} vs {option_2}',
    intentHint: 'compare_services',
    shortcut: '/compare',
  },
  {
    id: 'book',
    label: '/book',
    hint: 'Book a specific service',
    promptTemplate: 'Book {service} for {when}',
    intentHint: 'book_service',
    shortcut: '/book',
  },
  {
    id: 'quote',
    label: '/quote',
    hint: 'Get a price estimate',
    promptTemplate: 'Quote for {service} on {when}',
    intentHint: 'request_quote',
    shortcut: '/quote',
  },
  {
    id: 'portal',
    label: '/portal <ref>',
    hint: 'Open my booking portal',
    promptTemplate: 'Open my booking {booking_reference}',
    intentHint: 'open_portal',
    shortcut: '/portal',
  },
  {
    id: 'help',
    label: '/help',
    hint: 'How does BookedAI work?',
    promptTemplate: 'How does BookedAI work for my business?',
    intentHint: 'help',
    shortcut: '/help',
  },
];

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  bottom: number;
};

/**
 * Read the next `{placeholder}` token starting at index 0. Returns the
 * `[start, end]` range of the token (inclusive of the braces) or `null` if
 * none is present.
 */
function findFirstPlaceholderRange(template: string): [number, number] | null {
  const match = /\{[^{}\s]+\}/.exec(template);
  if (!match) {
    return null;
  }
  const start = match.index;
  return [start, start + match[0].length];
}

/**
 * Heuristic fuzzy filter — match by raw label / shortcut / id, case-insensitive.
 * The query is the substring after the leading `/` (e.g. `/fi` → `fi`).
 */
function filterCommands(
  commands: SlashCommand[],
  query: string,
): SlashCommand[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return commands;
  }
  return commands.filter((command) => {
    const haystack = [
      command.id,
      command.label,
      command.hint,
      command.shortcut ?? '',
      command.intentHint,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(trimmed);
  });
}

/**
 * Decide whether the menu should be open for the given input value.
 * Rule: the value must start with `/`, and the slash-token (everything
 * before the first whitespace) must not exceed 32 chars. We also close the
 * menu once the user moves past the slash command (i.e. types a space after
 * a complete shortcut), so it doesn't get in the way of free-text follow-on.
 */
function isMenuTriggered(value: string): boolean {
  if (!value.startsWith('/')) {
    return false;
  }
  const firstSpace = value.indexOf(' ');
  if (firstSpace === -1) {
    return value.length <= 32;
  }
  // Once a space appears, the user is past the verb — keep menu hidden so
  // they can type the rest of the prompt without obstruction.
  return false;
}

export function SlashCommandMenu(props: SlashCommandMenuProps) {
  const {
    anchorEl,
    inputValue,
    onValueChange,
    onSubmit,
    commands = defaultSlashCommands,
    position = 'above',
    className,
  } = props;

  const open = isMenuTriggered(inputValue);
  const slashQuery = open ? inputValue.slice(1) : '';
  const filtered = useMemo(
    () => filterCommands(commands, slashQuery),
    [commands, slashQuery],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= 640;
  });
  const listboxId = useId();
  const reactiveRef = useRef<HTMLDivElement | null>(null);

  // Keep activeIndex in valid range whenever the filtered list changes.
  useEffect(() => {
    setActiveIndex((current) => {
      if (filtered.length === 0) {
        return 0;
      }
      if (current >= filtered.length) {
        return 0;
      }
      return current;
    });
  }, [filtered.length]);

  // Track viewport width for mobile drawer styling.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    function update() {
      setIsMobileViewport(window.innerWidth <= 640);
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Recompute anchor rect when the menu opens or the anchor moves.
  useEffect(() => {
    if (!open || !anchorEl) {
      setAnchorRect(null);
      return undefined;
    }
    function recompute() {
      if (!anchorEl) {
        return;
      }
      const rect = anchorEl.getBoundingClientRect();
      setAnchorRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        bottom: rect.bottom,
      });
    }
    recompute();
    if (typeof window === 'undefined') {
      return undefined;
    }
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open, anchorEl, inputValue]);

  /** Apply a command to the input + fire onSubmit with the typed verb. */
  const applyCommand = useCallback(
    (command: SlashCommand) => {
      const template = command.promptTemplate;
      onValueChange(template);
      onSubmit(template, command.intentHint);

      // After replacing the value, move the cursor onto the first placeholder
      // so the user can immediately type the variable. Defer to the next
      // animation frame so React commits the new value first.
      const target = anchorEl as HTMLTextAreaElement | HTMLInputElement | null;
      if (
        target &&
        ('setSelectionRange' in target) &&
        typeof window !== 'undefined'
      ) {
        const range = findFirstPlaceholderRange(template);
        window.requestAnimationFrame(() => {
          try {
            target.focus();
            if (range) {
              target.setSelectionRange(range[0], range[1]);
            } else {
              target.setSelectionRange(template.length, template.length);
            }
          } catch {
            // setSelectionRange can throw on some input types (e.g. number);
            // safe to ignore — value is already set.
          }
        });
      }
    },
    [anchorEl, onSubmit, onValueChange],
  );

  /**
   * Keyboard nav. The host textarea forwards `onKeyDown` events to this
   * handler so we can intercept ArrowUp/Down/Enter/ESC while the menu is
   * open. Returns `true` if the event was handled (caller must `preventDefault`).
   */
  const handleAnchorKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>): boolean => {
      if (!open || filtered.length === 0) {
        if (open && event.key === 'Escape') {
          // Allow ESC to close even with no matches.
          onValueChange('');
          return true;
        }
        return false;
      }
      if (event.key === 'ArrowDown') {
        setActiveIndex((current) => (current + 1) % filtered.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (event.key === 'Enter') {
        const command = filtered[activeIndex];
        if (command) {
          applyCommand(command);
          return true;
        }
      }
      if (event.key === 'Escape') {
        // Clear the slash-only buffer, restoring focus to the anchor.
        onValueChange('');
        if (anchorEl && typeof (anchorEl as HTMLElement).focus === 'function') {
          (anchorEl as HTMLElement).focus();
        }
        return true;
      }
      return false;
    },
    [open, filtered, activeIndex, applyCommand, onValueChange, anchorEl],
  );

  // Wire keyboard nav to the anchor element. We attach a capture listener so
  // we can intercept Enter before the host textarea's own onKeyDown (which
  // typically submits the search) runs.
  useEffect(() => {
    if (!open || !anchorEl) {
      return undefined;
    }
    function onKey(event: KeyboardEvent) {
      const handled = handleAnchorKeyDown(
        event as unknown as ReactKeyboardEvent<HTMLElement>,
      );
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    anchorEl.addEventListener('keydown', onKey, true);
    return () => anchorEl.removeEventListener('keydown', onKey, true);
  }, [open, anchorEl, handleAnchorKeyDown]);

  // Reflect aria-activedescendant on the anchor. Done imperatively so we
  // don't have to mutate the textarea's JSX.
  useEffect(() => {
    if (!anchorEl) {
      return undefined;
    }
    const previous = anchorEl.getAttribute('aria-activedescendant');
    if (open && filtered.length > 0) {
      const activeId = `${listboxId}-row-${filtered[activeIndex]?.id ?? ''}`;
      anchorEl.setAttribute('aria-activedescendant', activeId);
      anchorEl.setAttribute('aria-controls', listboxId);
      anchorEl.setAttribute('aria-haspopup', 'listbox');
      anchorEl.setAttribute('aria-expanded', 'true');
    } else {
      anchorEl.removeAttribute('aria-activedescendant');
      anchorEl.setAttribute('aria-expanded', 'false');
    }
    return () => {
      if (!anchorEl.isConnected) {
        return;
      }
      if (previous === null) {
        anchorEl.removeAttribute('aria-activedescendant');
      } else {
        anchorEl.setAttribute('aria-activedescendant', previous);
      }
    };
  }, [anchorEl, open, filtered, activeIndex, listboxId]);

  if (!open) {
    return null;
  }

  // ---- Positioning ----
  // Mobile: full-width bottom drawer, ignoring anchor rect.
  // Desktop: fixed card anchored above (or below) the input.
  const menuStyle: React.CSSProperties = (() => {
    if (isMobileViewport) {
      return {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 70,
      };
    }
    if (!anchorRect) {
      return { position: 'fixed', visibility: 'hidden', zIndex: 70 };
    }
    const width = Math.max(280, Math.min(420, anchorRect.width));
    const left = anchorRect.left;
    const above = position === 'above';
    if (above) {
      return {
        position: 'fixed',
        left,
        bottom: Math.max(8, window.innerHeight - anchorRect.top + 8),
        width,
        zIndex: 70,
      };
    }
    return {
      position: 'fixed',
      left,
      top: anchorRect.bottom + 8,
      width,
      zIndex: 70,
    };
  })();

  return (
    <div
      ref={reactiveRef}
      data-testid="slash-menu"
      data-slash-position={isMobileViewport ? 'mobile-drawer' : position}
      className={
        // Mobile drawer: full-bleed bottom, rounded top corners, large shadow.
        // Desktop card: rounded-xl, max-w-[420px], shadow-apple-pop.
        [
          'overflow-hidden border border-apple-paper-blue-200 bg-white shadow-apple-pop motion-safe:animate-[bookedai-slash-in_220ms_ease-out]',
          isMobileViewport
            ? 'w-full rounded-t-2xl pb-[env(safe-area-inset-bottom)]'
            : 'rounded-xl',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')
      }
      style={menuStyle}
    >
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Slash commands"
        data-testid="slash-menu-list"
        className="max-h-[60vh] overflow-y-auto py-1.5"
      >
        {filtered.length === 0 ? (
          <li
            className="px-4 py-3 text-sm text-apple-text-secondary"
            data-testid="slash-menu-empty"
          >
            No commands match &ldquo;{slashQuery}&rdquo;. Try /find, /book, or /help.
          </li>
        ) : (
          filtered.map((command, index) => {
            const isActive = index === activeIndex;
            const rowId = `${listboxId}-row-${command.id}`;
            return (
              <li
                key={command.id}
                id={rowId}
                role="option"
                aria-selected={isActive}
                data-testid="slash-menu-row"
                data-slash-row-id={command.id}
                data-slash-active={isActive ? 'true' : 'false'}
              >
                <button
                  type="button"
                  // `onMouseDown` (not click) so the menu reacts before the
                  // host textarea loses focus / blur.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyCommand(command);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue ${
                    isActive
                      ? 'bg-apple-blue/10 ring-1 ring-apple-blue/40'
                      : 'hover:bg-apple-paper-blue-100'
                  }`}
                  tabIndex={-1}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold tracking-[-0.01em] text-apple-near-black">
                      {command.label}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 truncate text-xs text-apple-text-secondary">
                    {command.hint}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      <div
        className="flex items-center justify-between gap-3 border-t border-apple-paper-blue-200 bg-apple-paper-blue-50 px-4 py-2 text-[11px] text-apple-text-secondary"
        data-testid="slash-menu-footer"
      >
        <span>Type the rest, or pick another command</span>
        <span className="template-chip hidden sm:inline-flex">esc to close</span>
      </div>
      <style>{`
        @keyframes bookedai-slash-in {
          from { opacity: 0; transform: translateY(${position === 'above' ? '6px' : '-6px'}); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default SlashCommandMenu;
