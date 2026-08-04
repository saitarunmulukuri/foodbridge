# Decision Engine Specification & Architecture

The **Decision Engine** is the core intelligence sub-system of FoodBridge. It automates donor-to-NGO matching by evaluating active NGOs against surplus food donations using a 4-stage eligibility pipeline and multi-criteria scoring algorithm.

## Pipeline Architecture

```
Donation (SUBMITTED)
        │
        ▼
[1. Candidate Finder] ──► Loads Active + Verified NGOs with today's Capacity
        │
        ▼
[2. Eligibility Pipeline]
   ├── 2a. Accepting Today Guard (remaining_capacity > 0)
   ├── 2b. Capacity Threshold Guard (remaining_capacity >= total_quantity)
   ├── 2c. Dietary Type Match Guard (supported food types)
   └── 2d. Proximity Radius Guard (Distance <= service_radius_km)
        │
        ▼
[3. Multi-Criteria Scorer]
   ├── Proximity Score (40% Weight): Haversine distance decay
   ├── Capacity Fit Score (30% Weight): Quantity intake suitability ratio
   └── Reliability Score (30% Weight): Historical acceptance rate
        │
        ▼
[4. Priority Ranker] ──► Ranks eligible candidates by total_score descending
        │
        ▼
[5. Execution Pipeline] ──► Persists DecisionEngineRun, RecommendationCycle, and issues rank-1 NGORequest
```

## Scoring Formula

$$\text{Total Score} = (S_{\text{prox}} \times 0.40) + (S_{\text{cap}} \times 0.30) + (S_{\text{rel}} \times 0.30)$$

- **Proximity Score ($S_{\text{prox}}$)**: Normalized from 1.0 (0 km) down to 0.0 at `service_radius_km`.
- **Capacity Fit Score ($S_{\text{cap}}$)**: Suitability ratio of remaining capacity vs donation total quantity.
- **Reliability Score ($S_{\text{rel}}$)**: Historical request acceptance rate ($\frac{\text{accepted}}{\text{total terminal requests}}$). Defaults to 0.50 for new NGOs with no history.

## Performance & DB Isolation

- **Decoupled Dataclass DTOs**: The algorithm pipeline operates strictly on `CandidateNGO` and `EligibleNGO` DTOs with zero ORM dependencies.
- **Single SQL Fetch**: `CandidateNGOFinder` retrieves candidate NGOs in a single SQL `select()` with `joinedload()`.
- **Deterministic**: Scoring and ranking are pure functions with 0 side effects.
