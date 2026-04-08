# Replyline -- Pre-Release Strategic Analysis

**Date:** 6 April 2026
**Basis:** Full codebase audit + 8 independent model analyses, synthesized and cross-referenced with actual source code.

---

## 1. Executive Verdict

**Source-only alpha:** Yes -- after a short docs/trust/copy cleanup pass (1--2 weeks).
**Binary release:** No. Not until live-call behaviour is verified on 3+ machines across Zoom/Teams/Meet, installer is signed, and at least 10 real-user sessions confirm repeated usefulness.
**Current direction:** Sharp. The hotkey-gated, snippet-only, RAM-first, three-field card is a genuine interaction innovation that no major competitor occupies.
**Name "Replyline":** Adequate for alpha. Not strong enough to cement permanently. Revisit before binary release.
**Biggest strategic risk:** The product gets filed as "another AI meeting tool" before anyone understands the difference -- because the external messaging doesn't yet reflect the internal discipline. Second risk: core moment (hold-hotkey-get-card) doesn't prove repeatably useful in real live calls.

### What the code actually shows (ground truth)

| Layer | Status |
|---|---|
| Audio capture (WASAPI loopback, `audio.rs`) | Implemented. Windows-only. 16kHz mono downmix. |
| STT (Deepgram batch + streaming, `deepgram.rs`) | Batch wired. Streaming exists but `#[allow(dead_code)]`. |
| LLM analysis (`llm.rs`) | Single-pass OpenAI-compatible. Russian system prompt. 160 max_tokens. |
| Card contract | `gist` <=110 chars, `say_now` <=220 chars, `next_move` <=110 chars. Hard-clamped in Rust. |
| Context (`context.rs`) | RAM-only. 20-min TTL. Max 3 entries, 1500 chars total. Auto-expire. |
| Secrets (`credentials.rs`) | Windows Credential Manager via `keyring` crate. |
| Settings (`settings.rs`) | Atomic JSON writes. Validates schema version, hotkey, URL, model, language (ru/en only), capture range (5--180s). |
| Memory layer (`memory.rs`) | Fully implemented: spaces, facts, commitments, terms, JSON store with validation. Zero UI. |
| Tray integration (`lib.rs`) | Open / Settings / Clear Context / Quit. Left-click opens window. |
| Window | 408x360, no decorations, always-on-top, skip taskbar, hide-on-close. |
| Tests | Unit tests for context trimming, WAV encoding, JSON parsing, memory CRUD, settings validation. |
| Verification | 4 lanes: compile+unit, mock/UI (future), prompt/contract, runtime proof. |

---

## 2. Product Thesis

Replyline solves one specific pain: **"I hear something difficult on a work call and I don't know what to say right now."**

It is not a meeting recorder, not a transcript tool, not a speaking coach, and not a post-meeting summary engine. It is a **hotkey-gated, single-moment decision aid** that captures a short audio snippet, processes it through STT + LLM, and returns one compact card with three fields:

- **Gist** -- what was said (<=110 chars)
- **Say now** -- what to reply (<=220 chars)
- **Next move** -- what to do after (<=110 chars)

The card lives in RAM. Nothing is stored by default. The user controls when capture starts (press hotkey) and when it stops (release hotkey). There is no background recording, no speaker detection, no emotion analysis, no history, and no bot joining the call.

**Why this matters in 2026:** The market is saturated with tools that help you *remember* meetings (Otter, Fireflies, Granola) or *improve* your speaking (Poised, Yoodli). Nobody occupies the position of helping you *respond* in the moment. Replyline's value is not memory but **response quality under pressure**.

---

## 3. Targeting

### Primary ICP (first release)

Individual professionals on Windows who conduct 5+ difficult work calls per week:

| Role | Pain | Scenario |
|---|---|---|
| Technical leads / engineering managers | Unexpected objections during architecture reviews, status calls | Need to respond to "why is this late?" without being defensive |
| Product managers in B2B | Client pushback on scope, timeline, priorities | Need to reframe without over-promising |
| Account managers / sales engineers | Price objections, contract negotiations, escalations | Need a composed counter without losing the thread |
| Consultants / freelancers | Demanding clients, scope creep, value challenges | Need to hold boundaries gracefully |

