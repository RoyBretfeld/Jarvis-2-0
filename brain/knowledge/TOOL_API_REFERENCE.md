# Tool API Reference

## search_knowledge_base backend

### Endpoint
- `GET /api/knowledge/search?q=<query>&limit=<n>`

### Parameters
- `q` (required): Suchbegriff(e)
- `limit` (optional): Anzahl Treffer, Standard `5`, Maximum `20`

### Response
```json
{
  "status": "ok",
  "query": "skill",
  "total": 3,
  "results": [
    {
      "file": "SKILL_CREATION_GUIDE.md",
      "score": 12,
      "snippet": "...",
      "path": "brain/knowledge/SKILL_CREATION_GUIDE.md"
    }
  ]
}
```

### Operational Notes
- Quelle ist `brain/knowledge/*.md`.
- Ranking basiert auf einfacher Termhaeufigkeit.
- Fuer neue Wissensdokumente Datei in `brain/knowledge/` anlegen und in `INDEX.md` verlinken.
