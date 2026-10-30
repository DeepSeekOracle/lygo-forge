# Contributing to Animation Principles

Thank you for your interest in contributing to the Animation Principles Skill Marketplace!

## Ways to Contribute

### 1. Add New Skills

We're always looking for new skills that cover:
- Additional industries or domains
- New animation frameworks/tools
- Different cultural perspectives on motion
- Specialized use cases

### 2. Improve Existing Skills

- Fix errors or unclear explanations
- Add better code examples
- Improve timing recommendations
- Add accessibility considerations

### 3. Documentation

- Fix typos and grammar
- Improve examples
- Add translations
- Enhance the index or navigation

### 4. Report Issues

- Skills that don't work as expected
- Missing coverage for important use cases
- Outdated framework information

---

## Skill Writing Guidelines

### File Structure

Each skill lives in a directory under the appropriate category:

```
skills/
  <category>/
    <skill-name>/
      SKILL.md
```

### SKILL.md Format

```markdown
---
name: skill-name-with-hyphens
description: Use when [specific triggering conditions]. Third person, max 500 chars.
---

# Skill Title

Brief overview of what this skill teaches.

## Quick Reference

| Principle | Application |
|-----------|-------------|
| Squash & Stretch | How it applies here |
| ... | ... |

## Detailed Sections

Explain each principle in context...

## Code Examples (if applicable)

```css
/* Practical code */
```

## Common Mistakes

- What to avoid
```

### Naming Conventions

- Use lowercase with hyphens: `joy-delight`, not `JoyDelight` or `joy_delight`
- Be descriptive: `fintech-banking` not `finance`
- Keep names under 30 characters

### Description Requirements

- Start with "Use when..."
- Focus on triggering conditions, not what the skill does
- Third person voice
- Max 500 characters
- No workflow summaries

### Quality Standards

1. **Accuracy**: Principles should be correctly applied
2. **Practicality**: Include actionable guidance
3. **Conciseness**: Under 500 words for main content
4. **Code examples**: When applicable, provide working code
5. **Timing values**: Be specific (e.g., "200-300ms" not "fast")

---

## Development Workflow

### 1. Fork the Repository

```bash
git clone https://github.com/YOUR-USERNAME/animation-principles.git
cd animation-principles
```

### 2. Create a Branch

```bash
git checkout -b add-new-skill-name
```

### 3. Write Your Skill

Create the skill in the appropriate category directory.

### 4. Test Your Skill

- Read through for clarity
- Verify code examples work
- Check timing recommendations make sense
- Ensure all 12 principles are addressed (if applicable)

### 5. Update Documentation

If adding a new skill, add it to `docs/index.md` in the appropriate table.

### 6. Submit a Pull Request

- Clear title describing the addition
- Brief description of what the skill covers
- Any special considerations

---

## Code of Conduct

- Be respectful and constructive
- Focus on the work, not the person
- Welcome newcomers
- Assume good intent

---

## Questions?

Open an issue with the "question" label and we'll help you out.

---

Thank you for helping make animation principles accessible to everyone!