### Secondary ICP

- HR partners (performance reviews, difficult feedback conversations)
- Founders / C-level doing their own customer/partner calls
- Recruiters handling tough candidate negotiations

### Explicitly NOT targeting now

- **Teams / enterprise** -- no admin panel, no compliance certs, no collaboration layer
- **Sales orgs / call centres** -- different workflow, CRM integration expected
- **Therapists / coaches / mental health** -- conflicts with "no therapy" positioning
- **Students / interview candidates** -- toxic "cheating" narrative risk
- **Anyone needing full transcripts, searchable history, speaker diarization, or automatic recording**

### 3 strongest first-use scenarios

1. **Stakeholder escalation call.** Client says "if you don't fix this by Friday I'm going to your director." User holds hotkey, hears the threat, releases -- gets gist + deflection + next move.
2. **Unexpected scope question.** PM in a sync gets asked "can you also handle X?" User captures the fragment -- gets a structured "acknowledge-but-boundary" response.
3. **Difficult 1:1 feedback.** Manager hears "I don't think my work is valued." User captures -- gets a non-defensive gist and a follow-up action.

### 3 dangerous scenarios to explicitly avoid

1. **"Secret interview helper"** -- creates trust/ethics crisis, attracts wrong users.
2. **"Record all my meetings automatically"** -- destroys the core positioning.
3. **"Emotional support / therapy"** -- regulatory and positioning nightmare.

---

## 4. Category and Positioning

### Category label

**Live reply aid for difficult work conversations.**

Do not use: "AI meeting assistant", "meeting notes", "transcription tool", "speaking coach", "call recorder", "meeting intelligence".

### 3 positioning options

1. **"Decision card, not documentation."** Emphasizes that the output is an action (reply), not an artifact (transcript). Cleanest differentiation.
2. **"A reply copilot for pressure moments."** Emphasizes the user-in-control aspect and the timing (live, not post-meeting).
3. **"Anti-Otter by design."** Provocative. Works for technical audiences. Risky for broader use.

### Recommended positioning

> Replyline is a Windows desktop tool that turns a difficult live moment into one compact card: the gist, what to say now, and the next move. No transcripts. No history. No bot in your call.

### 10-second explanation (for normal users)

> Hold a hotkey while someone says something hard on a call. Release -- get a card with the gist, a suggested reply, and a next step. Nothing is recorded or stored.

### Investor/founder pitch

> This is not a meeting notetaker and not a speaking coach. It's a low-latency decision-support layer for live work conversations, where the product value is not memory but response quality under pressure. RAM-only pipeline, user-controlled activation, zero persistence by default.

---

## 5. Naming Evaluation

### "Replyline" assessment

| Criterion | Score | Comment |
|---|---|---|
| Clarity | 6/10 | "Reply" is clear, "line" is ambiguous (helpdesk? timeline? pipeline?) |
| Trust | 7/10 | Neutral, not hype-y. Doesn't trigger suspicion. |
| Memorability | 5/10 | Generic compound. Easy to forget. |
| Distinctiveness | 5/10 | Sounds like SaaS name generator output. |
| Product fit | 7/10 | "Reply" is accurate, but misses hotkey/card/moment. |

### Consolidated alternative names (best from all sources)

| Name | Clarity | Trust | Distinctive | Fit | Total | Source docs |
|---|---|---|---|---|---|---|
| Replyline | 6 | 7 | 5 | 7 | 25 | Current |
| Tact | 7 | 8 | 9 | 9 | 33 | Doc 5 |
| Riposte | 7 | 6 | 9 | 9 | 31 | Doc 5 |
| HoldCard | 8 | 8 | 9 | 9 | 34 | Doc 4 |
| SayNext | 8 | 9 | 8 | 9 | 34 | Doc 4 |
| Cuecard | 8 | 7 | 7 | 9 | 31 | Doc 2 |
| Parry | 7 | 6 | 8 | 9 | 30 | Doc 5 |
| Reflex | 8 | 7 | 7 | 9 | 31 | Doc 5 |
| Replycard | 9 | 8 | 5 | 9 | 31 | Doc 1 |
| Reactkey | 7 | 7 | 7 | 8 | 29 | Doc 8 |

