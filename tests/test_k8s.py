import unittest
from unittest.mock import patch, MagicMock
import subprocess
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from body.limbs.k8s import K8sLimb

class TestK8s(unittest.TestCase):
    def setUp(self):
        # We need to patch the connection check in __init__
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            self.limb = K8sLimb()
            self.limb.connected = True # Force connection for tests

    @patch("subprocess.check_output")
    def test_health_check_healthy(self, mock_output):
        """Test parsing of healthy cluster output."""
        # Mock Nodes
        mock_nodes = "node-1 Ready\nnode-2 Ready"
        # Mock Pods
        mock_pods = "default pod-1 1/1 Running 0 1d\nkube-system pod-2 1/1 Running 0 1d"
        
        mock_output.side_effect = [nodes_out, pods_out] if 'nodes_out' in locals() else [mock_nodes, mock_pods]
        
        status = self.limb.get_cluster_health()
        self.assertIn("Nodes: 2 (OK)", status)
        self.assertIn("All Pods Normal", status)

    @patch("subprocess.check_output")
    def test_health_check_issues(self, mock_output):
        """Test parsing of problematic cluster output."""
        mock_nodes = "node-1 Ready"
        # Mock Pods with one CrashLoopBackOff
        mock_pods = "default high-restart-pod 1/1 Running 10 1d\ndefault crash-pod 0/1 CrashLoopBackOff 5 1d"
        
        mock_output.side_effect = [mock_nodes, mock_pods]
        
        status = self.limb.get_cluster_health()
        self.assertIn("Issues:", status)
        self.assertIn("crash-pod(CrashLoopBackOff)", status)
        self.assertIn("high-restart-pod(HighRestarts:10)", status)

    def test_safety_check(self):
        """Test if dangerous commands are blocked."""
        blocked = self.limb.execute_command("delete pod nginx")
        self.assertIn("SAFETY INTERVENTION", blocked)
        
    @patch("subprocess.check_output")
    def test_execute_command(self, mock_output):
        """Test execution of allowed commands."""
        mock_output.return_value = "pod-1\npod-2"
        result = self.limb.execute_command("get pods")
        self.assertIn("✅ Output:", result)
        self.assertIn("pod-1", result)

    @patch("subprocess.check_output")
    def test_get_service_health(self, mock_output):
        """Test parsing of service endpoints."""
        # Case 1: All Healthy
        mock_output.return_value = "default svc-1 10.0.0.1:80 1d\nkube-system svc-2 10.0.0.2:80 1d"
        status = self.limb.get_service_health()
        self.assertIn("All Healthy", status)

        # Case 2: Broken Service
        mock_output.return_value = "default broken-svc <none> 1d"
        status = self.limb.get_service_health()
        self.assertIn("CRITICAL", status)
        self.assertIn("broken-svc", status)

if __name__ == "__main__":
    unittest.main()
