import unittest
import os
import sys
import shutil

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from body.context_manager import ContextManager

class TestCoreLoop(unittest.TestCase):
    def setUp(self):
        # Create a temporary test environment
        self.test_dir = os.path.join(os.path.dirname(__file__), "test_env")
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        os.makedirs(self.test_dir)
        
        # Setup mock brain
        self.brain_dir = os.path.join(self.test_dir, "brain")
        os.makedirs(self.brain_dir)
        
        with open(os.path.join(self.brain_dir, "SOUL.md"), "w") as f:
            f.write("I am a Test Unit.")
            
        with open(os.path.join(self.brain_dir, "MEMORY.md"), "w") as f:
            f.write("Initial Memory.")

        self.ctx = ContextManager(self.test_dir)

    def tearDown(self):
        # Cleanup
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_load_context(self):
        """Test if SOUL and MEMORY are loaded correctly."""
        context = self.ctx.load_context()
        self.assertEqual(context["soul"], "I am a Test Unit.")
        self.assertEqual(context["memory"], "Initial Memory.")

    def test_write_back(self):
        """Test if new information is written to MEMORY.md."""
        new_info = "Learned something new."
        self.ctx.update_memory(new_info)
        
        # Reload to verify
        with open(os.path.join(self.brain_dir, "MEMORY.md"), "r") as f:
            content = f.read()
            
        self.assertIn(new_info, content)
        self.assertIn("Initial Memory.", content)

if __name__ == "__main__":
    unittest.main()
