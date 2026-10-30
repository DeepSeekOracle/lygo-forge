# Population-Based Event Scaling for Simulation Games

Emergent events (fires, crimes, medical emergencies, disasters) in city builders and simulation games must scale with **actual population and city state**, not fixed timers or frame-rate-dependent spawns.

## Core Principles

### 1. Per-Capita Rates, Not Fixed Probabilities
```javascript
// BAD: fixed chance every frame
if (Math.random() < 0.001) spawnFire();

// GOOD: per-capita daily rate converted to per-tick probability
const BASE_RATE_PER_CAPITA = 0.0008; // 0.8 per 1000 people/day
const perCapitaRate = BASE_RATE_PER_CAPITA * (population / 1000);
const tickProbability = perCapitaRate / (SECONDS_PER_DAY / TICK_SECONDS);
if (Math.random() < tickProbability) spawnEvent();
```

### 2. Population Thresholds (Milestone Gates)
- **Minimum population**: No events below this threshold (e.g., 150 for medical, 200 for fire, 300 for crime)
- **Milestone gates**: Events unlock at population milestones matching game progression (Village=120, Town=600, City=2500)
- **Event types gate separately**: Market days at 120, festivals at 300, building booms at 600

### 3. Daily/Weekly Caps
- Hard maximum events per day prevents cascade spam in large cities
- Medical: 8/day, Police: 6/day, Fire: 3/day
- Reset counter at day boundary

### 4. State-Dependent Multipliers
Apply multiplicative modifiers based on city state:
- **Unemployment**: Higher unemployment → more crime/disturbances
- **Density**: More buildings/roads per capita → more opportunities for incidents
- **Time of day**: Night multiplier (1.5×) for crime
- **Weather**: Rain multiplier (1.3×) for crime (fewer witnesses), dry weather (1.4×) for fire
- **Infrastructure coverage**: Fire station proximity reduces fire risk (0.3× if covered, 0.6× if distant)

### 5. Architecture: Simulation Tick vs Render Loop
```javascript
// BAD: spawns in render loop (60×/sec at 60fps)
function drawFrame() {
  spawnMedicalEmergency(); // runs every frame!
}

// GOOD: spawns in fixed timestep simulation tick
function tick() { // runs once per game day (e.g., every 7 real seconds)
  checkFireIgnition();
  spawnMedicalEmergency();
  spawnPoliceCall();
}
function drawFrame() {
  updateMedicalCalls(dt); // only vehicle updates, no spawning
  updatePoliceCalls(dt);
}
```

### 6. Risk Assessment from Actual City State
Fire risk should derive from:
- Industrial tile count and level (actual hazard sources)
- Industrial density per capita (not absolute count)
- Adjacent industrial clustering
- Fire station coverage (pathfinding distance)
- Weather and time of day

```javascript
function assessFireRisk(region) {
  if (population < MIN_POP) return 0;
  let risk = 0;
  let industrialCount = 0;
  for (each industrial tile) {
    risk += level * 0.5;
    industrialCount++;
  }
  if (industrialCount === 0) return minimalRisk;
  risk *= 0.5 + (industrialCount / pop) * 2; // per-capita density
  // station coverage, weather, night modifiers...
  return risk;
}
```

## Event Type Weighting
Weight event types by situation, not fixed distribution:
```javascript
const unemp = (pop - jobs) / pop;
const types = [
  { id: "accident", weight: 3 + trafficVolume * 0.5 },
  { id: "disturbance", weight: 2 + unemp * 5 },
  { id: "crime", weight: 1 + unemp * 8 },
];
```

## Verification Checklist
- [ ] Zero events at pop=0
- [ ] Events rare at first milestone (120 pop)
- [ ] Event frequency scales ~linearly with population
- [ ] Daily caps prevent spam at 10,000+ pop
- [ ] Unemployment visibly increases crime rate
- [ ] Fire stations visibly reduce fire incidents
- [ ] Night/rain modifiers measurable in logs
- [ ] No spawns in render loop (grep for spawn calls in drawFrame)

## Anti-Patterns to Avoid
- ❌ `Math.random() < 0.001` every frame
- ❌ Events firing before first milestone
- ❌ Fire events in towns with zero industry
- ❌ Crime waves in cities with 0% unemployment
- ❌ Event spawns coupled to render frame rate
- ❌ Daily caps missing (leads to O(pop) event spam)
- ❌ All event types using same population threshold

## Related Patterns
- See `references/pacing-measurement-probes.md` for measuring throughput
- See `references/combat-ai-movement-and-metrics.md` for instrumenting event rates
- The **reason-string census** technique applies: log every spawn with its computed probability and trigger reason, then aggregate to verify scaling.