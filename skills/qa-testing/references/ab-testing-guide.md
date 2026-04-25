# A/B Testing Guide

## Core Rule

A/B testing answers "which version performs better," not "is the feature bug-free." Run basic QA first.

## Required Pieces

- Hypothesis
- Primary metric
- Guardrail metrics
- Clear audience
- Stable variant definitions
- Minimum run rule
- Decision rule

## Good Primary Metrics

- signup conversion
- completed booking rate
- checkout completion
- click-through rate to next step
- task completion rate

## Good Guardrail Metrics

- bounce rate
- error rate
- refund/cancel rate
- support contacts
- page speed or load failure rate

## Common Mistakes

- stopping too early
- changing multiple things at once
- using tiny sample sizes
- ignoring segment differences
- calling a winner based on noise
- running an experiment on a broken funnel

## Beginner-Friendly A/B Test Explanation

Explain it like this:

- Version A is the current page.
- Version B is the new page.
- Different visitors see different versions.
- We compare which version gets more people to do the goal action.
- We do not decide too early.

## Simple Decision Rules

Use one when the user has no analytics maturity yet.

- Run at least one full business cycle.
- Do not call a winner before reaching an agreed minimum number of conversions.
- Stop early only if one version is clearly broken or harmful.
