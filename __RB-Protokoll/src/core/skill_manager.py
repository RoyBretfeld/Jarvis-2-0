import os
import yaml
from dataclasses import dataclass
from typing import List, Optional, Dict

@dataclass
class Skill:
    name: str
    description: str
    path: str
    instructions: str
    metadata: Dict

class SkillManager:
    """
    Manages the discovery and loading of Antigravity Skills.
    Skills are directory-based with a SKILL.md definition file.
    """
    
    def __init__(self, skills_dir: str = "skills"):
        # Resolve absolute path relative to project root if needed
        # Assuming run from project root, or we can make this more robust
        self.skills_dir = os.path.abspath(skills_dir)

    def discover_skills(self) -> List[Skill]:
        """Scans the skills directory for valid SKILL.md files."""
        found_skills = []
        
        if not os.path.exists(self.skills_dir):
            return []

        for item in os.listdir(self.skills_dir):
            skill_path = os.path.join(self.skills_dir, item)
            if os.path.isdir(skill_path):
                skill_def = os.path.join(skill_path, "SKILL.md")
                if os.path.exists(skill_def):
                    skill = self._parse_skill(skill_def)
                    if skill:
                        found_skills.append(skill)
        
        return found_skills

    def _parse_skill(self, file_path: str) -> Optional[Skill]:
        """Parses a SKILL.md file with YAML frontmatter."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Split frontmatter and content
            if content.startswith('---'):
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    frontmatter_raw = parts[1]
                    markdown_body = parts[2]
                    
                    metadata = yaml.safe_load(frontmatter_raw)
                    return Skill(
                        name=metadata.get('name', 'Unknown Skill'),
                        description=metadata.get('description', 'No description'),
                        path=os.path.dirname(file_path),
                        instructions=markdown_body.strip(),
                        metadata=metadata
                    )
            return None
        except Exception as e:
            print(f"Error parsing skill at {file_path}: {e}")
            return None
