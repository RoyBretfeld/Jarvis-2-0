# 06_TEST_MATRIX

## Baseline (immer)

- `rb check` muss laufen und grün sein.

## Trigger‑Tests (wenn betroffen)

| Änderung                 | Trigger                       | Command                 |
| ------------------------ | ----------------------------- | ----------------------- |
| DB schema/migrations     | Migration‑Test + DB roundtrip | {{DB_TRIGGER_CMD}}      |
| Routing/External service | Golden/E2E                    | {{SERVICE_TRIGGER_CMD}} |
| Frontend UI              | UI smoke                      | {{UI_TRIGGER_CMD}}      |
| Auth/RBAC                | Permission tests              | {{RBAC_TRIGGER_CMD}}    |

## Mindestnachweis

- Jede Änderung muss entweder:
  - durch Tests abgedeckt sein, oder
  - einen reproduzierbaren manuellen Testschritt + Screenshot/Log liefern.
