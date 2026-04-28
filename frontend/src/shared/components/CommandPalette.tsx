import {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * <CommandPalette> — Cmd-K / Ctrl-K command palette for BookedAI.
 *
 * Lane 7 P9 (review-2026-04-28). Linear-style power-user navigation across
 * Public, Portal, Tenant, and Admin surfaces. Mounted at the top level of
 * each surface app shell.
 *
 * Constraints honored:
 *   - Zero arbitrary hex colors. Uses tokens from minimal-bento-template.css
 *     / styles.css (apple-blue, apple-paper-blue-100, shadow-apple-pop, …).
 *   - No new dependencies — fuzzy match, focus trap, and animation are inline.
 *   - 44×44 minimum tap targets on every interactive row.
 *   - Mobile (≤ 640px) renders as a full-height bottom sheet.
 *   - Focus trap + restore + ESC + overlay-click + Cmd-K toggle to dismiss.
 */

export type CommandIntent = 'navigate' | 'lookup' | 'action' | 'agent';

export type CommandGroup =
  | 'Navigation'
  | 'Bookings'
  | 'Tenants'
  | 'Actions'
  | 'Agent'
  | 'Help';

export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  intent: CommandIntent;
  group: CommandGroup;
  keywords?: string[];
  shortcut?: string;
  run: () => void | Promise<void>;
};

export type CommandPaletteProps = {
  /** Surface-specific extra commands appended to the default command set. */
  extraCommands?: Command[];
  /** Surface label, used for analytics + UI hints. */
  surface?: 'public' | 'portal' | 'tenant' | 'admin';
};

const RECENT_STORAGE_KEY = 'bookedai.cmdk.recent';
const RECENT_LIMIT = 5;
const RESULT_LIMIT = 8;

const GROUP_ORDER: CommandGroup[] = [
  'Navigation',
  'Bookings',
  'Tenants',
  'Actions',
  'Agent',
  'Help',
];

function safeNavigate(href: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.href = href;
}

function safeOpen(href: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}

function readRecent(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function writeRecent(ids: string[]) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify(ids.slice(0, RECENT_LIMIT)),
    );
  } catch {
    // sessionStorage unavailable — ignore.
  }
}

/**
 * Tiny inline fuzzy matcher.
 *  - char-by-char subsequence match against label + keywords
 *  - boost when match starts at label[0]
 *  - boost when whole query is a keyword substring
 *  - returns null when query has no fuzzy hit
 */
function fuzzyScore(query: string, command: Command): number | null {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 0;
  }

  const label = command.label.toLowerCase();
  const keywords = (command.keywords ?? []).map((value) => value.toLowerCase());
  const haystack = [label, ...keywords].join(' ');

  // Substring match bonuses first — cheap and decisive.
  if (label.startsWith(q)) {
    return 1000 - label.length;
  }
  if (label.includes(q)) {
    return 700 - label.indexOf(q);
  }
  if (keywords.some((keyword) => keyword.includes(q))) {
    return 500;
  }

  // Subsequence match across label.
  let li = 0;
  let qi = 0;
  let runs = 0;
  let lastMatchedIndex = -2;
  while (li < label.length && qi < q.length) {
    if (label[li] === q[qi]) {
      if (li !== lastMatchedIndex + 1) {
        runs += 1;
      }
      lastMatchedIndex = li;
      qi += 1;
    }
    li += 1;
  }
  if (qi === q.length) {
    return 300 - runs * 8 - label.length;
  }

  // Subsequence match across haystack (label + keywords) as a fallback.
  let hi = 0;
  let hqi = 0;
  while (hi < haystack.length && hqi < q.length) {
    if (haystack[hi] === q[hqi]) {
      hqi += 1;
    }
    hi += 1;
  }
  if (hqi === q.length) {
    return 100 - haystack.length;
  }

  return null;
}

