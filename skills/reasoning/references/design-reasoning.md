# Design Reasoning

First principles thinking applied to design decisions.

## 1. Design Trade-off Tensions

Every design decision sits on spectrums. Know where you're trading off.

| Tension | Left Extreme | Right Extreme | Questions |
|---------|--------------|---------------|-----------|
| **Consistency vs Novelty** | Same patterns everywhere | Unique solutions per context | Does breaking pattern justify cognitive cost? |
| **Simplicity vs Power** | One way to do things | Many options for users | Who are power users? How many? |
| **Guidance vs Freedom** | Heavy handholding | User figures it out | What's the cost of wrong choices? |
| **Aesthetic vs Performance** | Beautiful but slow | Fast but ugly | Is the beauty functional or decorative? |
| **Density vs Breathing room** | Information-packed | Lots of whitespace | What task are users doing? Scanning vs reading? |

**The meta-question:** Which extreme causes more damage if you're wrong?

### Applying the Tension Frame

1. Identify which tension applies
2. Ask: "What's our current position on this spectrum?"
3. Ask: "What would move us in each direction?"
4. Ask: "Which direction has lower reversal cost?" (two-way door test)

## 2. Visual Hierarchy Principles

These are physics—not preferences. They describe how human perception works.

| Principle | How It Works | Violation Symptom |
|-----------|--------------|-------------------|
| **Size encodes importance** | Bigger = more important | Everything screams, nothing stands out |
| **Proximity encodes relationship** | Closer = related | Users group unrelated things |
| **Contrast creates focus** | Difference draws attention | Important actions get lost |
| **Repetition creates pattern** | Same treatment = same meaning | Users can't predict behavior |

### Hierarchy Debugging

When a design "feels off":
1. Squint at the screen. What stands out?
2. Is that what SHOULD stand out?
3. If not, what's fighting for attention?
4. Apply: increase contrast on important, decrease on unimportant

**The 3-second test:** Show design for 3 seconds. Ask: "What was this about?" If they can't answer, hierarchy is broken.

## 3. The User Model Gap

Three models exist for every interface:

| Model | Owned By | Description |
|-------|----------|-------------|
| **System model** | Engineers | How it actually works |
| **Designer's model** | Design team | How we think users will understand it |
| **User's model** | Users | How they actually understand it |

**The gap:** Designer's model ≠ User's model. This gap causes all usability problems.

### Closing the Gap

| Method | Cost | Fidelity |
|--------|------|----------|
| Talk to users before designing | Low | Medium |
| Paper prototype testing | Low | Low-Medium |
| Clickable prototype testing | Medium | High |
| Observe real usage | High | Highest |

**First principles approach:**
- What does the user already know? (existing mental models)
- What must they learn? (new concepts)
- Minimize new concepts. Map to existing knowledge.

### Common Model Mismatches

| Designer assumes | User actually thinks |
|------------------|---------------------|
| "Obvious" hamburger menu | "Where's the menu?" |
| Icons are self-explanatory | "What does this symbol mean?" |
| Modal = important message | Dismisses without reading |
| Onboarding teaches | Skips to explore |

## 4. Accessibility as First Principles

Not a checklist. A question: **"Can someone complete this task if they can't [X]?"**

| If they can't... | Then you need... |
|------------------|------------------|
| See colors | Meaning not solely through color |
| Use a mouse | Full keyboard navigation |
| See small text | Readable at 200% zoom |
| Hear audio | Captions/transcripts |
| Process quickly | No time limits, clear feedback |

**The first-principles test:**
1. What's the core task?
2. What inputs/outputs does it require?
3. Are there alternative channels for each?

**Economic argument:** 15-20% of users have some disability. That's not edge cases—that's revenue.

## 5. Design Deletion

Every element earns its place or gets deleted.

### The Deletion Test

For each element, ask:
1. What task does this support?
2. What happens if I remove it?
3. Would users complain or not notice?

### High-Value Deletion Targets

| Target | Why It's Often Cruft |
|--------|---------------------|
| Decorative icons | Add noise, no information |
| "Learn more" links | Rarely clicked |
| Explanatory paragraphs | Users don't read |
| Confirmation modals | Interrupt flow |
| Optional form fields | Every field reduces completion |

**The "10% rule":** After a design is "done," find 10% more to remove. If nothing can go, you didn't try hard enough.

### Deletion Exceptions

Keep it if:
- Removing it causes support tickets
- Removing it causes legal issues
- User testing shows it's actually used
- It prevents costly mistakes (guard rails)

## 6. Design Anti-Patterns

Patterns that sound reasonable but are usually wrong.

### "Users want customization"

**Reality:** Most users want sensible defaults. A tiny minority wants customization—and they're disproportionately vocal.

**Test:** What % of users change default settings? Usually <5%.

**Fix:** Make great defaults. Hide customization for power users.

### "We need to show our brand"

**Reality:** Users don't care about your brand. They care about completing their task.

**Test:** Does this branding help or hinder the task?

**Fix:** Brand through quality of experience, not logo size and brand colors everywhere.

### "More information is better"

**Reality:** More information = more cognitive load = worse decisions.

**Test:** Can users find what they need in <3 seconds?

**Fix:** Progressive disclosure. Show minimum first. Reveal more on demand.

### "We should add an option for that"

**Reality:** Every option is a decision users must make. Decisions are costly.

**Test:** What happens if we just pick the right answer for them?

**Fix:** Make the decision. Take the criticism from the 2% who disagree.

### "Let's add a tooltip to explain"

**Reality:** If you need a tooltip, the design failed. Tooltips are band-aids.

**Test:** What if this had to be understood without any explanation?

**Fix:** Redesign so it's obvious. Use real words instead of icons.

## Prototype Cost Heuristic

**Always ask:** "What's the cheapest way to learn what we need?"

| What You're Testing | Cheapest Method |
|---------------------|-----------------|
| Does this concept resonate? | 5-minute conversation |
| Can users find the thing? | Paper prototype |
| Does the flow make sense? | Clickable mockup |
| Does it perform well enough? | Technical spike |
| Will users actually use it? | Ship and measure |

**The waste:** Building high-fidelity when low-fidelity would answer the question.
