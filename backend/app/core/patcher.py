"""
Unified Diff Applicator, Sandbox Workspace, and PatchPilot Loop.

Manages sandboxed file modifications, validates path boundaries,
enforces diff budgets, and runs self-correction loops.

Milestone 6
"""

import os
import subprocess
from typing import Tuple


class SandboxedPatchPilot:
    """
    Manages secure workspace modifications, enforces diff budgets,
    and runs self-correction loops on syntax failures.
    """

    def __init__(
        self, workspace_directory: str, max_changed_lines_budget: int = 120
    ):
        self.workspace_root = os.path.abspath(workspace_directory)
        self.max_changed_lines_budget = max_changed_lines_budget
        if not os.path.exists(self.workspace_root):
            os.makedirs(self.workspace_root)

    def verify_workspace_boundary(self, relative_file_path: str) -> str:
        """
        Checks file paths against the workspace root to prevent
        directory traversal exploits.
        """
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
        """
        Counts the modified lines in a unified diff block, excluding meta headers.
        """
        line_count = 0
        for line in unified_diff_raw.splitlines():
            # Match additions and deletions while skipping unified diff headers
            if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
                line_count += 1
        return line_count

    def apply_diff_patch(
        self, target_relative_path: str, unified_diff_content: str
    ) -> Tuple[bool, str]:
        """
        Applies a unified diff patch to a target file in the sandbox environment.
        """
        try:
            absolute_target_path = self.verify_workspace_boundary(
                target_relative_path
            )

            # Enforce the strict line modification budget
            lines_changed = self.calculate_changed_lines(unified_diff_content)
            if lines_changed > self.max_changed_lines_budget:
                return False, (
                    f"Line Budget Overrun: Modification requested {lines_changed} lines, "
                    f"exceeding target budget limits of {self.max_changed_lines_budget} lines."
                )

            # Create the file if it does not exist
            target_dir = os.path.dirname(absolute_target_path)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            if not os.path.exists(absolute_target_path):
                with open(absolute_target_path, "w", encoding="utf-8") as f:
                    f.write("")

            # Write the unified diff to a temporary patch file
            temporary_patch_path = os.path.join(
                self.workspace_root, "changeset.patch"
            )
            with open(temporary_patch_path, "w", encoding="utf-8") as f:
                f.write(unified_diff_content)

            # Apply the patch using the system patch utility
            patch_execution_command = [
                "patch",
                "--forward",
                "--reject-file=-",
                absolute_target_path,
                temporary_patch_path,
            ]

            process_run = subprocess.run(
                patch_execution_command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=15,
            )

            # Clean up the temporary patch file
            if os.path.exists(temporary_patch_path):
                os.remove(temporary_patch_path)

            if process_run.returncode == 0:
                # Run post-patch syntax validation checks
                syntax_valid, syntax_error_msg = self.validate_syntax(
                    absolute_target_path
                )
                if not syntax_valid:
                    return False, f"Post-Patch Compilation Error: {syntax_error_msg}"
                return True, (
                    f"Successfully patched {target_relative_path} "
                    f"and verified syntax"
                )
            else:
                return False, (
                    f"Failed to apply patch: "
                    f"{process_run.stderr or process_run.stdout}"
                )

        except PermissionError as security_error:
            return False, str(security_error)
        except subprocess.TimeoutExpired:
            return False, "Failed to apply patch: patch utility timed out."
        except Exception as unexpected_error:
            return False, f"Unexpected patching exception: {str(unexpected_error)}"

    def validate_syntax(self, file_absolute_path: str) -> Tuple[bool, str]:
        """
        Validates Python syntax to catch potential compilation errors.
        """
        if not file_absolute_path.endswith(".py"):
            return True, "Syntax checks are skipped for non-python files."

        try:
            with open(file_absolute_path, "r", encoding="utf-8") as f:
                compile(f.read(), file_absolute_path, "exec")
            return True, "Syntax verified successfully"
        except SyntaxError as syntax_err:
            return False, f"Line {syntax_err.lineno}: {syntax_err.msg}"

    def run_workspace_verification_suite(
        self, test_trigger_command: str
    ) -> Tuple[bool, str]:
        """
        Runs automated test suites to verify system behavior.
        """
        try:
            process_run = subprocess.run(
                test_trigger_command,
                shell=True,
                cwd=self.workspace_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=30,
            )
            if process_run.returncode == 0:
                return True, "All tests passed successfully"
            else:
                return False, (
                    f"Test Suite Failed: {process_run.stdout}\n{process_run.stderr}"
                )
        except subprocess.TimeoutExpired:
            return False, "Test suite execution timed out."
        except Exception as err:
            return False, f"Failed to execute verification suite: {str(err)}"
