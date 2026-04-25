---
name: qa-testing
description: Professional QA, software testing, UAT, regression testing, smoke testing, exploratory testing, and A/B testing support, with beginner-friendly guidance for non-technical users. Use when asked to create test plans, test cases, bug-report templates, acceptance checks, release QA checklists, experiment designs, usability checks, or step-by-step testing instructions for someone with little or no computer skill.
---

# QA Testing

## Overview

Use this skill to turn vague testing requests into a practical test workflow that matches the user's skill level, product maturity, and risk.

Default to simple language, concrete steps, and observable pass/fail outcomes. When the user is non-technical, avoid jargon unless you immediately explain it.

## Workflow

1. Identify the testing goal.
2. Identify who will run the test.
3. Choose the lightest testing method that can answer the question.
4. Produce reusable artifacts: checklist, test cases, bug template, experiment brief, or release gate.
5. End with clear next actions.

## 1. Identify the testing goal

Classify the request first.

- **Professional QA**: release readiness, regression, bug prevention, risk coverage, acceptance testing
- **A/B testing**: compare two variants to improve conversion, retention, CTR, or task completion
- **Beginner-friendly testing**: simple manual checks, usability tests, click-path verification, form submission checks, screenshot-based bug reporting

Ask only the minimum missing questions:

- What product or page is being tested?
- What changed recently?
- Who is the tester, internal QA, founder, customer, or beginner?
- What is the biggest risk if this fails?
- Is the goal defect finding, release confidence, or performance comparison?

If details are missing, make a reasonable assumption and label it clearly.

## 2. Match the output to the need

### A. Professional QA outputs

Use these when the user needs structured QA coverage.

Deliver one or more of:

- Test plan with scope, risks, environments, and entry/exit criteria
- Test case table with ID, scenario, steps, expected result, actual result, status
- Smoke checklist for fast pre-release validation
- Regression checklist focused on changed and adjacent areas
- Bug report template with repro steps, expected result, actual result, severity, evidence
- UAT checklist tied to business outcomes

Prefer this structure for test cases:

| ID | Scenario | Precondition | Steps | Expected result | Priority |
|---|---|---|---|---|---|

Severity guide:

- **Critical**: blocks payment, login, checkout, booking, or core workflow
- **High**: major feature broken, no simple workaround
- **Medium**: partial failure, confusing UX, recoverable issue
- **Low**: cosmetic or minor copy/layout issue

### B. A/B testing outputs

Use these when the user wants to compare variants.

Always include:

1. Hypothesis
2. Primary metric
3. Guardrail metrics
4. Audience and split
5. Variant definition
6. Run/stop decision rules
7. Risks and interpretation notes

Use this brief format:

- **Goal**: what behavior should improve
- **Hypothesis**: why variant B may outperform A
- **Variant A**: current experience
- **Variant B**: proposed change
- **Primary metric**: main success number
- **Guardrails**: metrics that must not get worse
- **Audience**: who sees the test
- **Sample/run rule**: minimum time or traffic needed before calling a winner
- **Decision**: ship B, keep A, iterate, or stop

Do not present A/B tests as magic truth. Warn about low traffic, mixed changes, and premature calls.

### C. Beginner-friendly testing outputs

Use these when testers are not technical.

Prefer:

- numbered click-by-click instructions
- one task per line
- plain-language expected result
- simple status labels: Pass, Fail, Not sure
- screenshot requests instead of console logs
- short bug form that a beginner can fill in

Good beginner phrasing:

- Open the app.
- Tap the Book Now button.
- Enter your phone number.
- You should see a confirmation message.
- If something looks wrong, take a screenshot.

Avoid telling beginners to inspect network calls, browser console, stack traces, or devtools unless the user explicitly asks.

## 3. Choose the right testing style

Use this selection guide.

- **Smoke test** when the user needs a fast confidence check after a change
- **Regression test** when an existing working area might have been affected
- **Exploratory test** when requirements are unclear and discovery matters
- **UAT** when the business user must confirm the workflow feels correct
- **Usability test** when ease of use matters more than strict correctness
- **A/B test** when the question is which option performs better, not whether it is broken

See `references/testing-playbooks.md` for recommended templates.
See `references/ab-testing-guide.md` for experiment guardrails and common mistakes.

## 4. Write outputs in the right tone

### For technical teams

Be crisp and structured. Call out risk areas, dependencies, and test boundaries.

### For founders or operators

Translate QA into business risk, for example booking loss, payment failure, lead leakage, or support burden.

### For beginners

Write at roughly primary-school reading simplicity when helpful. Short sentences. Concrete actions. No dense tables unless the user asked for them.

## 5. Common deliverable patterns

### Fast smoke checklist

Use 5 to 12 checks covering the core journey only.

### Regression pack

Focus on:

- the changed feature
- upstream inputs
- downstream outcomes
- permissions and edge cases
- mobile and desktop if relevant

### Bug report

Use:

- Title
- Where it happened
- What I did
- What I expected
- What happened instead
- Screenshot or video
- How often it happens

### A/B experiment note

Keep one main change per test when possible. If multiple changes are bundled, warn that attribution will be weak.

## 6. Quality bar

Before delivering, check:

- Is the testing scope obvious?
- Are steps executable by the intended tester?
- Are expected results observable?
- Are priorities or severities assigned when needed?
- For A/B tests, is the success metric explicit?
- For beginners, is the wording low-jargon and low-friction?

## 7. Output templates

When helpful, provide one of these directly in the answer.

### Test case table

| ID | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|

### Beginner checklist

1. Open the app/site.
2. Do the action.
3. Check what should happen.
4. Mark Pass, Fail, or Not sure.
5. Add screenshot if Fail.

### A/B brief

- Goal:
- Hypothesis:
- A:
- B:
- Primary metric:
- Guardrails:
- Audience:
- Run rule:
- Decision rule:

## 8. Final delivery behavior

End with the smallest useful next step, for example:

- "Start with this 8-step smoke test."
- "Give this checklist to a non-technical tester and ask for screenshots on any Fail."
- "Run this A/B test for at least 2 business cycles before deciding."
- "Use these 12 regression cases before release."
