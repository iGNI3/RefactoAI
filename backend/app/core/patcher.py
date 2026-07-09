"""
Unified Diff Applicator, Sandbox Workspace, and PatchPilot Loop.
"""

import os
import subprocess
import shutil
import tempfile
from typing import Tuple

from app.core.logger import logger


class SandboxedPatchPilot:
    def __init__(self, workspace_directory: str, max_changed_lines_budget: int = 120):
        self.workspace_root = os.path.abspath(workspace_directory)
        self.max_changed_lines_budget = max_changed_lines_budget
        os.makedirs(self.workspace_root, exist_ok=True)

    def verify_workspace_boundary(self, relative_file_path: str) -> str:
        absolute_target_path = os.path.abspath(
            os.path.join(self.workspace_root, relative_file_path)
        )
        if not absolute_target_path.startswith(self.workspace_root):
            raise PermissionError(
                f"Security Violation: Target path '{absolute_target_path}' "
                f"lies outside authorized workspace root '{self.workspace_root}'"
            )
        return absolute_target_path

    def calculate_changed_lines(self, unified_diff_raw: str) -> int:
        line_count = 0
        for line in unified_diff_raw.splitlines():
            if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
                line_count += 1
        return line_count

    def apply_diff_patch(
        self, target_relative_path: str, unified_diff_content: str
    ) -> Tuple[bool, str]:
        backup_path = None
        try:
            absolute_target_path = self.verify_workspace_boundary(target_relative_path)

            lines_changed = self.calculate_changed_lines(unified_diff_content)
            if lines_changed > self.max_changed_lines_budget:
                return (
                    False,
                    f"Line Budget Overrun: {lines_changed} lines requested, "
                    f"max is {self.max_changed_lines_budget}.",
                )

            target_dir = os.path.dirname(absolute_target_path)
            os.makedirs(target_dir, exist_ok=True)

            if os.path.exists(absolute_target_path):
                backup_path = absolute_target_path + ".bak"
                shutil.copy2(absolute_target_path, backup_path)

            if not os.path.exists(absolute_target_path):
                with open(absolute_target_path, "w", encoding="utf-8") as f:
                    f.write("")

            with open(absolute_target_path, "r", encoding="utf-8") as f:
                original_lines = f.readlines()

            import whatthepatch

            patches = list(whatthepatch.parse_patch(unified_diff_content))
            if not patches:
                return False, "No valid patch hunks found."

            patched_lines = original_lines
            for patch in patches:
                if patch.changes:
                    patched_lines = whatthepatch.apply_diff(
                        patch, "".join(patched_lines)
                    ).splitlines(keepends=True)

            with open(absolute_target_path, "w", encoding="utf-8") as f:
                f.writelines(patched_lines)

            syntax_valid, syntax_error_msg = self.validate_syntax(absolute_target_path)
            if not syntax_valid:
                self._restore_backup(absolute_target_path, backup_path)
                return False, f"Post-Patch Compilation Error: {syntax_error_msg}"

            self._cleanup_backup(backup_path)
            return True, f"Successfully patched {target_relative_path}"

        except PermissionError as e:
            return False, str(e)
        except Exception as e:
            self._restore_backup(
                os.path.join(self.workspace_root, target_relative_path), backup_path
            )
            logger.exception(f"Patch failed for {target_relative_path}")
            return False, f"Unexpected patching exception: {str(e)}"

    def _restore_backup(self, original_path: str, backup_path: str | None):
        if backup_path and os.path.exists(backup_path):
            shutil.move(backup_path, original_path)

    def _cleanup_backup(self, backup_path: str | None):
        if backup_path and os.path.exists(backup_path):
            os.remove(backup_path)

    def validate_syntax(self, file_absolute_path: str) -> Tuple[bool, str]:
        if not file_absolute_path.endswith(".py"):
            return True, "Syntax checks are skipped for non-python files."
        try:
            with open(file_absolute_path, "r", encoding="utf-8") as f:
                compile(f.read(), file_absolute_path, "exec")
            return True, "Syntax verified successfully"
        except SyntaxError as e:
            return False, f"Line {e.lineno}: {e.msg}"

    def run_workspace_verification_suite(
        self, test_trigger_command: str
    ) -> Tuple[bool, str]:
        try:
            cmd_parts = test_trigger_command.split()
            process_run = subprocess.run(
                cmd_parts,
                cwd=self.workspace_root,
                capture_output=True,
                text=True,
                timeout=30,
            )
            if process_run.returncode == 0:
                return True, "All tests passed successfully"
            else:
                return (
                    False,
                    f"Test Suite Failed:\n{process_run.stdout}\n{process_run.stderr}",
                )
        except subprocess.TimeoutExpired:
            return False, "Test suite execution timed out."
        except Exception as e:
            return False, f"Failed to execute verification suite: {str(e)}"
