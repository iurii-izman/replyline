# Stale Beta Policy

Replyline beta issues may be marked as stale candidates, but they are not auto-closed.

## Policy

- Only list stale candidates.
- Never auto-close an issue without human confirmation.
- Never post recurring bot comments.
- Use `status:stale-candidate` only as a review marker, not as a terminal state.

## Stale-Candidate Criteria

An issue can be marked `status:stale-candidate` when all conditions hold:

1. The issue has no meaningful update for at least 14 days.
2. Triage already requested the minimal missing information or confirmation.
3. The issue is not `priority:p0`.
4. There is no active assignee currently working on it.
5. The latest blocker is lack of reporter confirmation, missing reproduction data, or outdated beta version context.

## Human Review Checklist

Before closing anything, a maintainer should confirm:

1. The issue still lacks the information needed to proceed.
2. The current beta version or docs did not already resolve it silently.
3. No linked PR, milestone, or related issue still depends on it.
4. The reporter has been given a polite path to reopen or refresh the report.

## Follow-Up Comment Templates

Use these manually and only when needed.

### Needs refresh

```text
Thanks for the report. We have not had enough recent detail to continue triage, so we marked this as `status:stale-candidate` for human review only. If this still reproduces on the latest beta, please reply with the current app version, OS version, `beta:doctor` verdict, and a sanitized smoke report attachment.
```

### Waiting for setup details

```text
We still need the missing setup details to move this forward. Please reply with the exact blocked step, current beta version, provider type, and sanitized evidence only. We will keep the issue open pending human review; it is not being auto-closed.
```

### Closing after human confirmation

```text
Closing this after human review because we still do not have enough current information to reproduce or prioritize it. If it still reproduces on the latest beta, open a fresh issue or comment with updated sanitized details and we will pick it up again.
```
