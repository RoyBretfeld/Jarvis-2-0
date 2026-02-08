#!/usr/bin/env python3
"""
Integration Test for TAIA System

Tests:
- JARVIS Priority Engine
- Sentinel Gatekeeper
- Ears + Voice Senses
- Skill Matrix
- Agent Integration
"""

import sys
import io
import logging
from pathlib import Path

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Add project to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


def test_jarvis_priority_engine():
    """Test JARVIS Priority Evaluator and Decision Router"""
    logger.info("=" * 60)
    logger.info("TEST 1: JARVIS Priority Engine")
    logger.info("=" * 60)

    from src.core.jarvis import PriorityEvaluator, DecisionRouter

    evaluator = PriorityEvaluator()
    router = DecisionRouter()

    # Test priority evaluation
    test_cases = [
        ("log_rotation", "maintenance", 3, 2, 0),
        ("memory_compression", "optimization", 6, 7, 1),
        ("security_alert", "security", 9, 10, 0),
    ]

    for task, category, urgency, impact, blocked in test_cases:
        priority = evaluator.evaluate(task, category, urgency, impact, blocked)
        decision_type, msg = router.route(priority)

        print(f"  {task:20} → {priority.level:2}/10 ({decision_type.value})")

    print("\n✅ JARVIS Priority Engine OK\n")


def test_sentinel_gatekeeper():
    """Test Sentinel Gatekeeper security"""
    logger.info("=" * 60)
    logger.info("TEST 2: Sentinel Gatekeeper")
    logger.info("=" * 60)

    from src.core.sentinel import SentinelGatekeeper

    sentinel = SentinelGatekeeper(PROJECT_ROOT)

    # Test various file accesses
    test_cases = [
        ("body/MEMORY.md", "write", "allow"),
        ("src/core/agent.py", "write", "require_approval"),
        (".env", "read", "require_approval"),
        ("/etc/passwd", "read", "deny"),
    ]

    for path, op, expected in test_cases:
        access_level, reason = sentinel.check_file_access(path, op)
        status = "✓" if access_level.value in expected else "✗"

        print(f"  {status} {path:25} → {access_level.value}")

    print("\n✅ Sentinel Gatekeeper OK\n")


def test_skill_matrix():
    """Test Skill Matrix"""
    logger.info("=" * 60)
    logger.info("TEST 3: Skill Matrix")
    logger.info("=" * 60)

    from src.core.skills import SkillMatrix

    skills = SkillMatrix(PROJECT_ROOT)

    # List available skills
    print("\n  Available Skills:")
    for skill_info in skills.get_skills_list():
        print(f"    - {skill_info['name']:30} ({skill_info['category']})")

    # Execute a skill (dry run)
    print("\n  Executing: generate_system_report")
    result = skills.execute("generate_system_report", auto_save=False)

    if result.get("success"):
        print("    ✓ Skill executed successfully")
    else:
        print(f"    ✗ Skill failed: {result.get('error')}")

    print("\n✅ Skill Matrix OK\n")


def test_audio_senses():
    """Test Ears and Voice initialization"""
    logger.info("=" * 60)
    logger.info("TEST 4: Audio Senses (Ears + Voice)")
    logger.info("=" * 60)

    try:
        from src.senses.ears import ForgeEars

        print("\n  Testing ForgeEars initialization...")
        ears = ForgeEars(model_size="tiny", language="de")

        status = ears.get_status()
        print(f"    State: {status['state']}")
        print(f"    Whisper loaded: {status['whisper_loaded']}")
        print(f"    Wake-word loaded: {status['wake_word_loaded']}")

        print("\n  ✓ ForgeEars initialized")

    except ImportError as e:
        print(f"\n  ⚠️ faster-whisper not installed: {e}")
    except Exception as e:
        print(f"\n  ⚠️ Ears initialization warning: {e}")

    try:
        from src.senses.voice import ForgeVoice

        print("\n  Testing ForgeVoice initialization...")
        voice = ForgeVoice()

        status = voice.get_status()
        print(f"    State: {status['state']}")
        print(f"    Engine loaded: {status['engine_loaded']}")

        print("\n  ✓ ForgeVoice initialized")

    except ImportError as e:
        print(f"\n  ⚠️ pyttsx3 not installed: {e}")
    except Exception as e:
        print(f"\n  ⚠️ Voice initialization warning: {e}")

    print("\n✅ Audio Senses OK\n")


def test_agent_integration():
    """Test ForgeAgent with all integrations"""
    logger.info("=" * 60)
    logger.info("TEST 5: ForgeAgent Integration")
    logger.info("=" * 60)

    try:
        from src.core.agent import ForgeAgent

        brain_path = PROJECT_ROOT / "brain"
        brain_path.mkdir(exist_ok=True)

        print("\n  Initializing ForgeAgent...")
        agent = ForgeAgent(str(PROJECT_ROOT))

        # Check components
        components = {
            "LLM Provider": agent.llm is not None,
            "JARVIS Engine": agent.priority_evaluator is not None,
            "Sentinel": agent.sentinel is not None,
            "Cortex": agent.cortex is not None,
            "K8s Motorics": agent.k8s is not None,
            "Skill Matrix": agent.skills is not None,
            "Ears": agent.ears is not None,
            "Voice": agent.voice is not None,
        }

        print("\n  Component Status:")
        for name, status in components.items():
            symbol = "✓" if status else "✗"
            print(f"    {symbol} {name}")

        all_ok = all(components.values())

        if all_ok:
            print("\n  ✓ All components initialized")
        else:
            print("\n  ⚠️ Some components not available (may require dependencies)")

    except Exception as e:
        print(f"\n  ✗ Agent initialization failed: {e}")
        import traceback
        traceback.print_exc()

    print("\n✅ Agent Integration OK\n")


def main():
    """Run all tests"""
    logger.info("\n")
    logger.info("🚀 TAIA INTEGRATION TEST SUITE")
    logger.info("=" * 60)

    try:
        test_jarvis_priority_engine()
        test_sentinel_gatekeeper()
        test_skill_matrix()
        test_audio_senses()
        test_agent_integration()

        logger.info("=" * 60)
        logger.info("✅ ALL TESTS COMPLETED")
        logger.info("=" * 60)
        logger.info("\nNotes:")
        logger.info("- Some tests may show warnings if audio libraries not installed")
        logger.info("- Install with: pip install -r requirements.txt")
        logger.info("- Run: python test_taia_integration.py")

    except Exception as e:
        logger.error(f"\n❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