### Shortlist (top 5)

1. **HoldCard** -- captures the mechanic (hold) and the output (card)
2. **SayNext** -- captures the core value (what to say + what's next)
3. **Tact** -- short, premium, double meaning (tactical + tactful)
4. **Riposte** -- fencing counter-attack metaphor, distinct
5. **Replycard** -- most descriptive, least distinctive

### Recommendation

**Keep Replyline for source-only alpha.** Do not rename before first public source release -- renaming is a distraction that adds zero validated learning. Revisit before binary release (4--8 weeks). If live testers gravitate toward "card" or "hold" language, follow their instinct.

---

## 6. Brand Direction

### Personality

**Calm operational competence.** Like a good negotiation partner who passes you a note at the right moment -- quietly, precisely, without drawing attention.

### 5 core traits

| Trait | How it manifests |
|---|---|
| Precise | Card fields are hard-clamped (110/220/110 chars in `llm.rs`). No vague advice. |
| Private | RAM-only context, 20-min TTL, manual hotkey activation. |
| Pragmatic | One card, three fields. No features beyond the core moment. |
| Adult | No gamification, no streaks, no "AI magic" language. |
| User-controlled | Nothing happens unless the user holds the hotkey. |

### 5 traits to avoid

| Trait | Why |
|---|---|
| Therapeutic | "Helps you manage emotions" --> regulatory/positioning trap |
| Stealthy | "Nobody will know" --> instant trust destruction |
| Autonomous | "Answers for you" --> misrepresents what the product does |
| Playful | Emojis, mascots, gamification --> wrong audience signal |
| Omniscient | "Understands your conversation" --> overpromise, LLM reality |

### Emotional effect

**Should create:** "I'm collected. I have a next move."
**Must not create:** "I'm being surveilled" or "I'm cheating" or "I need this to function."

### Current visual palette assessment

The dark-green (#173F38) + warm-beige (#F5EDE0) + muted-ochre palette is **strong and differentiating**. It reads as calm/professional without being corporate-blue or AI-purple. It's one of the few palettes in this space that doesn't look like every other SaaS tool.

**Verdict:** Keep. Add a darker graphite (#2D2D2D) for text/structure contrast. Do not shift to blue, purple, or high-saturation accent colours.

---

## 7. Visual System

### Primary direction

**Quiet instrument panel.** Not a wellness app, not a futuristic AI toy, not a SaaS dashboard. A compact, native-feeling Windows utility that appears, delivers, and gets out of the way.

### Colour system

| Role | Colour | Hex | Notes |
|---|---|---|---|
| Primary dark | Deep pine | #173F38 | Background, frames, primary elements (current) |
| Surface | Warm bone | #F5EDE0 | Card background, settings surface (current) |
| Accent | Muted ochre | #C49A5B | CTA, active state, emphasis only (current) |
| Text primary | Dark graphite | #2D2D2D | **Add** -- currently #142321, needs more structure |
| Text secondary | Muted pine | rgba(20,35,33,0.72) | Current -- keep |
| Error | Muted terracotta | #8D2020 | Current -- keep. Not bright red. |
| Capturing state | Warm rust | rgba(196,80,49,0.14) | Current `.is-capturing` -- keep |
| Processing state | Amber | rgba(185,135,37,0.16) | Current `.is-transcribing/.is-analyzing` -- keep |
| Ready state | Calm teal | rgba(34,116,98,0.14) | Current `.is-ready` -- keep |

### Typography

- **Desktop app:** System fonts. Current stack (`Segoe UI Variable Text`, `Segoe UI`, sans-serif) is correct for Windows-first. Do not fight the platform.
- **Landing page:** One clean sans family (Inter or system stack). No decorative fonts at alpha stage.
- **Card fields:** Current hierarchy is adequate. `say_now` at `font-size: 1rem; font-weight: 600` correctly emphasizes the primary output.

### Icon / logo

Current SVG (`art/replyline-icon.svg`) is 512x512 with speech bubble + plus/minus indicators. It works conceptually but **needs a simplified variant for 16x16 tray size**. At tray resolution the detail is lost.

**Action item:** Create a 16x16 monochrome silhouette version of the icon. Keep the full version for larger contexts.

### Motion

- Card appearance: fade-in, 150--200ms. No slide, no bounce.
- State pill transitions: colour shift only, no animation.
- No "thinking" animations, waveforms, or AI glow effects.
- The current CSS has no transitions defined -- this is acceptable for alpha.

### What would be overdesign now

Custom illustrations, animated logo, glassmorphism, 3D elements, light/dark theme toggle, onboarding carousel, sound design.

---

## 8. Messaging System

### One-line product promise

> Get a working reply before the moment passes.

### Short subtitle

> Windows tray app for difficult work conversations: gist, say_now, and next_move from one hotkey.

### Medium description (3-4 sentences)

> Replyline helps in difficult work conversations when you need a composed reply, not a meeting transcript. Hold a global hotkey while a tough moment plays out, release it, and get one compact card: the gist of what was said, what to say now, and the next move. Audio is captured only while you hold the key, processed in RAM, and not stored. You configure the STT and LLM providers yourself.

### GitHub repo description

> Windows-first tray app for difficult work conversations. Hold-to-capture, release for one compact reply card: gist, say_now, next_move. Tauri 2 + Rust + Solid.js. Source-only alpha.

### GitHub "About" text

> Windows reply copilot for difficult work conversations.

### Landing hero headline (RU)

> Когда ответить трудно, Replyline дает следующий ход.

### Landing hero headline (EN)

> They said something hard. You need a reply right now.

### Landing hero subhead (RU)

> Зажмите хоткей, пока звучит сложная реплика. Отпустите -- получите суть, ответ и следующий шаг. Без записи. Без бота в звонке.

### Short trust statement

> Audio is captured only while you hold the hotkey. Snippets are processed in RAM and sent to your configured STT/LLM providers. Nothing is stored on disk by default. Replyline does not record calls, identify speakers, or keep conversation history.

### "What it is not" line

> Not a meeting recorder. Not a transcript tool. Not a speaking coach. Not a bot that joins your call.

### Alpha CTA

> Source-only alpha on GitHub. Build from source, try it on your own calls, report what works and what doesn't.

---

## 9. Distribution Strategy

### Current stage decisions

| Channel | Decision | Rationale |
|---|---|---|
| Source-only GitHub alpha | **Yes** | Honest about stage. Attracts technical reviewers. Builds trust. |
| Private tester build | **Yes** | 10--15 hand-picked users with real difficult-call workflows. |
| Minimal landing page | **Yes** | One page: hero, trust block, "what it is / isn't", GitHub link. |
| Waitlist | **No** | Creates false expectations for source-only alpha. |
| Binary release | **No** | No signed installer, no cross-machine validation, no live-call proof. |
| Product Hunt | **No** | Premature. Wrong audience expectations. Use after binary release with demo video. |

### Best first 5 channels

1. **GitHub** -- primary publication point. README is the marketing asset.
2. **Personal outreach** -- founder contacts 20--30 target users from warm network.
3. **Twitter/X** -- one sober technical post from the founder. No hype.
4. **Hacker News (Show HN)** -- only after at least 3 testers confirm real-call usefulness.
5. **Niche communities** -- PM/engineering/remote-work Slack/Discord/Telegram channels.

### Worst first 5 channels

1. Product Hunt (premature, wrong expectations)
2. LinkedIn "excited to announce" posts (noise)
3. Reddit r/productivity (demands polished installer)
4. Paid acquisition (no conversion target)
5. AI tool directories (category confusion)

### Open-source visibility: helps or hurts?

**Net help.** For a product that captures audio, open source is a trust advantage: "read the code and see exactly what happens to your audio." Hurts only if the repo reads like "secret call AI" or implies broader readiness than reality.

---

## 10. Launch Plan (next 2-4 weeks)

### Week 1: Repo + Trust docs

- [ ] README rewrite (positioning from section 8, trust model, build instructions, known limitations)
- [ ] `docs/privacy-and-trust.md` -- what is captured, where it goes, what is not stored, user responsibility
- [ ] `docs/known-limitations.md` -- honest list of what doesn't work or isn't verified
- [ ] Update `docs/copy-rules.md` -- add banned terms: "stealth", "invisible", "therapy", "emotion", "autonomous", "answers for you"
- [ ] Verify LICENSE file is correct (MIT is already present)
- [ ] Check that no secrets/keys are in the repo

### Week 2: Branding + Tester prep

- [ ] Final copy pass on all user-facing text (repo description, About, topics/tags)
- [ ] Simplify tray icon for 16x16 readability
- [ ] Minimal landing page (static HTML, GitHub Pages or similar)
- [ ] Recruit 10--15 testers from ICP (personal contacts, professional communities)
- [ ] Write tester brief: what to test, how to report, what platforms, expected experience

### Week 3: Source publication

- [ ] Make repository public
- [ ] One post from founder on Twitter/X -- personal, technical, no hype
- [ ] Send pre-built binaries to private testers (not via GitHub Releases)
- [ ] Open GitHub Issues with templates (bug report, feedback). No Discussions yet.

### Week 4: First feedback loop

- [ ] Collect feedback from testers (15-min calls or async text)
- [ ] Verify Zoom/Teams/Meet behaviour on testers' machines
- [ ] First bugfix pass
- [ ] Decision: ready for Show HN in 2--4 weeks?

### What to postpone

- Binary public release
- Product Hunt
- Video demo (no stable proof yet)
- Pricing page
- Waitlist
- Memory layer UI
- macOS/Linux port
- Speaker detection, emotion analysis, full-call recording
- Integrations (Slack, Notion, CRM)

---

## 11. GitHub and Repo Presentation

### README structure

1. **One sentence:** what it is ("live reply aid for difficult work conversations")
2. **Alpha banner:** `Warning: Source-only alpha. Not ready for binary distribution.`
3. **How it works:** hotkey -> snippet capture -> STT -> LLM -> card (gist, say_now, next_move)
4. **What it is NOT:** not a recorder, not a transcript tool, not a speaking coach
5. **Trust model:** what happens to audio, where it goes, what is not stored
6. **Screenshot or GIF** of the card UI with placeholder data (not real call content)
7. **Build instructions** (prerequisite: Windows, Node, Rust, pnpm)
8. **Known limitations** (or link to doc)
9. **How to report issues**
10. **License**

### What to emphasize

- Narrow scope as a **strength**, not a limitation
- Trust model as a **first-class concern**
- Engineering discipline (verification lanes, prompt contracts, smoke checks)
- "One card, three fields" -- the mechanic

### What NOT to promise

- Stability on all call platforms (only after verification)
- macOS/Linux support
- Automatic recording or background monitoring
- Speaker detection, emotion analysis, tone scoring
- History, search, or archival features

### GitHub topics/tags

`windows`, `tauri`, `rust`, `solidjs`, `desktop-app`, `speech-to-text`, `llm`, `hotkey`, `productivity`, `privacy-first`

### First release note

```
## v0.1.0-alpha -- Source-Only Preview

First public source release. Not production-ready.

What works:
- Global hotkey capture (WASAPI loopback)
- Cloud STT via Deepgram (batch mode)
- Single LLM pass for card generation
- Compact always-on-top response card (gist / say_now / next_move)
- Tray integration with context menu
- Settings persistence + Windows Credential Manager for secrets
- Ephemeral conversation context (RAM-only, 20-min TTL)

What does NOT work yet:
- Binary distribution (no signed installer)
- Verified behaviour on Zoom / Teams / Meet / Telemost
- Cross-machine consistency
- Memory layer UI (backend exists, no frontend)
- Streaming STT (code exists, not wired)

Known limitations: see docs/known-limitations.md
Trust model: see docs/privacy-and-trust.md

This is a source-only release. No pre-built binaries are provided.
```

---

## 12. Landing Page Direction

### Do it now?

Yes, but minimal. Not a marketing site -- a technical business card. When someone finds the repo, they need 10 seconds to understand what this is and why it exists.

### Structure

1. **Hero:** headline + subhead + screenshot of card UI + "View on GitHub" button
2. **How it works:** 3 steps (Hold -> Listen -> Card), text only, no illustrations
3. **What it is / What it is not:** two short blocks
4. **Trust block:** 4 sentences on audio handling, RAM processing, user responsibility
5. **CTA:** "View source on GitHub" (primary) + "Request tester access" (secondary, email link)
6. **Footer:** license, contact, disclaimer

### What it must NOT do

- Collect payments or show pricing
- Show testimonials (none exist)
- Compare features to competitors
- Display a video demo (no stable proof)
- Pretend this is a finished product

### Key trust blocks

- "Audio captured only while you hold the hotkey"
- "Processed in RAM, not stored on disk by default"
- "Sent only to STT/LLM providers you configure yourself"
- "You are responsible for complying with recording laws and workplace policies"

---

## 13. Documentation and Legal/Trust Checklist

### Must-have before source publication

| Document | Content | Priority |
|---|---|---|
| README.md | Positioning, alpha disclaimer, trust model, build instructions, limitations | Critical |
| LICENSE | MIT (already present) | Critical |
| `docs/privacy-and-trust.md` | What is captured, where it goes, what is NOT stored, user responsibility, recording laws note | Critical |
| `docs/known-limitations.md` | Honest list: platforms not verified, no speaker detection, no history, no storage, Windows-only | Critical |
| `docs/copy-rules.md` | Already exists -- update with banned terms from this analysis | High |
| Contact/support note | GitHub Issues only, with templates | High |

### Should-have

| Document | Content |
|---|---|
| Recording/consent note | Paragraph in privacy-and-trust.md: user must comply with local recording laws and platform TOS |
| Third-party providers note | Deepgram processes audio, LLM provider processes text. User configures both. |
| Security note | No stored audio. Snippets in RAM. Credential Manager for secrets. How to verify. |
| Release notes template | Already partially exists in verification docs -- formalize |
| Issue templates | Bug report (OS, audio setup, steps, expected/actual) + feedback template |

### Later (after alpha, before binary)

| Document | When |
|---|---|
| Full Privacy Policy (legal review) | Before binary release |
| Terms of Use | Before binary release |
| CONTRIBUTING.md | When ready to accept PRs |
| FAQ | After 10+ users ask recurring questions |
| Architecture overview | When onboarding external contributors |
| Vulnerability disclosure / security.txt | Before binary release |

### What is NOT needed

- SOC2, DPA, enterprise compliance pack -- overkill for source-only alpha
- Multi-page legal labyrinth -- one clear trust doc is better than five vague ones
- Formal brand guidelines -- the code IS the brand right now

---

## 14. Pricing and Monetization Direction

### Stay free now?

**Yes.** Source-only alpha is free by definition. Any paywall discussion is premature noise.

### Best future direction

**BYOK (Bring Your Own Key) free core + optional managed convenience layer later.**

The architecture already supports this -- `settings.rs` validates `llm_base_url` and `llm_model`, and the user provides their own Deepgram/LLM API keys via Credential Manager. The natural paid path is:

- **Free forever:** Build from source, configure your own STT/LLM providers, use your own API keys.
- **Paid later ($8--15/mo or $149 lifetime):** Pre-built signed binary, managed STT+LLM routing, automatic updates, premium prompt templates per profession.

### Worst directions

- **Per-snippet billing** -- creates anxiety on every hotkey press, kills spontaneous use
- **Per-seat enterprise licensing** -- no admin panel, no compliance, no team features
- **Freemium with feature-gating in the desktop app** -- turns the calm UX into a hostage situation

### Likely model

Subscription with generous free tier or one-time purchase for binary convenience. Not seat-based. Not pay-per-use.

---

## 15. Competitive Framing

### Market landscape (April 2026)

| Product | Category | What they do | Why Replyline is different |
|---|---|---|---|
| Granola | AI notepad | Full-meeting capture, structured notes, AI enhancement | Replyline doesn't capture full meetings or produce notes |
| Otter | AI meeting agent | Real-time transcription, summaries, bot joins call | Replyline has no bot, no transcript, no summary |
| Fireflies | AI notetaker | Full recording, CRM integration, searchable history | Replyline has zero storage and no integrations |
| Krisp | Voice AI | Noise cancellation, meeting notes, accent AI | Replyline doesn't touch audio quality -- focuses on content |
| Read AI | Meeting intelligence | Cross-meeting memory, email+meeting+search assistant | Entirely different scale and scope |
| Poised | Communication coach | Real-time speaking feedback (pace, filler words, confidence) | Replyline advises on WHAT to say, not HOW you say it |
| Yoodli | Speech coach | Roleplay practice, speech analysis, training | Replyline is live, not practice |
| Superwhisper | Voice-to-text | On-device dictation, offline/cloud model options | Superwhisper transcribes YOU. Replyline listens to the OTHER PERSON. |

### The real wedge

Every competitor works **before** the call (prep), **during** the call (recording), or **after** the call (notes/summary). None works at the specific moment of **"I need to reply right now."**

Replyline is the only tool that:
1. Activates manually (hotkey) only when needed
2. Captures a fragment, not the whole call
3. Generates a reply, not a transcript
4. Stores nothing by default

### Language to avoid (prevents category collapse)

| Never say | Why | Say instead |
|---|---|---|
| "AI meeting assistant" | Granola/Otter/Fireflies territory | "Reply aid for difficult moments" |
| "Transcribe" / "transcript" | Implies full recording | "Captures a short snippet" |
| "Meeting notes" / "summary" | Granola/Fireflies/Otter territory | "One compact card" |
| "Communication coach" | Poised/Yoodli territory | "Decision support" |
| "Voice-to-text" / "dictation" | Superwhisper territory | "Audio snippet processing" |
| "Never miss anything" | Implies full capture | "Help in the moment that matters" |
| "Invisible" / "stealth" | Trust destruction | "Visible capture state" |
| "Understands emotions" | Overpromise, competes with Poised | "Extracts the gist" |

### Is the wedge strong enough?

**Yes -- for narrow alpha.** The wedge is conceptually clean: "decision, not documentation." But it only holds if the product proves repeatably useful in real calls. If the core moment isn't valuable, no positioning will save it.

---

## 16. Release Readiness (Product/Brand POV)

### Ready now

- [x] Sharp product scope (one card, three fields, one hotkey)
- [x] Trust architecture (RAM-only, manual activation, credential manager)
- [x] Engineering discipline (verification lanes, prompt contracts, smoke checks, atomic writes)
- [x] Visual foundation (palette, compact layout, tray-first)
- [x] Source-only publication model
- [x] Windows-first honesty (no false cross-platform promises)
- [x] Memory layer backend (correctly separated from live card flow)

### Needs tightening before source publication

- [ ] README rewrite with positioning from this document
- [ ] `docs/privacy-and-trust.md`
- [ ] `docs/known-limitations.md`
- [ ] Updated `docs/copy-rules.md` with banned terms
- [ ] GitHub repo metadata (description, About, topics)
- [ ] Tray icon simplified for 16x16
- [ ] Minimal landing page
- [ ] At least ONE confirmed use in a real live call (not smoke test, not loopback test)

### Must wait until after source publication

- Binary installer (signed, packaged)
- Cross-machine verification (3+ machines)
- Zoom/Teams/Meet/Telemost platform verification
- Video demo
- Product Hunt / broad launch
- Pricing page
- macOS/Linux port
- Memory layer UI
- Streaming STT integration (code exists in `deepgram.rs`, not wired)
- Speaker detection, emotion analysis, history, full-call recording

---

## 17. Top Risks

### Product risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Core moment doesn't prove repeatably useful in real calls | Fatal | Validate with 10+ real-call sessions before broad launch |
| 2 | WASAPI loopback breaks on Zoom/Teams/Meet updates | High | Test on multiple configurations, document failures |
| 3 | STT+LLM latency exceeds 5s, making card useless under pressure | High | Measure. Current 20s timeout in `llm.rs` may need tuning. |
| 4 | LLM generates harmful/wrong `say_now` in critical moments | High | System prompt guardrails exist in `llm.rs`. Add disclaimer: "suggestions only, user decides" |
| 5 | Audio driver inconsistency across machines (virtual audio devices from Zoom/Teams) | Medium | Document. Cannot control third-party drivers. |

### Trust / legal risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 6 | User violates recording laws or workplace policies | High | Explicit disclaimer: user is responsible. Not our liability. |
| 7 | Product perceived as "spyware" due to audio capture | High | Open source + trust docs + "visible capture state" language |
| 8 | LLM API provider logs create de facto storage | Medium | Document: "your LLM provider may log requests per their policy" |

### Distribution / positioning risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 9 | Product categorized as "another AI meeting assistant" | High | Aggressive messaging discipline. Never use competitor language. |
| 10 | Wrong users arrive expecting transcripts/history | Medium | "What it is NOT" section in README, landing page, first-run |
| 11 | Binary release creates support burden too early | Medium | Hold binary until verification complete |
| 12 | Source-only limits tester pool to developers | Low | Acceptable for alpha stage |

---

## 18. Highest-Value Deliverables (next 10 artifacts, in order)

1. **README rewrite** -- positioning, alpha disclaimer, trust model, build instructions, "what it is not"
2. **`docs/privacy-and-trust.md`** -- data flow, what is/isn't stored, recording laws note, user responsibility
3. **`docs/known-limitations.md`** -- honest list of what doesn't work or isn't verified
4. **Updated `docs/copy-rules.md`** -- add banned terms and competitive language guardrails
5. **Minimal landing page** -- hero, trust block, "what it is / isn't", GitHub CTA
6. **GitHub repo metadata pass** -- description, About, topics, pinned issue
7. **Tester brief** -- what to test, how to report, what platforms, expected experience
8. **First alpha release note** -- changelog v0.1.0-alpha (template in section 11)
9. **Simplified tray icon** -- 16x16 monochrome variant
10. **One confirmed real-call use** -- not an artifact, but a fact. Without this, everything else is theory.

---

## 19. Final Recommendation

### Name
Keep Replyline for alpha. Revisit before binary release.

### Source-only alpha
**Publish now** -- after 1--2 weeks of docs/trust/copy cleanup (deliverables 1--4 from section 18). The engineering discipline is mature enough. Don't wait for perfection.

### Binary release
**Later.** Minimum 4--8 weeks after source publication. Prerequisites: signed installer, 3+ machine verification, 10+ real-call tester sessions, stable Zoom/Teams/Meet behaviour.

### First public story

> "I built a desktop tool that helps you reply during difficult work calls. One hotkey, one card, three fields: gist, say now, next move. No transcripts, no recording, no history. Source-only alpha on GitHub."

Technical. Honest. No hype. The target audience for the first wave is not end users -- it's technical people who can evaluate the architecture and potentially become testers.

### What the founder must NOT do before release

1. **Do not call this an "AI meeting assistant"** -- instant death in the shadow of Granola ($1.5B) and Otter
2. **Do not promise privacy without exact data-flow language** -- "private by design" means nothing without explaining cloud STT/LLM routing
3. **Do not publish a binary prematurely** -- one crash on a stranger's machine + one HN comment = "this is spyware" forever
4. **Do not add features** -- no transcript UI, no history, no memory layer UI, no emotion scoring, no mic capture
5. **Do not go to Product Hunt** -- wrong audience, wrong expectations, wrong timing
6. **Do not use "stealth", "invisible", or "secret"** anywhere -- one screenshot with that word destroys trust permanently
7. **Do not promise macOS/Linux** -- "coming soon" is worse than silence
8. **Do not compare with Otter/Fireflies/Granola** -- even negatively, it legitimizes them as the reference frame
9. **Do not spend more than 3 days on the landing page** -- the repo README is the real marketing asset
10. **Do not wait for the perfect moment** -- publish source after trust docs are done, collect feedback, iterate

---

*This analysis synthesizes 8 independent strategic reviews, cross-referenced with full codebase audit of all Rust backend modules (`audio.rs`, `deepgram.rs`, `llm.rs`, `context.rs`, `credentials.rs`, `settings.rs`, `memory.rs`, `commands.rs`, `lib.rs`, `types.rs`, `bin/runtime_probe.rs`), Solid.js frontend (`App.tsx`, `App.css`), Tauri configuration (`tauri.conf.json`, `Cargo.toml`, `capabilities/default.json`), test fixtures, and 12 documentation files.*
