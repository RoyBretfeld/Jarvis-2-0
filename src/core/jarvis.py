"""
JARVIS Priority Engine - The Decision-Making Core of TAIA

Implements dynamic priority evaluation (1-10 scale) and autonomous decision-making:
- 1-4: Silent housekeeping (autonomous, logged)
- 5-9: Proactive suggestions (wait for confirmation)
- 10: Critical alerts (immediate interrupt)

The engine learns from user feedback and adjusts future priorities.
"""

import logging
import json
import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class PriorityLevel(Enum):
    """JARVIS Priority Levels"""
    BACKGROUND = "1-4"  # Silent housekeeping
    NORMAL = "5-7"      # Standard operations
    IMPORTANT = "8-9"   # Proactive suggestions
    CRITICAL = "10"     # Immediate action


class DecisionType(Enum):
    """How JARVIS decides to act"""
    AUTONOMOUS = "autonomous"      # Execute silently (1-4)
    SUGGEST = "suggest"            # Propose and wait (5-9)
    INTERRUPT = "interrupt"        # Critical alert (10)


@dataclass
class Priority:
    """Priority evaluation result"""
    task: str
    level: int  # 1-10
    category: str  # e.g., "memory", "security", "optimization"
    confidence: float  # 0.0-1.0
    rationale: str
    decision_type: DecisionType

    def __post_init__(self):
        """Determine decision type from priority level"""
        if self.level <= 4:
            self.decision_type = DecisionType.AUTONOMOUS
        elif self.level <= 9:
            self.decision_type = DecisionType.SUGGEST
        else:
            self.decision_type = DecisionType.INTERRUPT


@dataclass
class FeedbackEntry:
    """User feedback on JARVIS decisions"""
    task: str
    priority_level: int
    decision_type: str
    user_action: str  # "accepted", "rejected", "ignored"
    timestamp: str
    adjustment: float = 0.0  # -1.0 to +1.0 (lower/raise priority)


class PriorityEvaluator:
    """
    Evaluates situations and assigns priorities (1-10)

    Scoring factors:
    - Urgency (time-critical?)
    - Impact (affects core functionality?)
    - Frequency (how often?)
    - Dependencies (blocks other tasks?)
    """

    # Default priority ranges for common tasks
    PRIORITY_MATRIX = {
        "log_rotation": 2,           # Silent housekeeping
        "duplicate_removal": 2,      # Background cleanup
        "memory_compression": 5,     # Suggest after threshold
        "sentinel_check": 6,         # Regular security
        "system_optimization": 5,    # Suggest improvement
        "error_recovery": 8,         # Important issue
        "security_alert": 10,        # Critical
        "resource_exhaustion": 10,   # Critical
        "user_input": 7,             # Important (requires response)
    }

    def __init__(self, feedback_file: Optional[Path] = None):
        """
        Initialize Priority Evaluator

        Args:
            feedback_file: Path to persistent feedback history
        """
        self.feedback_file = feedback_file
        self.feedback_history: List[FeedbackEntry] = []
        self.priority_adjustments: Dict[str, float] = {}  # Learning adjustments

        if self.feedback_file and self.feedback_file.exists():
            self._load_feedback_history()

    def evaluate(
        self,
        task: str,
        category: str,
        urgency: int = 5,  # 1-10
        impact: int = 5,   # 1-10
        blocked_count: int = 0,  # How many tasks blocked?
        context: Optional[str] = None,
    ) -> Priority:
        """
        Evaluate a task's priority

        Args:
            task: Task name
            category: Category (memory, security, optimization, etc.)
            urgency: How time-critical? (1-10)
            impact: How much does it affect system? (1-10)
            blocked_count: How many tasks waiting on this?
            context: Additional context for evaluation

        Returns:
            Priority object with level, decision type, etc.
        """
        # Base priority from matrix
        base_priority = self.PRIORITY_MATRIX.get(task, 5)

        # Adjust based on factors
        priority = base_priority
        priority += (urgency - 5) * 0.3  # Urgency adjustment
        priority += (impact - 5) * 0.2   # Impact adjustment
        priority += blocked_count * 0.5  # Blocking adjustment

        # Apply learned adjustments
        adjustment = self.priority_adjustments.get(task, 0.0)
        priority += adjustment

        # Clamp to 1-10
        priority = max(1, min(10, round(priority)))

        # Calculate confidence (how sure are we?)
        confidence = 0.7 + (0.3 * min(impact, urgency) / 10)

        # Build rationale
        rationale = self._build_rationale(
            task, base_priority, urgency, impact, blocked_count, adjustment
        )

        result = Priority(
            task=task,
            level=priority,
            category=category,
            confidence=confidence,
            rationale=rationale,
            decision_type=DecisionType.AUTONOMOUS,  # Will be set by __post_init__
        )

        logger.info(
            f"📊 Priority evaluated: {task} → {priority}/10 ({result.decision_type.value})"
        )

        return result

    def _build_rationale(
        self,
        task: str,
        base: int,
        urgency: int,
        impact: int,
        blocked: int,
        adjustment: float,
    ) -> str:
        """Build explanation for priority level"""
        parts = [f"Base: {base}"]

        if urgency > 5:
            parts.append(f"Urgent (+{urgency - 5})")
        if impact > 5:
            parts.append(f"High Impact (+{impact - 5})")
        if blocked > 0:
            parts.append(f"Blocks {blocked} tasks")
        if adjustment != 0:
            parts.append(f"Learned adjustment ({adjustment:+.1f})")

        return " | ".join(parts)

    def record_feedback(
        self,
        task: str,
        priority_level: int,
        decision_type: str,
        user_action: str,  # "accepted", "rejected", "ignored"
    ) -> float:
        """
        Record user feedback and learn from it

        Args:
            task: Task name
            priority_level: Original priority level
            decision_type: Original decision type
            user_action: How user responded

        Returns:
            Adjustment delta (-1.0 to +1.0)
        """
        entry = FeedbackEntry(
            task=task,
            priority_level=priority_level,
            decision_type=decision_type,
            user_action=user_action,
            timestamp=datetime.datetime.now().isoformat(),
        )

        self.feedback_history.append(entry)

        # Learn from feedback
        adjustment = 0.0

        if user_action == "rejected" and decision_type == "suggest":
            # User rejected suggestion → lower priority for future
            adjustment = -0.3
            logger.info(f"📉 Learning: {task} too aggressive, lowering priority")

        elif user_action == "accepted" and decision_type == "suggest":
            # User accepted suggestion → might raise in future
            adjustment = +0.1
            logger.info(f"📈 Learning: {task} useful suggestion, slight raise")

        elif user_action == "ignored":
            # User ignored multiple times → significantly lower
            adjustment = -0.5
            logger.info(f"📉 Learning: {task} ignored, significantly lowering")

        # Apply adjustment
        if task not in self.priority_adjustments:
            self.priority_adjustments[task] = 0.0

        self.priority_adjustments[task] += adjustment
        self.priority_adjustments[task] = max(-1.0, min(1.0, self.priority_adjustments[task]))

        # Persist
        self._save_feedback_history()

        return adjustment

    def _load_feedback_history(self):
        """Load historical feedback"""
        try:
            if self.feedback_file.exists():
                with open(self.feedback_file, "r") as f:
                    data = json.load(f)
                    for entry_dict in data.get("feedback", []):
                        entry = FeedbackEntry(**entry_dict)
                        self.feedback_history.append(entry)

                    self.priority_adjustments = data.get("adjustments", {})

                logger.info(f"✓ Loaded {len(self.feedback_history)} feedback entries")
        except Exception as e:
            logger.warning(f"Could not load feedback history: {e}")

    def _save_feedback_history(self):
        """Persist feedback history"""
        if not self.feedback_file:
            return

        try:
            self.feedback_file.parent.mkdir(parents=True, exist_ok=True)

            data = {
                "feedback": [asdict(e) for e in self.feedback_history],
                "adjustments": self.priority_adjustments,
                "last_updated": datetime.datetime.now().isoformat(),
            }

            with open(self.feedback_file, "w") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Could not save feedback history: {e}")


