"""Unit tests for path_resolver utility"""

import pytest
from pathlib import Path
from src.utils.path_resolver import (
    get_project_root,
    resolve_body_path,
    resolve_brain_path,
    resolve_config_path,
    normalize_path,
    make_relative,
    ensure_directory_exists,
    get_path_size,
)


class TestGetProjectRoot:
    """Test project root detection"""

    def test_find_project_root(self):
        """Should find project root from anywhere"""
        root = get_project_root()
        assert root.exists()
        assert (root / "src").exists()
        assert (root / "config").exists()

    def test_project_root_is_absolute(self):
        """Project root should be absolute path"""
        root = get_project_root()
        assert root.is_absolute()

    def test_project_root_from_subdirectory(self):
        """Should find root from src/ subdirectory"""
        src_dir = Path.cwd() / "src"
        if src_dir.exists():
            root = get_project_root(src_dir)
            assert root.exists()


class TestResolvePaths:
    """Test directory path resolution"""

    def test_resolve_body_path(self):
        """Should resolve body/ directory"""
        body = resolve_body_path()
        assert body.exists()
        assert body.name == "body"

    def test_resolve_brain_path(self):
        """Should resolve brain/ directory"""
        brain = resolve_brain_path()
        assert brain.exists()
        assert brain.name == "brain"

    def test_resolve_config_path(self):
        """Should resolve config/ directory"""
        config = resolve_config_path()
        assert config.exists()
        assert config.name == "config"

    def test_paths_are_absolute(self):
        """All resolved paths should be absolute"""
        assert resolve_body_path().is_absolute()
        assert resolve_brain_path().is_absolute()
        assert resolve_config_path().is_absolute()


class TestNormalizePath:
    """Test path normalization"""

    def test_normalize_string_path(self):
        """Should convert string to Path"""
        path = normalize_path("./body")
        assert isinstance(path, Path)
        assert path.is_absolute()

    def test_normalize_path_object(self):
        """Should handle Path objects"""
        original = Path("./body")
        normalized = normalize_path(original)
        assert isinstance(normalized, Path)
        assert normalized.is_absolute()

    def test_normalize_relative_path(self):
        """Should convert relative paths to absolute"""
        rel = "./tests/unit"
        norm = normalize_path(rel)
        assert norm.is_absolute()

    def test_normalize_resolves_symlinks(self):
        """Should resolve path fully"""
        path = normalize_path(".")
        assert path == path.resolve()


class TestMakeRelative:
    """Test making paths relative"""

    def test_make_relative_to_project(self):
        """Should make path relative to project root"""
        body = resolve_body_path()
        rel = make_relative(body)
        assert rel.parts[-1] == "body"

    def test_make_relative_to_base(self):
        """Should make path relative to specified base"""
        config = resolve_config_path()
        root = get_project_root()
        rel = make_relative(config, root)
        assert str(rel) == "config"

    def test_make_relative_handles_files(self):
        """Should work with files too"""
        src_file = Path.cwd() / "src" / "main.py"
        rel = make_relative(src_file)
        assert "src" in rel.parts
        assert "main.py" in rel.parts


class TestEnsureDirectoryExists:
    """Test directory creation"""

    def test_ensure_existing_directory(self, tmp_path):
        """Should return existing directory unchanged"""
        test_dir = tmp_path / "test"
        test_dir.mkdir()
        result = ensure_directory_exists(test_dir)
        assert result.exists()
        assert result == test_dir.resolve()

    def test_ensure_creates_new_directory(self, tmp_path):
        """Should create non-existent directories"""
        new_dir = tmp_path / "new" / "nested" / "dir"
        assert not new_dir.exists()
        result = ensure_directory_exists(new_dir)
        assert result.exists()
        assert result.is_dir()

    def test_ensure_returns_resolved_path(self, tmp_path):
        """Should return absolute, resolved path"""
        test_dir = tmp_path / "test"
        result = ensure_directory_exists(test_dir)
        assert result.is_absolute()
        assert result == result.resolve()


class TestGetPathSize:
    """Test file/directory size calculation"""

    def test_size_of_file(self, tmp_path):
        """Should calculate file size"""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello World")  # 11 bytes
        size = get_path_size(test_file)
        assert size == 11

    def test_size_of_empty_directory(self, tmp_path):
        """Should return 0 for empty directory"""
        test_dir = tmp_path / "empty"
        test_dir.mkdir()
        size = get_path_size(test_dir)
        assert size == 0

    def test_size_of_directory_with_files(self, tmp_path):
        """Should sum all file sizes in directory"""
        test_dir = tmp_path / "files"
        test_dir.mkdir()
        (test_dir / "file1.txt").write_text("12345")  # 5 bytes
        (test_dir / "file2.txt").write_text("67890")  # 5 bytes
        size = get_path_size(test_dir)
        assert size == 10

    def test_size_handles_nested_files(self, tmp_path):
        """Should include nested files"""
        test_dir = tmp_path / "nested"
        test_dir.mkdir()
        (test_dir / "sub").mkdir()
        (test_dir / "file1.txt").write_text("12")  # 2 bytes
        (test_dir / "sub" / "file2.txt").write_text("34")  # 2 bytes
        size = get_path_size(test_dir)
        assert size == 4
