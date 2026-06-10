# CampaignOS — landing site

A fresh, standalone marketing/landing site for **CampaignOS**, the open-source, AI-native
operating system for political campaigns. Initial focus: **presidential campaigns** (the
architecture is designed to expand down-ballot and to advocacy use cases later).

This is intentionally **independent** of `apps/web` (the Next.js product app). It's a
zero-build, dependency-free static site so it loads instantly and gives total control over
the motion and aesthetics.

## Concept

A near-future civic *governance OS console* — it should read like credible, open democratic
infrastructure, not a generic startup landing page. The aesthetic leans futuristic purely as a
design cue; no particular year is significant.

Visual language:

- **Phosphor mint** = verified / source-backed / "go"
- **Signal amber** = secondary accent (status, attention)
- **Deep ink** + a live civic-network canvas + graph-paper grid for atmosphere
- OS-console texture: a boot sequence in the hero and a live (real-time) system clock

## Typography

- **Bricolage Grotesque** — humanist display (the "people / civic" half)
- **IBM Plex Mono** — institutional machine texture (the "OS / source-backed" half)

(Deliberately avoids Inter / Space Grotesk / generic AI-slop defaults.)

## Sections

1. **Hero** — boot console + headline + live metrics
2. **Thesis** — fragmented stack → one operating spine
3. **Launch** — provisioning a complete campaign fast (the showcase / differentiator)
4. **Modules** — PolicyHub · VolunteerOS · BallotAccessOS · ContentOS · CRM · FundraisingOS
5. **Roadmap** — milestones M0–M5
6. **Governance** — "owned by everyone, captured by no one"
7. **Deploy** — clone-and-run CTA + footer

## Run it

No build step. Any static server works:

```bash
cd site
python3 -m http.server 8777
# → http://localhost:8777/index.html
```

## Files

| File         | What                                                            |
|--------------|-----------------------------------------------------------------|
| `index.html` | Markup + content                                                |
| `styles.css` | Full design system (CSS variables, layout, motion, responsive)  |
| `app.js`     | Boot terminal, reveal-on-scroll, count-up metrics, the RAG state machine, the civic-network canvas, mobile menu, copy-to-clipboard |

Accessibility: respects `prefers-reduced-motion` (reveals snap in, scanline/network calm down),
keyboard-focusable module cards, and semantic landmarks.
