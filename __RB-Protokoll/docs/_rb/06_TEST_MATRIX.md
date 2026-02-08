# 06_TEST_MATRIX

## Baseline (immer)

- `rb check` muss laufen und grün sein.

## Trigger‑Tests (wenn betroffen)

| Änderung                 | Trigger                       | Command                 |
| ------------------------ | ----------------------------- | ----------------------- |
| DB schema/migrations     | Migration‑Test + DB roundtrip | N/A (no DB)             |
| Routing/External service | Golden/E2E                    | N/A (no services)       |
| Frontend UI              | UI smoke                      | N/A (no UI)             |
| Auth/RBAC                | Permission tests              | N/A (no RBAC)           |

## Mindestnachweis

- Jede Änderung muss entweder:
  - durch Tests abgedeckt sein, oder
  - einen reproduzierbaren manuellen Testschritt + Screenshot/Log liefern.
