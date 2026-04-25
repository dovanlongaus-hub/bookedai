---
name: diagram-from-text
description: Turn text requirements into visual design outputs. Use when the user wants an image concept, diagram, chart, flowchart, storyboard frame, Mermaid spec, SVG mockup, HTML visual, or Canvas-ready asset generated from text. Best for prompt generation, information architecture, flow mapping, chart specification, and lightweight visual asset scaffolding without external design software.
---

# Diagram From Text

Convert text into one or more of these outputs:
- generation prompts for image or video tools
- Mermaid specs for flowcharts, journeys, org charts, sequence diagrams, and mind maps
- chart specs for bar, line, pie, funnel, comparison, and KPI visuals
- lightweight HTML or SVG assets for quick review
- Canvas-ready content blocks for iteration

## Default workflow

1. Identify the visual type the user actually needs.
2. Reduce the request to a small structured brief:
   - audience
   - goal
   - entities or steps
   - relationships
   - tone/style
   - output format
3. Produce the smallest useful artifact first.
4. If helpful, also provide the next editable layer:
   - prompt
   - Mermaid
   - HTML/SVG scaffold
   - Canvas-ready layout notes

## Choose the output type

### 1) Image creative prompt
Use when the user wants:
- hero image
- marketing visual
- poster
- storyboard frame
- app concept art
- UI moodboard

Output:
- one global style prompt
- one final prompt per image/frame
- optional negative prompt
- optional aspect ratio note

Keep prompts concrete:
- subject
- composition
- lighting
- visual style
- brand cues
- what to avoid

### 2) Mermaid diagram
Use when the user wants:
- flowchart
- user journey
- process map
- system diagram
- org chart
- state diagram
- sequence diagram

Output valid Mermaid only unless the user asks for explanation too.

Prefer these mappings:
- process / decision trees → `flowchart TD`
- user journeys / interactions → `sequenceDiagram`
- hierarchy → `mindmap` or `flowchart TD`
- lifecycle / states → `stateDiagram-v2`

Rules:
- keep node labels short
- avoid crossing edges when possible
- prefer readable grouping over full completeness
- if the input is ambiguous, choose a clean readable version and mention the assumption briefly

### 3) Chart spec
Use when the user wants:
- bar chart
- line chart
- pie chart
- funnel
- comparison visual
- KPI panel

First normalize the data into:
- title
- metric names
- categories
- values
- timeframe
- annotation/highlight

If no real data is given, clearly label as illustrative.

When useful, output both:
- concise data table
- chart build spec in JSON-like structure

Recommended shape:
```json
{
  "chartType": "bar",
  "title": "...",
  "x": ["..."],
  "series": [{"name": "...", "data": [1,2,3]}],
  "notes": ["..."]
}
```

### 4) HTML/SVG asset scaffold
Use when the user wants a quick renderable visual without full design tooling.

Output:
- a single self-contained HTML or SVG file
- inline styles only unless the user asks otherwise
- large typography, simple spacing, strong contrast

Use the bundled assets as starting points:
- `assets/diagram-shell.html`
- `assets/diagram-shell.svg`

## Delivery guidance

### For rough-first work
Return in this order:
1. concise brief
2. main artifact
3. optional next-step variant

### For production-ready work
Return only the requested deliverable, then a short note on how to edit or extend it.

## Canvas usage

If the user wants a quick presented visual:
- generate HTML first
- if appropriate, write it under the workspace or hosted canvas path requested by the task
- keep layout modular: title, subtitle, main visual, legend, footer

## Quality bar

A good result should be:
- readable in under 5 seconds
- structurally correct
- easy to edit
- visually coherent
- not overloaded

## Avoid

- giant paragraphs inside nodes
- over-detailed Mermaid graphs on the first pass
- fake precision in charts when data is missing
- decorative SVG complexity that makes edits painful
- generic prompt fluff without composition detail

## Bundled files

Read only if needed:
- `references/prompt-patterns.md` for reusable prompt structures
- `assets/diagram-shell.html` for a quick HTML visual scaffold
- `assets/diagram-shell.svg` for a quick SVG layout scaffold