function groupCommands(commands: Command[]): Array<{ group: CommandGroup; items: Command[] }> {
  const buckets = new Map<CommandGroup, Command[]>();
  for (const command of commands) {
    const list = buckets.get(command.group);
    if (list) {
      list.push(command);
    } else {
      buckets.set(command.group, [command]);
    }
  }
  const sorted: Array<{ group: CommandGroup; items: Command[] }> = [];
  for (const group of GROUP_ORDER) {
    const items = buckets.get(group);
    if (items && items.length > 0) {
      sorted.push({ group, items });
    }
  }
  return sorted;
}

function buildDefaultCommands(): Command[] {
  const isBrowser = typeof window !== 'undefined';
  return [
    {
      id: 'nav.home',
      label: 'Open homepage',
      hint: 'bookedai.au',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['home', 'landing', 'main', 'public'],
      run: () => safeNavigate('https://bookedai.au'),
    },
    {
      id: 'nav.product',
      label: 'Open product',
      hint: 'product.bookedai.au',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['product', 'app', 'assistant'],
      run: () => safeNavigate('https://product.bookedai.au'),
    },
    {
      id: 'nav.portal',
      label: 'Open portal',
      hint: 'portal.bookedai.au',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['portal', 'booking', 'customer'],
      run: () => safeNavigate('https://portal.bookedai.au'),
    },
    {
      id: 'nav.tenant',
      label: 'Open tenant workspace',
      hint: 'tenant.bookedai.au',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['tenant', 'workspace', 'business'],
      run: () => safeNavigate('https://tenant.bookedai.au'),
    },
    {
      id: 'nav.admin',
      label: 'Open admin',
      hint: 'admin.bookedai.au',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['admin', 'reliability', 'audit'],
      run: () => safeNavigate('https://admin.bookedai.au'),
    },
    {
      id: 'nav.pitch',
      label: 'Open pitch deck',
      hint: '/pitch',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['pitch', 'investor', 'deck'],
      run: () => safeNavigate('https://bookedai.au/pitch'),
    },
    {
      id: 'nav.roadmap',
      label: 'Open roadmap',
      hint: '/roadmap',
      intent: 'navigate',
      group: 'Navigation',
      keywords: ['roadmap', 'plan', 'upcoming'],
      run: () => safeNavigate('https://bookedai.au/roadmap'),
    },
    {
      id: 'bookings.lookup',
      label: 'Look up booking by reference',
      hint: 'enter ref',
      intent: 'lookup',
      group: 'Bookings',
      keywords: ['booking', 'reference', 'ref', 'find'],
      run: () => {
        if (!isBrowser) {
          return;
        }
        const value = window.prompt('Enter booking reference (e.g. BKD-12345)');
        if (!value) {
          return;
        }
        const trimmed = value.trim();
        if (!trimmed) {
          return;
        }
        safeNavigate(`https://portal.bookedai.au/?ref=${encodeURIComponent(trimmed)}`);
      },
    },
    {
      id: 'tenants.switch',
      label: 'Switch tenant',
      hint: 'pick a tenant',
      intent: 'lookup',
      group: 'Tenants',
      keywords: ['tenant', 'switch', 'change'],
      run: () => {
        if (!isBrowser) {
          return;
        }
        // No live tenant directory on the public surface — route to the
        // tenant workspace gateway, which already handles selection.
        safeNavigate('https://tenant.bookedai.au');
      },
    },
    {
      id: 'actions.live_demo',
      label: 'Run live demo',
      hint: 'WSTI proof path',
      intent: 'action',
      group: 'Actions',
      keywords: ['demo', 'live', 'wsti', 'proof'],
      run: () => safeNavigate('https://bookedai.au/?demo=wsti'),
    },
    {
      id: 'actions.talk_to_human',
      label: 'Talk to BookedAI human',
      hint: '10 min',
      intent: 'action',
      group: 'Actions',
      keywords: ['call', 'human', 'sales', 'contact'],
      run: () => safeNavigate('https://bookedai.au/pitch#contact'),
    },
    {
      id: 'actions.feedback',
      label: 'Send feedback',
      hint: 'mailto',
      intent: 'action',
      group: 'Actions',
      keywords: ['feedback', 'email', 'support'],
      run: () => safeNavigate('mailto:hello@bookedai.au?subject=BookedAI%20feedback'),
    },
    {
      id: 'agent.toggle_drawer',
      label: 'Toggle agent activity drawer',
      hint: 'open/close',
      intent: 'agent',
      group: 'Agent',
      keywords: ['agent', 'drawer', 'activity'],
      run: () => {
        if (!isBrowser) {
          return;
        }
        window.dispatchEvent(new CustomEvent('bookedai:agent-drawer-toggle'));
      },
    },
    {
      id: 'agent.show_citations',
      label: 'Show citations',
      hint: 'evidence panel',
      intent: 'agent',
      group: 'Agent',
      keywords: ['citations', 'evidence', 'sources'],
      run: () => {
        if (!isBrowser) {
          return;
        }
        window.dispatchEvent(new CustomEvent('bookedai:agent-citations-show'));
      },
    },
    {
      id: 'help.docs',
      label: 'Open documentation',
      hint: '/docs',
      intent: 'navigate',
      group: 'Help',
      keywords: ['docs', 'documentation', 'help'],
      run: () => safeNavigate('https://bookedai.au/docs'),
    },
    {
      id: 'help.changelog',
      label: 'Open changelog',
      hint: '/changelog',
      intent: 'navigate',
      group: 'Help',
      keywords: ['changelog', 'updates', 'releases'],
      run: () => safeNavigate('https://bookedai.au/changelog'),
    },
    {
      id: 'help.status',
      label: 'Open status',
      hint: '/status',
      intent: 'navigate',
      group: 'Help',
      keywords: ['status', 'uptime', 'health'],
      run: () => safeOpen('https://bookedai.au/status'),
    },
  ];
}

function detectPlatformShortcutLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'Ctrl K';
  }
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  const isMac = /Mac|iPhone|iPad|iPod/i.test(platform) || /Macintosh/i.test(userAgent);
  return isMac ? '⌘ K' : 'Ctrl K';
}

export function CommandPalette({ extraCommands = [], surface }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const listboxId = useId();

  const allCommands = useMemo(() => {
    return [...buildDefaultCommands(), ...extraCommands];
  }, [extraCommands]);

  const commandById = useMemo(() => {
    const map = new Map<string, Command>();
    for (const command of allCommands) {
      map.set(command.id, command);
    }
    return map;
  }, [allCommands]);

  const filteredCommands = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // No query — show recent (resolved + filtered) followed by every group.
      const recentResolved = recent
        .map((id) => commandById.get(id))
        .filter((value): value is Command => Boolean(value));
      const recentIds = new Set(recentResolved.map((command) => command.id));
      const remainder = allCommands.filter((command) => !recentIds.has(command.id));
      return [...recentResolved, ...remainder];
    }

    const scored: Array<{ command: Command; score: number }> = [];
    for (const command of allCommands) {
      const score = fuzzyScore(trimmed, command);
      if (score === null) {
        continue;
      }
      scored.push({ command, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, RESULT_LIMIT * 2).map((entry) => entry.command);
  }, [allCommands, commandById, query, recent]);

  const visibleCommands = useMemo(() => filteredCommands.slice(0, RESULT_LIMIT * 4), [filteredCommands]);

  const showRecentSection = query.trim() === '' && recent.length > 0;
  const recentResolved = useMemo(() => {
    if (!showRecentSection) {
      return [] as Command[];
    }
    return recent
      .map((id) => commandById.get(id))
      .filter((value): value is Command => Boolean(value));
  }, [commandById, recent, showRecentSection]);

  const remainderGrouped = useMemo(() => {
    const recentIds = new Set(recentResolved.map((command) => command.id));
    const remainder = visibleCommands.filter((command) => !recentIds.has(command.id));
    return groupCommands(remainder);
  }, [recentResolved, visibleCommands]);

  // Build an ordered list of (sectionLabel, command) for keyboard navigation.
  const flatRows = useMemo(() => {
    const rows: Array<{ sectionLabel: CommandGroup | 'Recent'; command: Command }> = [];
    if (showRecentSection) {
      for (const command of recentResolved) {
        rows.push({ sectionLabel: 'Recent', command });
      }
    }
    for (const section of remainderGrouped) {
      for (const command of section.items) {
        rows.push({ sectionLabel: section.group, command });
      }
    }
    return rows;
  }, [recentResolved, remainderGrouped, showRecentSection]);

  // Reset highlighted row whenever the result set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  // Global Cmd-K / Ctrl-K toggle + ESC handler.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const isCmdK =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === 'k' || event.key === 'K');
      if (isCmdK) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Focus management: capture last focus on open, restore on close, autofocus input.
  useEffect(() => {
    if (open) {
      if (typeof document !== 'undefined') {
        lastFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
      }
      // Refresh recent in case it was mutated elsewhere this session.
      setRecent(readRecent());
      setQuery('');
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [open]);

  // Tab focus-trap inside the dialog (mirrors AgentActivityDrawer).
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleTab(event: KeyboardEvent) {
      if (event.key !== 'Tab') {
        return;
      }
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = (document.activeElement as HTMLElement | null) ?? null;
      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
    };
  }, [open]);

  const runCommand = useCallback(
    (command: Command) => {
      // Persist into recent (id-deduped, most-recent-first).
      const next = [command.id, ...recent.filter((id) => id !== command.id)].slice(0, RECENT_LIMIT);
      setRecent(next);
      writeRecent(next);
      setOpen(false);
      // Defer to next tick so close animation can begin before any navigation.
      window.setTimeout(() => {
        try {
          const result = command.run();
          if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch((error) => {
              console.error('[CommandPalette] command failed', command.id, error);
            });
          }
        } catch (error) {
          console.error('[CommandPalette] command threw', command.id, error);
        }
      }, 0);
    },
    [recent],
  );

  const handleListKey = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => {
          if (flatRows.length === 0) {
            return 0;
          }
          return (current + 1) % flatRows.length;
        });
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => {
          if (flatRows.length === 0) {
            return 0;
          }
          return (current - 1 + flatRows.length) % flatRows.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const row = flatRows[activeIndex];
        if (row) {
          runCommand(row.command);
        }
      }
    },
    [activeIndex, flatRows, runCommand],
  );

  const shortcutLabel = useMemo(() => detectPlatformShortcutLabel(), []);

  if (!open) {
    return null;
  }

  // Build an active-descendant id we can wire into aria-activedescendant.
  const activeRow = flatRows[activeIndex];
  const activeRowDomId = activeRow
    ? `${listboxId}-row-${activeRow.command.id}`
    : undefined;

  return (
    <div
      role="presentation"
      data-testid="cmdk-overlay"
      data-cmdk-surface={surface}
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-3 pt-[12vh] backdrop-blur-sm sm:px-4 max-[640px]:items-end max-[640px]:px-0 max-[640px]:pt-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="cmdk-dialog"
        className="w-full max-w-[640px] origin-top scale-100 rounded-2xl border border-apple-paper-blue-200 bg-white shadow-apple-pop motion-safe:animate-[cmdk-in_220ms_ease-out] max-[640px]:max-h-[88vh] max-[640px]:w-full max-[640px]:max-w-none max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl"
        style={{ overflow: 'hidden' }}
      >
        <div className="flex items-center gap-3 border-b border-apple-paper-blue-200 px-4 py-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-apple-paper-blue-100 text-apple-blue"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <label htmlFor={`${listboxId}-input`} className="sr-only" id={titleId}>
            BookedAI command palette
          </label>
          <input
            id={`${listboxId}-input`}
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleListKey}
            placeholder="Type a command, booking, or tenant…"
            role="combobox"
            aria-expanded={true}
            aria-controls={listboxId}
            aria-activedescendant={activeRowDomId}
            data-testid="cmdk-input"
            className="min-h-[44px] w-full bg-transparent text-base font-medium text-apple-near-black outline-none placeholder:text-apple-text-secondary"
          />
          <span className="template-chip hidden shrink-0 sm:inline-flex">{shortcutLabel}</span>
        </div>

        <div
          aria-live="polite"
          className="sr-only"
          data-testid="cmdk-result-count"
        >
          {flatRows.length} {flatRows.length === 1 ? 'result' : 'results'}
        </div>

        <ul
          id={listboxId}
          role="listbox"
          aria-label="Commands"
          data-testid="cmdk-results"
          className="max-h-[60vh] overflow-y-auto py-2 max-[640px]:max-h-[70vh]"
          style={{ scrollbarGutter: 'stable' }}
        >
          {flatRows.length === 0 ? (
            <li className="px-4 py-6 text-sm text-apple-text-secondary">
              No commands match &ldquo;{query}&rdquo;. Try &ldquo;portal&rdquo;, &ldquo;booking&rdquo;, or &ldquo;help&rdquo;.
            </li>
          ) : (
            renderRows({
              flatRows,
              activeIndex,
              listboxId,
              onSelect: runCommand,
              onHover: (index) => setActiveIndex(index),
            })
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-apple-paper-blue-200 bg-apple-paper-blue-50 px-4 py-2.5 text-xs text-apple-text-secondary">
          <div className="flex items-center gap-2">
            <span className="template-chip">{shortcutLabel}</span>
            <span>to toggle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="template-chip">esc</span>
            <span>to close</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cmdk-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function renderRows({
  flatRows,
  activeIndex,
  listboxId,
  onSelect,
  onHover,
}: {
  flatRows: Array<{ sectionLabel: CommandGroup | 'Recent'; command: Command }>;
  activeIndex: number;
  listboxId: string;
  onSelect: (command: Command) => void;
  onHover: (index: number) => void;
}): ReactNode {
  const nodes: ReactNode[] = [];
  let lastSection: string | null = null;
  flatRows.forEach((row, index) => {
    if (row.sectionLabel !== lastSection) {
      nodes.push(
        <li
          key={`section-${row.sectionLabel}-${index}`}
          aria-hidden="true"
          className="px-4 pb-1 pt-3 text-xs uppercase tracking-wide text-apple-text-secondary"
        >
          {row.sectionLabel}
        </li>,
      );
      lastSection = row.sectionLabel;
    }
    const isActive = index === activeIndex;
    nodes.push(
      <li
        key={row.command.id}
        id={`${listboxId}-row-${row.command.id}`}
        role="option"
        aria-selected={isActive}
        data-testid="cmdk-row"
        data-cmdk-row-id={row.command.id}
        data-cmdk-active={isActive ? 'true' : 'false'}
        onMouseEnter={() => onHover(index)}
      >
        <button
          type="button"
          onClick={() => onSelect(row.command)}
          className={`flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue ${
            isActive ? 'bg-apple-paper-blue-100' : 'hover:bg-apple-paper-blue-50'
          }`}
          tabIndex={-1}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-apple-paper-blue-100 text-apple-blue"
          >
            {row.command.icon ?? <CommandGlyph intent={row.command.intent} />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-apple-near-black">{row.command.label}</span>
            {row.command.hint ? (
              <span className="truncate text-xs text-apple-text-secondary">{row.command.hint}</span>
            ) : null}
          </span>
          {row.command.shortcut ? (
            <span className="template-chip ml-auto shrink-0">{row.command.shortcut}</span>
          ) : null}
        </button>
      </li>,
    );
  });
  return nodes;
}

function CommandGlyph({ intent }: { intent: CommandIntent }) {
  switch (intent) {
    case 'navigate':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-3.5 w-3.5">
          <path d="M5 12h14" strokeLinecap="round" />
          <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lookup':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-3.5 w-3.5">
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      );
    case 'agent':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-3.5 w-3.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" strokeLinecap="round" />
        </svg>
      );
    case 'action':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-3.5 w-3.5">
          <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default CommandPalette;
