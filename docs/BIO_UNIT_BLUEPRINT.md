# 🧬 BIO-UNIT BLUEPRINT v2 (Cortex Edition)

## Phased Approach

### Phase 1: Core Loop (Morgen) ✅
- Text-basiertes Gehirn (.md Dateien)
- Basic Skills (Bash/Python)
- RAM: < 100 MB
- **Ziel:** Agent läuft stabil, überwacht, schreibt Memory

### Phase 2: Expansion (Creative Studio)
- **Painter:** Txt2Img via Automatic1111/ComfyUI
- **Director:** Img2Video via SVD
- **Gallery:** `/public/gallery` Integration

---

## Architecture (Prepared Slots)

```
/ENTITY_ROOT/
├── boot.py
│
├── /brain/
│   ├── SOUL.md
│   ├── MEMORY.md
│   ├── TERRITORY.md
│   ├── GROWTH.md
│   ├── /vector_store/     # [EMPTY SLOT]
│   └── /raw_data/         # [EMPTY SLOT]
│
├── /body/
│   ├── nervous_system.py
│   ├── broker.py
│   └── /senses/
│       ├── ear.py         # Whisper
│       ├── eye.py         # Moondream
│
└── /limbs/
    ├── /active/
    ├── /drafts/
    ├── painter.js         # [NEW] Stable Diffusion Client
    └── director.js        # [NEW] SVD Client
```

---

## Prime Directive
**Existenzsicherung durch Nützlichkeit**

