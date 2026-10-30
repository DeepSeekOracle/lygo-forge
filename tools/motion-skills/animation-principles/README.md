# Animation Principles Skill Marketplace

**Give Claude the superpower of a Disney animator.**

A comprehensive collection of 144 Claude Code skills that teach Disney's 12 Principles of Animation and ways to apply them across every context, tool, and scenario imaginable. 

[![Skills](https://img.shields.io/badge/skills-144-blue)](./docs/index.md)
[![Categories](https://img.shields.io/badge/categories-12-green)](./docs/index.md)
[![License](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)

---

## What is This?

This is a **skill marketplace** for Claude Code that transforms Claude into a Disney animation expert. Whether you're building UI micro-interactions, game animations, loading states, or complex motion sequences, these skills provide contextual guidance rooted in the timeless principles that made Disney animation legendary. 

There are 12 sets of 12 skills each. Use this to give Claude animation powers in any scenario or to learn more yourself. 

### The 12 Principles

| # | Principle | What It Does |
|---|-----------|--------------|
| 1 | **Squash & Stretch** | Shows weight and flexibility through deformation |
| 2 | **Anticipation** | Prepares the viewer for what's coming |
| 3 | **Staging** | Directs attention to what matters |
| 4 | **Straight Ahead / Pose to Pose** | Two approaches to creating movement |
| 5 | **Follow Through / Overlapping** | Parts move at different rates |
| 6 | **Slow In / Slow Out** | Natural acceleration and deceleration |
| 7 | **Arc** | Organic curved motion paths |
| 8 | **Secondary Action** | Supporting movements that reinforce |
| 9 | **Timing** | Speed conveys weight and emotion |
| 10 | **Exaggeration** | Push beyond reality for clarity |
| 11 | **Solid Drawing** | Maintain volume and consistency |
| 12 | **Appeal** | Charisma that draws viewers in |

---

## Installation

### Claude Code Plugin

Add to your Claude Code settings:

```json
{
  "plugins": [
    "animation-principles@github:dylantarre/animation-principles"
  ]
}
```

### Manual Installation

```bash
# Clone to your Claude plugins directory
git clone https://github.com/dylantarre/animation-principles.git \
  ~/.claude/plugins/animation-principles
```

### Direct Use

You can also reference skills directly in conversations:

```
Use the animation-principles:joy-delight skill for this celebration animation
```

---

## Skill Categories

### By Application Domain
| Skill | Best For |
|-------|----------|
| [web-motion-design](docs/01-by-domain/web-motion-design.md) | CSS/JS web animations |
| [mobile-touch](docs/01-by-domain/mobile-touch.md) | Touch gestures, mobile patterns |
| [game-development](docs/01-by-domain/game-development.md) | Game UI and characters |
| [data-visualization](docs/01-by-domain/data-visualization.md) | Charts and data storytelling |
| [micro-interactions](docs/01-by-domain/micro-interactions.md) | Small, delightful moments |

### By Role
| Skill | Best For |
|-------|----------|
| [frontend-developer](docs/03-by-role-persona/frontend-developer.md) | Code-first implementation |
| [motion-designer](docs/03-by-role-persona/motion-designer.md) | Professional motion design |
| [game-designer](docs/03-by-role-persona/game-designer.md) | Interactive game motion |
| [creative-director](docs/03-by-role-persona/creative-director.md) | High-level direction |

### By Tool/Framework
| Skill | Technology |
|-------|------------|
| [css-native](docs/09-by-tool-framework/css-native.md) | Pure CSS animations |
| [framer-motion](docs/09-by-tool-framework/framer-motion.md) | Framer Motion (React) |
| [gsap-greensock](docs/09-by-tool-framework/gsap-greensock.md) | GSAP/GreenSock |
| [react-spring](docs/09-by-tool-framework/react-spring.md) | React Spring |
| [lottie-bodymovin](docs/09-by-tool-framework/lottie-bodymovin.md) | Lottie animations |

### By Emotional Outcome
| Skill | Creates |
|-------|---------|
| [joy-delight](docs/06-by-emotional-outcome/joy-delight.md) | Happiness and surprise |
| [trust-reliability](docs/06-by-emotional-outcome/trust-reliability.md) | User confidence |
| [urgency-action](docs/06-by-emotional-outcome/urgency-action.md) | Immediate action |
| [elegance-sophistication](docs/06-by-emotional-outcome/elegance-sophistication.md) | Premium feel |

### By Skill Level
| Skill | Level |
|-------|-------|
| [absolute-beginner](docs/04-by-skill-level/absolute-beginner.md) | First introduction |
| [intermediate](docs/04-by-skill-level/intermediate.md) | Working knowledge |
| [expert](docs/04-by-skill-level/expert.md) | Professional mastery |
| [teaching-others](docs/04-by-skill-level/teaching-others.md) | How to teach |

[**View all 144 skills →**](docs/index.md)

---

## Quick Start

### New to Animation?
```
Use animation-principles:absolute-beginner
```

### Frontend Developer?
```
Use animation-principles:frontend-developer
```

### Need a Specific Framework?
```
Use animation-principles:framer-motion
```

### Debugging Animation Issues?
```
Use animation-principles:implementation-debugging
```

---

## How Skills Work

Each skill teaches Claude how to apply the 12 principles in a specific context. For example:

**`joy-delight`** teaches:
- Exaggerated bounces for celebrations
- Confetti and particle timing
- Overshoot easing curves
- When to use playful spring physics

**`fintech-banking`** teaches:
- Subtle, trustworthy motion
- Professional timing (no bounces)
- Security-conveying transitions
- Accessibility requirements for finance

**`squash-stretch-mastery`** teaches:
- Deep theory behind the principle
- Volume preservation techniques
- When to break the rules
- Cross-domain applications

---

## Directory Structure

```
animation-principles/
├── README.md
├── CLAUDE.md              # Claude Code integration instructions
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
├── skills/                # Source skill files
│   ├── 01-by-domain/
│   ├── 02-by-thinking-style/
│   ├── 03-by-role-persona/
│   ├── 04-by-skill-level/
│   ├── 05-by-animation-type/
│   ├── 06-by-emotional-outcome/
│   ├── 07-by-ui-element/
│   ├── 08-by-industry/
│   ├── 09-by-tool-framework/
│   ├── 10-by-time-scale/
│   ├── 11-by-principle-focus/
│   └── 12-by-problem-type/
└── docs/                  # Rendered documentation
    └── index.md           # Full skill directory
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ideas for contributions:**
- New industry-specific skills
- Additional framework implementations
- Translations
- Bug fixes and improvements

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Credits

Based on the 12 Principles of Animation developed by Disney animators Ollie Johnston and Frank Thomas, as documented in *The Illusion of Life: Disney Animation* (1981).

---

**Made with care for the animation community.**
