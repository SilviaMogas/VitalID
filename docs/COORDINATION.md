# Devin Coordination

This file is the coordination contract between Devin Chat A and Devin Chat B.

## Branches
- Chat A: `devin-a-core`
- Chat B: `devin-b-share`

## Rule
Do not edit the other chat's owned files unless integration is blocked.

## Communication
When one chat needs the other:
1. Add a short note under its section below.
2. Include exact file/API/interface needed.
3. Commit the note to its branch.
4. Tell Silvia: "Send Chat A/B to read docs/COORDINATION.md on my branch."

### Chat A → Chat B
No requests yet.

### Chat B → Chat A
No requests yet.

## Shared interface expectations
- Chat A exposes stable demo data and Vital ID snapshot types.
- Chat B consumes those types for selective sharing.
- Chat B must not duplicate health/business logic.
- Chat A must not duplicate share-token logic.

## Merge principle
Small, working increments. Avoid long-lived divergent branches.