class DecisionRouter:
    """
    Routes decisions based on priority level

    - 1-4: Execute silently (autonomous)
    - 5-9: Propose and wait (suggest)
    - 10: Interrupt immediately (critical)
    """

    def __init__(self, on_suggest: Optional[callable] = None, on_critical: Optional[callable] = None):
        """
        Initialize Decision Router

        Args:
            on_suggest: Callback for suggestions (priority 5-9)
            on_critical: Callback for critical alerts (priority 10)
        """
        self.on_suggest = on_suggest
        self.on_critical = on_critical

    def route(self, priority: Priority) -> Tuple[DecisionType, str]:
        """
        Route decision based on priority

        Returns:
            Tuple of (DecisionType, action_message)
        """
        if priority.decision_type == DecisionType.AUTONOMOUS:
            msg = f"🤖 Executing autonomously: {priority.task} ({priority.level}/10)"
            logger.info(msg)
            return DecisionType.AUTONOMOUS, msg

        elif priority.decision_type == DecisionType.SUGGEST:
            msg = f"💡 Suggestion: {priority.task} ({priority.level}/10) - {priority.rationale}"
            logger.info(msg)

            if self.on_suggest:
                self.on_suggest(priority)

            return DecisionType.SUGGEST, msg

        elif priority.decision_type == DecisionType.INTERRUPT:
            msg = f"🚨 CRITICAL: {priority.task} ({priority.level}/10) - {priority.rationale}"
            logger.critical(msg)

            if self.on_critical:
                self.on_critical(priority)

            return DecisionType.INTERRUPT, msg

        return DecisionType.AUTONOMOUS, f"Unknown priority: {priority.level}"

    def get_status(self) -> dict:
        """Get router status"""
        return {
            "suggest_callback": self.on_suggest is not None,
            "critical_callback": self.on_critical is not None,
        }


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Create evaluator
    evaluator = PriorityEvaluator()

    # Evaluate some tasks
    tasks = [
        ("log_rotation", "maintenance", 3, 2, 0),
        ("memory_compression", "optimization", 6, 7, 1),
        ("security_alert", "security", 9, 10, 0),
    ]

    for task, category, urgency, impact, blocked in tasks:
        priority = evaluator.evaluate(task, category, urgency, impact, blocked)
        print(f"{priority.task}: {priority.level}/10 ({priority.decision_type.value})")

    # Test routing
    router = DecisionRouter()
    for task, category, urgency, impact, blocked in tasks:
        priority = evaluator.evaluate(task, category, urgency, impact, blocked)
        decision_type, msg = router.route(priority)
        print(f"  → {msg}")
