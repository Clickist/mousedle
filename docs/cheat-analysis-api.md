# External Cheat Analysis API

The admin UI requests analysis only after an administrator clicks the analysis button. The main application does not persist the response.

## Configuration

```env
CHEAT_ANALYSIS_API_URL=https://analysis.example.com/v1/analyze
CHEAT_ANALYSIS_API_TOKEN=replace-with-a-random-bearer-token
CHEAT_ANALYSIS_TIMEOUT_MS=15000
```

`CHEAT_ANALYSIS_API_URL` and `CHEAT_ANALYSIS_API_TOKEN` must be configured together. The timeout is clamped to 1-30 seconds.

## Request Authentication

The application sends a JSON `POST` request with these headers:

```text
Content-Type: application/json
Accept: application/json
Authorization: Bearer <CHEAT_ANALYSIS_API_TOKEN>
```

The external service should compare the bearer token using a timing-safe equality check and return `401` or `403` when it is invalid.

## Request Body

```json
{
  "schemaVersion": 1,
  "requestId": "0f8b7b2e-6d4a-4a67-9a2e-1f3c5b7d9e01",
  "generatedAt": "2026-09-13T12:00:00.000Z",
  "locale": "zh-CN",
  "trigger": "report",
  "subject": {
    "type": "user",
    "opaqueId": "a1c3e5f7-90bd-4c2e-8f60-2d4b6a8c0e12"
  },
  "playerPool": {
    "revision": "42",
    "players": [
      {
        "id": 1,
        "name": "8BitDo Retro R8",
        "country": "中国大陆",
        "continent": "亚洲",
        "brand": "8BitDo",
        "weight": 77,
        "shape": "对称",
        "size": "中型",
        "lengthMm": 120,
        "sideButtons": 2,
        "wireless": true,
        "isEnabled": true,
        "difficulties": ["hard"],
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  "singleGames": [
    {
      "recordId": 10,
      "targetMouseId": 1,
      "mode": "normal",
      "status": "won",
      "guessCount": 2,
      "firstGuessMouseId": 2,
      "guessPlayerIds": [2, 1],
      "guessTimesMs": [900, 1750],
      "startedAt": "2026-09-13T11:58:00.000Z",
      "finishedAt": "2026-09-13T12:00:00.000Z"
    }
  ],
  "matches": [
    {
      "recordId": 20,
      "mode": "classic",
      "boType": 3,
      "result": "won",
      "winnerParticipantId": "a1c3e5f7-90bd-4c2e-8f60-2d4b6a8c0e12",
      "forfeitedParticipantId": null,
      "finishReason": "score",
      "finishedAt": "2026-09-13T12:00:00.000Z",
      "participants": [
        {
          "participantId": "a1c3e5f7-90bd-4c2e-8f60-2d4b6a8c0e12",
          "isSubject": true,
          "score": 2,
          "isWinner": true,
          "winningGuessSum": 3,
          "winningRounds": 2
        }
      ],
      "rounds": [
        {
          "round": 1,
          "targetMouseId": 1,
          "winnerParticipantId": "a1c3e5f7-90bd-4c2e-8f60-2d4b6a8c0e12",
          "reason": "guessed",
          "guessesByParticipant": {
            "a1c3e5f7-90bd-4c2e-8f60-2d4b6a8c0e12": [2, 1]
          },
          "guessTimesMsByParticipant": {
            "a1c3e5f7-90bd-4c2e-8f60-2d4b6a8c0e12": [900, 1750]
          }
        }
      ]
    }
  ],
  "reports": {
    "count": 3,
    "independentReporters": 2,
    "pending": 2
  }
}
```

Field notes:

- `locale` is one of `zh-CN`, `en-US`, `ja-JP`. `trigger` is one of `user-detail`, `guest-detail`, `report`, depending on which admin endpoint requested the snapshot.
- `playerPool.players` is the complete current mouse pool, including disabled mice (`isEnabled: false`), every difficulty membership (`difficulties`, sorted, subset of `easy`/`normal`/`hard`), and the display spec fields exposed to guesses (`weight`, `shape`, `size`, `lengthMm`, `sideButtons`, `wireless`).
- `firstGuessMouseId` is `null` when the subject made no guess. `guessTimesMs` and `guessTimesMsByParticipant` elements are nullable: invalid or missing timings are serialized as `null`.
- `singleGames` covers the subject's latest 50 completed single-player games (`mode` is the difficulty key `easy`/`normal`/`hard`). `matches` covers the subject's latest 50 completed multiplayer matches and **only `classic` mode** (`mode` is always `classic`); each match contains every participant and its complete stored replay, capped at 50 rounds per match. Each player has at most 8 guesses per round. Guess times are server-recorded milliseconds from game or round start.
- `winnerParticipantId`, `forfeitedParticipantId`, and per-round `winnerParticipantId` are nullable.

The request excludes account usernames, emails, multiplayer display names, raw user/guest identity keys, report descriptions, admin notes, IP addresses, cookies, and authentication tokens. `subject.opaqueId` is generated independently for every request. Every multiplayer participant receives a per-request opaque ID, and the subject keeps the same opaque ID across `subject`, participants, winners, forfeits, guesses, and timings.

## Size Limits, Idempotency, and Failure Handling

- The request body is capped at 8 MB; larger snapshots are rejected with `413 ANALYSIS_SNAPSHOT_TOO_LARGE` and never sent to the external service.
- There is no server-side idempotency: every click builds a fresh snapshot with a new `requestId` and new opaque IDs and pushes it again. Deduplication is the caller's responsibility.
- Responses are not persisted anywhere; the app only forwards the validated JSON back to the admin UI.
- Failure semantics (returned to the admin UI, no retry, no queue):
  - `503 ANALYSIS_SERVICE_NOT_CONFIGURED` — URL/token missing.
  - `413 ANALYSIS_SNAPSHOT_TOO_LARGE` — snapshot exceeds 8 MB.
  - `504 ANALYSIS_SERVICE_TIMEOUT` — the external service did not answer within the clamped timeout.
  - `502 ANALYSIS_SERVICE_UNAVAILABLE` — network error or non-2xx status from the external service.
  - `502 ANALYSIS_SERVICE_INVALID_RESPONSE` — invalid JSON, failed strict schema validation, `requestId` mismatch, or response body exceeding 512 KB.

## Response Body

The service must return JSON matching this presentation envelope:

```json
{
  "schemaVersion": 1,
  "requestId": "same-request-uuid",
  "analysisId": "temporary-analysis-id",
  "modelVersion": "2026.08.1",
  "generatedAt": "2026-08-02T12:00:01.000Z",
  "decision": {
    "level": "high",
    "score": 92,
    "label": "High risk",
    "summary": "Behavior is strongly consistent with automation."
  },
  "sections": [
    {
      "title": "Signals",
      "items": [
        {
          "type": "metric",
          "label": "Suspicious rounds",
          "value": 12,
          "displayValue": "12",
          "severity": "danger"
        }
      ]
    }
  ]
}
```

Supported item types are `metric`, `text`, `badge`, `table`, `timeline`, and `distribution`. Severity values are `neutral`, `info`, `success`, `warning`, and `danger`. Decision levels are `unknown`, `low`, `medium`, `high`, and `critical`. `decision.score` is a required integer from 0 to 100.

The frontend renders all strings as text. HTML is not accepted.

## Response Validation

The response does not require a signature. The application rejects unsuccessful HTTP responses, invalid JSON, mismatched request IDs, unknown fields, oversized responses, and unsupported presentation types.
