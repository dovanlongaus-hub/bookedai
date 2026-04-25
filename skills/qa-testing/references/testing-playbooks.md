# Testing Playbooks

## 1. Smoke Test

Use after a deploy or hotfix.

Checklist shape:
- App/site loads
- User can sign in if relevant
- Core CTA works
- Key form submits
- Confirmation appears
- Data saves correctly
- Notification/email/SMS triggers if expected
- Payment or booking completes if relevant

## 2. Regression Test

Use when a change may affect nearby features.

Cover:
- directly changed flow
- closely related flows
- permissions/roles
- validation and errors
- mobile vs desktop if relevant
- previous bugs in same area

## 3. Exploratory Test

Use when requirements are fuzzy.

Approach:
- define a short mission
- timebox to 15 to 30 minutes
- note surprises, confusion, dead ends, and mismatched expectations
- convert meaningful findings into repeatable test cases

## 4. UAT

Use when the business side needs to approve the workflow.

Focus on:
- real-world task completion
- understandable labels and messages
- outcome correctness
- confidence to ship

## 5. Beginner Manual Test Session

Give the tester:
- one device at a time
- one simple task at a time
- expected result in plain language
- permission to stop and mark "Not sure"
- instruction to attach screenshots for anything odd
