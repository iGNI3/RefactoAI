import os
import asyncio
from app.parser.ast_chunker import ASTCodeChunker
from app.parser.document_loader import CodebaseLoader
from app.core.orchestrator import UnifiedModelRouter
from app.mcp.client_manager import MCPMultiServerManager
from app.core.patcher import SandboxedPatchPilot

def test_ast_chunker():
    chunker = ASTCodeChunker(target_chunk_size=500)
    sample = '''
class Calculator:
    def add(self, a, b):
        return a + b
    def subtract(self, a, b):
        return a - b
    '''
    chunks = chunker.generate_syntax_chunks(sample)
    assert len(chunks) > 0, "No chunks generated"
    for chunk in chunks:
        assert "content" in chunk
        assert "metadata" in chunk
        assert chunk["metadata"]["start_line"] >= 1
        assert len(chunk["content"]) > 15, f"Trivial fragment: {chunk['content']}"
        assert chunk["content"].strip() != ""
    print(f"[OK] ASTChunker: Generated {len(chunks)} syntax-aware chunks")

def test_document_loader():
    loader = CodebaseLoader(workspace_root="./app", extensions=[".py"])
    files = loader.discover_source_files()
    assert len(files) >= 3
    all_chunks = loader.load_and_chunk_all()
    assert len(all_chunks) > 0
    print(f"[OK] CodebaseLoader: Discovered {len(files)} files -> {len(all_chunks)} chunks")



def test_orchestrator():
    router = UnifiedModelRouter()
    test_msgs = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi", "reasoning_content": "internal thought"}
    ]
    sanitized = router.sanitize_history_for_provider(test_msgs, "deepseek")
    assert "reasoning_content" not in sanitized[1]
    lc_msgs = router.parse_langchain_history([{"role": "system", "content": "You are helpful"}])
    assert lc_msgs[0].__class__.__name__ == "SystemMessage"
    print("[OK] Orchestrator: sanitization and parsing verified")

def test_patcher():
    pilot = SandboxedPatchPilot("./test_sandbox", max_changed_lines_budget=120)
    try:
        pilot.verify_workspace_boundary("../../etc/passwd")
        assert False, "Should have raised PermissionError"
    except PermissionError:
        pass
    
    big_diff = "\n".join([f"+line{i}" for i in range(200)])
    count = pilot.calculate_changed_lines(big_diff)
    assert count == 200
    
    test_file = os.path.join(pilot.workspace_root, "valid.py")
    with open(test_file, "w") as f:
        f.write("x = 1 + 2\n")
    valid, msg = pilot.validate_syntax(test_file)
    assert valid
    
    bad_file = os.path.join(pilot.workspace_root, "broken.py")
    with open(bad_file, "w") as f:
        f.write("def foo(\n")
    valid, msg = pilot.validate_syntax(bad_file)
    assert not valid
    print("[OK] Patcher: verified path boundary, budget, and syntax")

if __name__ == "__main__":
    os.environ["OPENAI_API_KEY"] = "sk-test"
    test_ast_chunker()
    test_document_loader()
    test_orchestrator()
    test_patcher()
    print("ALL TESTS PASSED!")
