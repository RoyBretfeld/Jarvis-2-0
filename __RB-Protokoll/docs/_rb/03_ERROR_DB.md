# 03_ERROR_DB

Zweck: Wiederkehrende Fehler **einmal** sauber erklären, damit Mensch+Agent sie nicht wiederholen.

## Eintrag‑Template

- **ID:** ERR‑{{YYYYMMDD}}‑{{SHORT}}
- **Symptom:**
- **Root Cause:**
- **Fix:**
- **Regression Test:**
- **Prevention Rule:**
- **Links/PRs:**

---

## Index (Tabelle)

| ID                      | Symptom                                                                   | Root Cause                                                              | Fix                                                                                       | Regression Test                                         |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| ERR-20251210-ENV-LOAD   | App crashes with `KeyError: 'DB_HOST'` on startup                         | `.env` file not loaded because `python-dotenv` was missing in prod      | Add `python-dotenv` to requirements.txt and call `load_dotenv()` explicitly in entrypoint | Check `os.getenv('DB_HOST')` in health check            | Always verify env vars at startup                        |
| ERR-20251212-MIG-LOCK   | Deployment hangs at "Running migrations..."                               | DB migration script waited for user input (interactive mode)            | Add `--no-input` flag to migration command in `start.sh`                                  | Run `start.sh` in detached CI container                 | Use non-interactive flags for all CI/CD commands         |
| ERR-20251214-CORS-ERR   | Frontend API calls fail with "CORS Policy"                                | Backend allowed specific origins but Frontend definition was updated    | Update `CORS_ORIGINS` in backend config to include new frontend domain/port               | `test_cors_headers` in integration tests                | Wildcards `*` only in dev, strict lists in prod          |
| ERR-20251215-IMG-SIZE   | User upload fails silently or crash                                       | Image > 10MB exceeded nginx client_max_body_size                        | Increase `client_max_body_size` in nginx.conf + Add validation in backend                 | Upload 15MB file in E2E test and expect clean 413 error | Sync frontend/backend/proxy size limits                  |
| ERR-20251218-DOCKER-NET | Service A cannot reach Service B (`ConnectionRefused`)                    | Services defined in docker-compose but no shared network explicitly set | Define `networks: - app-tier` for both services in compose.yml                            | Connectivity test `curl service-b:8080` from service-a  | Explicitly define networks, don't rely on default bridge |
| ERR-20251220-PY-VERSION | CI fails with `SyntaxError: match ... case`                               | CI runner used Python 3.9 (match-case needs 3.10+)                      | Update `.github/workflows/ci.yml` to use `python-version: '3.11'`                         | Version check in `rb.py` / `pyproject.toml`             | Enforce min python version in CI and code                |
| ERR-20251222-JSON-DATE  | API returns `TypeError: Object of type datetime is not JSON serializable` | Returning SQLAlchemy model directly without Pydantic/serialization      | Use Pydantic schemas `.model_dump()` or custom encoder for defaults                       | Test endpoint with Date field                           | Always use schemas for API responses                     |
| ERR-20251224-SECRET-LOG | Secrets found in Splunk/CloudWatch logs                                   | `print(request.headers)` logged Authorization tokens                    | Use logging filter to redact sensitive keys or log only specific safe headers             | `rb check` static analysis + grep logs test             | Police script must scan for log statements with secrets  |
| ERR-20251226-TEST-FLAKE | Tests fail randomly (Flaky)                                               | Tests used current system time/random numbers without seed              | Freeze time with `freezegun` / Set random seed in `conftest.py`                           | Run test suite 10x in a loop                            | No `datetime.now()` in tests without mocking             |
| ERR-20251228-GIT-CRLF   | Bash scripts fail in Docker: `\r: command not found`                      | Git converted LF to CRLF on Windows dev machine                         | Add `.gitattributes` enforcing `text=auto eol=lf` for scripts                             | `file scripts/*.sh` check in CI                         | Enforce `.gitattributes` from start                      |
| ERR-20260110-INSP-EMPTY | Inspector window opens but shows no images despite files in list          | `current_limit` initialized to 50 instead of 0, skipping first batch     | Change `current_limit = [50]` to `current_limit = [0]` in `_show_stack_inspector`         | Open Inspector with 100+ files, verify first 50 visible | Always start iterators/limits at 0 unless explicitly offset |
| ERR-20260110-FILE-DUPE  | Filenames become extremely long with multiple timestamps appended         | Collision handling appends timestamp every time file is moved            | Use incremental counter (file_1, file_2) instead of timestamps in `_quick_move`           | Move same file multiple times, check filename           | Use counters for duplicates, not timestamps              |
