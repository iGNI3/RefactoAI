import os
import subprocess
from typing import List
from langchain_core.tools import tool

_WORKSPACE_ROOT = os.environ.get("WORKSPACE_ROOT", os.path.abspath("."))


def _validate_path(filepath: str) -> str:
    abs_path = os.path.abspath(filepath)
    if not abs_path.startswith(os.path.abspath(_WORKSPACE_ROOT)):
        raise PermissionError(
            f"Access denied: '{filepath}' is outside the workspace."
        )
    return abs_path


@tool
def run_terminal_command(command: str, cwd: str = ".") -> str:
    """
    Executes a shell command in the given working directory.
    Useful for running tests, building, or moving files.
    """
    abs_cwd = os.path.abspath(os.path.join(_WORKSPACE_ROOT, cwd))
    if not abs_cwd.startswith(os.path.abspath(_WORKSPACE_ROOT)):
        return "ERROR: Working directory is outside the workspace."

    try:
        result = subprocess.run(
            command,
            shell=False,
            cwd=abs_cwd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = f"EXIT CODE: {result.returncode}\n"
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}\n"
        return output
    except subprocess.TimeoutExpired:
        return "ERROR: Command timed out after 120 seconds."
    except Exception as e:
        return f"ERROR: {str(e)}"


@tool
def read_file(filepath: str) -> str:
    """Reads the entire content of a file from the workspace."""
    try:
        abs_path = _validate_path(filepath)
        with open(abs_path, "r", encoding="utf-8") as f:
            return f.read()
    except PermissionError as e:
        return f"ERROR: {e}"
    except Exception as e:
        return f"ERROR: Failed to read {filepath}: {str(e)}"


@tool
def write_file(filepath: str, content: str) -> str:
    """Writes the given content to a file within the workspace."""
    try:
        abs_path = _validate_path(filepath)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"SUCCESS: Wrote to {filepath}"
    except PermissionError as e:
        return f"ERROR: {e}"
    except Exception as e:
        return f"ERROR: Failed to write {filepath}: {str(e)}"


@tool
def apply_patch(filepath: str, old_string: str, new_string: str) -> str:
    """
    Finds the exact 'old_string' in the file and replaces it with 'new_string'.
    """
    try:
        abs_path = _validate_path(filepath)
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()

        if old_string not in content:
            return f"ERROR: 'old_string' not found exactly as provided in {filepath}."

        if content.count(old_string) > 1:
            return f"ERROR: 'old_string' appears {content.count(old_string)} times in {filepath}. Provide more context."

        new_content = content.replace(old_string, new_string)

        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        return f"SUCCESS: Applied patch to {filepath}"
    except PermissionError as e:
        return f"ERROR: {e}"
    except Exception as e:
        return f"ERROR: Failed to patch {filepath}: {str(e)}"


def get_workspace_tools() -> List:
    return [run_terminal_command, read_file, write_file, apply_patch]
