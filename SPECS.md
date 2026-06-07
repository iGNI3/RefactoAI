# **Engineering Specification and Product Requirements for an Autonomous Source Code Analysis and Refactoring Platform**

## **Product Requirements Document and Functional Specifications**

Software engineering teams face significant challenges when navigating, refactoring, and maintaining large, multi-language codebases.1 Standard static analysis tools often fail to capture deep structural contexts, while traditional retrieval-augmented generation architectures frequently degrade logical code components due to arbitrary text splitting.1 To address these limitations, this specification defines the requirements for an autonomous software engineering platform. The system leverages high-fidelity semantic indexing, multi-model execution routing, stateful Model Context Protocol (MCP) integrations, and sandboxed self-correction loops to analyze, diagnose, and refactor software systems safely.3

### **Target Performance Metrics**

To ensure enterprise-grade utility, the system must adhere to strict performance and operational parameters. These benchmarks guide the underlying indexing pipelines, model routing layers, and local workspaces.

| Metric Identifier | System Target Parameter | Target Performance Threshold | Measurement Method | Technical Dependencies |
| :---- | :---- | :---- | :---- | :---- |
| **MET-01** | Multi-Provider Dynamic Swapping Latency | ![][image1] routing overhead | Downstream HTTP call interceptor logs | Unified LLM Provider Router 7 |
| **MET-02** | Semantic Retrievals | ![][image2] index latency under 100K chunks | Nearest neighbor query search duration | ChromaDB with local HNSW indexing 4 |
| **MET-03** | Structural Chunking Completeness | ![][image3] syntax truncation across target languages | Abstract Syntax Tree validation loops | tree-sitter parser with cAST engine 1 |
| **MET-04** | Execution Sandboxing Isolation | ![][image4] filesystem isolation | Path boundary verification audits | Workspace container limits 6 |
| **MET-05** | Self-Correction Iteration Overhead | ![][image5] correction turns to resolve compilation errors | Multi-turn agent run execution tracking | PatchPilot refinement pipeline 5 |
| **MET-06** | UI Responsiveness & Scrub Frame Rate | Stable ![][image6] during video scrubbing | Browser rendering profiling tools | React requestAnimationFrame loop \[Prompt context\] |

### **System Requirements Matrix**

The platform is designed to unify multiple AI models, code search tools, and terminal interfaces into a single developer cockpit.

| Requirement ID | Module Component | Specification Details | Priority | Compliance Metric |
| :---- | :---- | :---- | :---- | :---- |
| **REQ-01** | Multi-Model Routing Engine | Implement a dynamic, provider-agnostic router supporting Anthropic, OpenAI, DeepSeek, Google GenAI, and local Ollama instances.3 | High | Seamless API key swap and immediate runtime model initialization.7 |
| **REQ-02** | MCP Multi-Server Client | Construct a connection manager capable of pooling multiple local stdio and remote WebSockets/HTTP MCP servers.3 | High | Successful tool harvesting and conversion to LangChain tool schemas.3 |
| **REQ-03** | cAST Chunking Pipeline | Replace standard text splitters with Abstract Syntax Tree (cAST) parsing to isolate cohesive classes, functions, and imports.1 | High | Maintenance of syntactical completeness of retrieved code snippets.2 |
| **REQ-04** | Sandboxed Execution Engine | Execute compilation, test suites, and linter runs inside secure, path-restricted temporary directories to prevent filesystem damage.6 | High | Rejection of any file operations targeting outside the defined workspace root.6 |
| **REQ-05** | PatchPilot Refactoring Loop | Implement an agentic self-correction loop that processes compiler feedback to generate clean, unified diff modifications.5 | High | Automated generation of syntactically correct code patches within line budgets.10 |
| **REQ-06** | Extended Thinking Control | Provide interface controls to toggle deep-thinking budgets (0 to 128K tokens) for models like Claude 3.7 Sonnet or DeepSeek R1.12 | Medium | Injection of structural thinking parameters in outbound model requests.18 |
| **REQ-07** | High-Fidelity Front-End Cockpit | Build a beige-themed, high-performance interface with interactive mouse-scrub video backgrounds and execution metrics \[Prompt context\]. | Medium | Fluid user interactions matching target frame-rate benchmarks \[Prompt context\]. |

The platform coordinates these components to manage the lifecycle of automated refactoring tasks. When an operator requests a codebase modification, the system retrieves relevant structural blocks, analyzes call graphs using MCP tools, schedules code edits via unified diff patches, verifies changes in a sandbox environment, and refines the solution if errors are detected.2

## **Architectural Design and Codebase Topography**

To ensure strict decoupling, scalability, and ease of maintainability, the platform is structured as a monorepo containing a high-performance Python back end and an interactive React front end. The back end hosts the cAST parser, local ChromaDB instances, and multi-server MCP sessions, while the front end provides real-time monitoring and controls.

### **Repository Topography**

/workspace-root  
├── /backend  
│   ├── /app  
│   │   ├── \_\_init\_\_.py  
│   │   ├── main.py                  \# FastAPI Application, routing and WebSocket setups  
│   │   ├── /config  
│   │   │   ├── \_\_init\_\_.py  
│   │   │   └── settings.py          \# Dynamic environment configuration  
│   │   ├── /core  
│   │   │   ├── \_\_init\_\_.py  
│   │   │   ├── orchestrator.py      \# LLM dynamic routing and thinking payload parser  
│   │   │   └── patcher.py           \# Unified diff applicator, sandbox workspace, PatchPilot loop  
│   │   ├── /mcp  
│   │   │   ├── \_\_init\_\_.py  
│   │   │   └── client\_manager.py    \# Persistent MCP multi-server pooling and sessions  
│   │   ├── /parser  
│   │   │   ├── \_\_init\_\_.py  
│   │   │   ├── ast\_chunker.py       \# tree-sitter integration & cAST split/merge engine  
│   │   │   └── document\_loader.py   \# Code discovery and filesystem indexing loader  
│   │   └── /vectorstore  
│   │       ├── \_\_init\_\_.py  
│   │       └── chroma\_client.py     \# ChromaDB persistence, collection maps, semantic querying  
│   ├── pyproject.toml               \# uv project definitions  
│   └── requirements.txt             \# Frozen dependency targets  
└── /frontend  
    ├── /public  
    │   └── bg\_scrub.mp4             \# High-definition visual background asset  
    ├── /src  
    │   ├── /assets  
    │   │   └── fonts.css            \# Specialized display font face declarations  
    │   ├── /components  
    │   │   ├── CarouselStats.tsx    \# Scrollable metric visualizer cards  
    │   │   ├── CodeWorkspace.tsx    \# Code rendering and side-by-side diff workspace  
    │   │   ├── HeroSection.tsx      \# Mainframe creative agency landing page (mouse-scrub)  
    │   │   ├── ModelSelector.tsx    \# Provider dynamic picker cockpit  
    │   │   └── ConsolePanel.tsx     \# Stream outputs, thinking logs, and control terminals  
    │   ├── /hooks  
    │   │   └── useTypewriter.ts     \# Specialized asynchronous typing loop  
    │   ├── App.tsx                  \# Core application shell and router  
    │   ├── index.css                \# Global styles, variables, beige theme color tokens  
    │   ├── index.html               \# Main page, custom fonts integration  
    │   └── main.tsx  
    ├── tailwind.config.js           \# Font and beige color mappings config  
    ├── tsconfig.json                \# TypeScript compilation parameters  
    └── vite.config.ts               \# Vite bundler options

### **System Architecture Dataflow**

                                      \+---------------------------------------------+  
                                      |            React Frontend Cockpit           |  
                                      |    (Theme: Beige / 60 FPS Mouse-Scrub)      |  
                                      \+---------------------------------------------+  
                                           ^                                   |  
                     WebSocket Stream      |                                   |  User Query / Change Request  
                (Thought Blocks & Diffs)   |                                   |  (JSON Payload via WebSocket)  
                                           |                                   v  
\+-------------------------------------------------------------------------------------------------------------------+  
| Python FastAPI Backend Orchestration Core                                                                         |  
|                                                                                                                   |  
|   \+-----------------------------------------------------------------------------------------------------------+   |  
|   | WebSocket & API Request Gateway (main.py)                                                                 |   |  
|   \+-----------------------------------------------------------------------------------------------------------+   |  
|                                          |                                                                        |  
|                       Identify Request   |   Search Semantics                                                     |  
|                                          \+----------------------------------------+                               |  
|                                          |                                        |                               |  
|                                          v                                        v                               |  
|   \+---------------------------------------------------------------------------+ \+-----------------------------+   |  
|   | Dynamic Multi-Model Router & Context Parser                               | | ChromaDB Vector Search      |   |  
|   | \- Instantiates providers (OpenAI, Anthropic, DeepSeek, local)             | | (chroma\_client.py)          |   |  
|   | \- Sanitizes deepseek R1 history (removes internal reasoning logs)         | |                             |   |  
|   | \- Manages Claude 3.7 Sonnet dynamic thinking budgets                       | | \- Cosine similarity lookup  |   |  
|   \+---------------------------------------------------------------------------+ \+-----------------------------+   |  
|                                          |                                                    ^                   |  
|                        Coordinate Agent  |                                                    | Index Code Chunks |  
|                                          v                                                    |                   |  
|   \+---------------------------------------------------------------------------+ \+-----------------------------+   |  
|   | Stateful MCP Multi-Server Manager (client\_manager.py)                     | | cAST Tree-Sitter Splitter   |   |  
|   | \- Connection pool (stdio, WebSocket, HTTP endpoints)                      | | (ast\_chunker.py)            |   |  
|   | \- Exposes tool schemas to LLMs (Filesystem, Web-Search, Compiler)         | | \- Parses classes/functions  |   |  
|   \+---------------------------------------------------------------------------+ \+-----------------------------+   |  
|                                          |                                                    ^                   |  
|                         Request Code     |                                                    | Read Source Files |  
|                        Modifications     v                                                    |                   |  
|   \+-----------------------------------------------------------------------------------------------------------+   |  
|   | Sandboxed PatchPilot Refactoring Workspace (patcher.py)                                                   |   |  
|   | \- Verifies file path boundaries (blocks path traversal attacks)                                           |   |  
|   | \- Enforces strict diff modification budgets (max 120 lines changed)                                       |   |  
|   | \- Executes compiler diagnostics & runs self-correction loops on syntax failures                            |   |  
|   \+-----------------------------------------------------------------------------------------------------------+   |  
\+-------------------------------------------------------------------------------------------------------------------+

## **Technical Deep Dive: Multi-Provider Integration and Reasoning Protocols**

Designing a model-agnostic software engineering platform requires managing differences in how individual models handle internal reasoning and tool execution.

### **Addressing Non-Standard API Responses**

When working with reasoning models, developers face several provider-specific challenges:

* **DeepSeek R1 and the reasoning\_content Field**: Unlike standard API specifications, the DeepSeek R1 model returns its chain-of-thought output in a dedicated reasoning\_content parameter, which is nested alongside the standard content block.12 In multi-turn conversations, passing this internal reasoning log back to the DeepSeek API within the history payload will trigger a 400 Bad Request error.8 To maintain conversation continuity, the back end must strip the reasoning\_content field from previous assistant turns before submitting subsequent requests.8  
* **Claude 3.7 Sonnet Thinking Budgets**: Enabling extended thinking with Claude 3.7 Sonnet requires a specialized thinking configuration block in the API payload, specifying a defined token budget.18 When using tools alongside extended thinking, the platform must configure the tool\_choice parameter to auto or none.18 Forcing tool execution with any or specific tool locks is incompatible with thinking mode and will result in an error.18 Furthermore, thinking signature payloads must be round-tripped back to the API without modifications to preserve reasoning continuity.18

### **Multi-Model Router Implementation**

The following python module manages dynamic model swapping, sanitizes history to prevent DeepSeek API crashes, and manages Claude 3.7 Sonnet's extended thinking parameters.

Python  
\# backend/app/core/orchestrator.py  
import os  
import copy  
from typing import List, Dict, Any, Generator, AsyncGenerator  
from langchain\_core.messages import AIMessage, HumanMessage, SystemMessage, BaseMessage  
from langchain\_openai import ChatOpenAI  
from langchain\_anthropic import ChatAnthropic

class UnifiedModelRouter:  
    """  
    Manages multi-provider model routing, handles provider-specific   
    payload validation, and manages extended thinking configurations.  
    """  
    def \_\_init\_\_(self):  
        self.openai\_key \= os.environ.get("OPENAI\_API\_KEY", "")  
        self.anthropic\_key \= os.environ.get("ANTHROPIC\_API\_KEY", "")  
        self.deepseek\_key \= os.environ.get("DEEPSEEK\_API\_KEY", "")  
        self.google\_key \= os.environ.get("GOOGLE\_API\_KEY", "")

    def sanitize\_history\_for\_provider(self, messages: List\], provider: str) \-\> List\]:  
        """  
        Prepares the message history for API submission. Strips internal reasoning   
        logs from DeepSeek history payloads to avoid HTTP 400 errors.  
        """  
        sanitized \=  
        for msg in messages:  
            cleaned \= copy.deepcopy(msg)  
            \# Remove DeepSeek-specific reasoning fields from historical logs  
            if "reasoning\_content" in cleaned:  
                del cleaned\["reasoning\_content"\]  
              
            \# If the target is DeepSeek, ensure we only pass standard keys  
            if provider \== "deepseek":  
                if "additional\_kwargs" in cleaned:  
                    cleaned\["additional\_kwargs"\] \= {  
                        k: v for k, v in cleaned\["additional\_kwargs"\].items()   
                        if k\!= "reasoning\_content"  
                    }  
            sanitized.append(cleaned)  
        return sanitized

    def parse\_langchain\_history(self, messages: List\]) \-\> List:  
        """  
        Converts generic JSON message schemas into typed LangChain message objects.  
        """  
        lc\_messages \=  
        for msg in messages:  
            role \= msg.get("role")  
            content \= msg.get("content", "")  
              
            if role \== "system":  
                lc\_messages.append(SystemMessage(content=content))  
            elif role \== "user":  
                lc\_messages.append(HumanMessage(content=content))  
            elif role \== "assistant":  
                \# Restore reasoning logs in metadata if present  
                kwargs \= {}  
                if "reasoning\_content" in msg:  
                    kwargs\["additional\_kwargs"\] \= {"reasoning\_content": msg\["reasoning\_content"\]}  
                lc\_messages.append(AIMessage(content=content, \*\*kwargs))  
        return lc\_messages

    async def execute\_stream(  
        self,   
        provider: str,   
        model\_name: str,   
        messages: List\],   
        thinking\_budget: int \= 4000  
    ) \-\> AsyncGenerator, None\]:  
        """  
        Streams model completions and yields formatted updates for both   
        internal thinking steps and final markdown responses.\[12, 18\]  
        """  
        sanitized\_history \= self.sanitize\_history\_for\_provider(messages, provider)  
        lc\_history \= self.parse\_langchain\_history(sanitized\_history)

        if provider \== "anthropic":  
            \# Configure Claude 3.7 Sonnet thinking parameters   
            extra\_args \= {}  
            if thinking\_budget \> 0:  
                extra\_args\["thinking"\] \= {  
                    "type": "enabled",  
                    "budget\_tokens": thinking\_budget  
                }  
                \# When extended thinking is active, temperature must equal 1.0   
                llm \= ChatAnthropic(  
                    model=model\_name,  
                    anthropic\_api\_key=self.anthropic\_key,  
                    max\_tokens=64000,  
                    temperature=1.0,  
                    extra\_headers={"anthropic-beta": "output-128k-2025-02-19"},  
                    \*\*extra\_args  
                )  
            else:  
                llm \= ChatAnthropic(  
                    model=model\_name,  
                    anthropic\_api\_key=self.anthropic\_key,  
                    temperature=0.0  
                )

            async for chunk in llm.astream(lc\_history):  
                \# Intercept Claude's thinking blocks before final generation   
                if hasattr(chunk, "additional\_kwargs") and "thinking" in chunk.additional\_kwargs:  
                    think\_data \= chunk.additional\_kwargs\["thinking"\]  
                    yield {"type": "thought", "content": think\_data}  
                if chunk.content:  
                    yield {"type": "content", "content": chunk.content}

        elif provider \== "deepseek":  
            \# Initialize ChatOpenAI pointing to DeepSeek's endpoint \[8, 22\]  
            llm \= ChatOpenAI(  
                model=model\_name,  
                openai\_api\_key=self.deepseek\_key,  
                openai\_api\_base="https://api.deepseek.com",  
                temperature=1.0 if "reasoner" in model\_name else 0.0,  
                max\_tokens=64000  
            )

            async for chunk in llm.astream(lc\_history):  
                \# Intercept DeepSeek's custom reasoning\_content   
                if hasattr(chunk, "additional\_kwargs") and "reasoning\_content" in chunk.additional\_kwargs:  
                    reasoning\_chunk \= chunk.additional\_kwargs\["reasoning\_content"\]  
                    yield {"type": "thought", "content": reasoning\_chunk}  
                if chunk.content:  
                    yield {"type": "content", "content": chunk.content}

        elif provider \== "openai":  
            \# Handle standard OpenAI models (e.g., GPT-4o, o3-mini) \[19\]  
            extra\_args \= {}  
            if "o3-mini" in model\_name:  
                \# o3-mini uses reasoning\_effort to control thinking intensity  
                extra\_args\["reasoning\_effort"\] \= "medium"  
              
            llm \= ChatOpenAI(  
                model=model\_name,  
                openai\_api\_key=self.openai\_key,  
                \*\*extra\_args  
            )

            async for chunk in llm.astream(lc\_history):  
                if chunk.content:  
                    yield {"type": "content", "content": chunk.content}

        elif provider \== "google":  
            \# Support Google Gemini models via general LLM definitions \[11\]  
            from langchain\_google\_genai import ChatGoogleGenerativeAI  
            llm \= ChatGoogleGenerativeAI(  
                model=model\_name,  
                google\_api\_key=self.google\_key,  
                temperature=0.0  
            )  
            async for chunk in llm.astream(lc\_history):  
                if chunk.content:  
                    yield {"type": "content", "content": chunk.content}

        elif provider \== "ollama":  
            \# Support localized Ollama instances for offline execution  
            from langchain\_community.chat\_models import ChatOllama  
            llm \= ChatOllama(  
                model=model\_name,  
                temperature=0.0  
            )  
            async for chunk in llm.astream(lc\_history):  
                if chunk.content:  
                    yield {"type": "content", "content": chunk.content}

        else:  
            raise ValueError(f"Unknown model provider requested: '{provider}'")

## **Technical Deep Dive: AST-Based Segmenting and ChromaDB Persistence**

Standard text splitters segment source code at arbitrary character offsets or line breaks, which can fragment logical code components.1 This structural disruption compromises semantic retrieval because key imports, functions, and helper definitions can be isolated from their parent classes.1  
To resolve this issue, the platform implements **Chunking via Abstract Syntax Trees (cAST)**.2 By parsing source code into hierarchical syntax trees using tree-sitter, the system identifies exact syntactic boundaries.1 It recursively breaks down oversized nodes and aggregates small siblings to ensure that each chunk is a self-contained, valid structural block.2

Raw Code File  
      │  
      ▼  
┌──────────────┐  
│ Tree-Sitter  │ ──\> AST Generation (Module, Class, Function, Statement Nodes)  
└──────────────┘  
      │  
      ▼  
┌───────────────────────────────┐  
│ Recursive cAST Splitting Loop │  
├───────────────────────────────┤  
│ Is Node Size \> Target Limit?  │  
│    ├── YES ──\> Recurse down to child nodes (e.g., split class into functions)  
│    └── NO  ──\> Keep node intact as an atomic unit  
└───────────────────────────────┘  
      │  
      ▼  
┌───────────────────────────────┐  
│ Greedy Node Aggregation Step  │  
├───────────────────────────────┤  
│ Combine small sibling nodes   │ ──\> Form cohesive code chunks within token limits  
│ without exceeding boundaries  │  
└───────────────────────────────┘  
      │  
      ▼  
┌───────────────────────────────┐  
│ ChromaDB Vector Indexing      │ ──\> Store vectors alongside structural metadata  
└───────────────────────────────┘

### **cAST Parser and Indexing Implementation**

The following python module uses tree-sitter and the chromadb SDK to parse Python source code structurally and index it for semantic retrieval.

Python  
\# backend/app/parser/ast\_chunker.py  
import os  
from typing import List, Dict, Any, Tuple  
from tree\_sitter import Parser, Language, Node  
import tree\_sitter\_python  
import chromadb  
from chromadb.utils import embedding\_functions

class ASTCodeChunker:  
    """  
    Parses source code into an Abstract Syntax Tree (AST) using tree-sitter,  
    and splits it recursively into syntactically valid code chunks.  
    """  
    def \_\_init\_\_(self, target\_chunk\_size: int \= 500, overlap: int \= 50):  
        self.target\_chunk\_size \= target\_chunk\_size  
        self.overlap \= overlap  
        \# Initialize Python language binding for tree-sitter \[9\]  
        self.python\_language \= Language(tree\_sitter\_python.language())  
        self.parser \= Parser()  
        self.parser.set\_language(self.python\_language)

    def generate\_syntax\_chunks(self, source\_code: str) \-\> List\]:  
        """  
        Parses raw code and splits it into structurally cohesive chunks.  
        """  
        source\_bytes \= bytes(source\_code, "utf-8")  
        tree \= self.parser.parse(source\_bytes)  
        chunks: List\] \=  
          
        \# Traverse the tree starting from the root node \[1, 9\]  
        self.\_decompose\_node(tree.root\_node, source\_bytes, chunks)  
        return self.\_merge\_sibling\_chunks(chunks)

    def \_decompose\_node(self, node: Node, source\_bytes: bytes, chunks: List\]) \-\> None:  
        """  
        Recursively splits nodes that exceed the target size limit.  
        """  
        node\_raw\_content \= source\_bytes\[node.start\_byte:node.end\_byte\].decode("utf-8", errors="ignore")  
        node\_length \= len(node\_raw\_content)

        \# If the node fits within the target size, capture it as an atomic unit   
        if node\_length \<= self.target\_chunk\_size:  
            if node\_length \> 15:  \# Skip trivial declarations or syntax markers  
                chunks.append({  
                    "content": node\_raw\_content,  
                    "metadata": {  
                        "type": node.type,  
                        "start\_line": node.start\_point \+ 1,  
                        "end\_line": node.end\_point \+ 1  
                    }  
                })  
        else:  
            \# If the node exceeds the size limit, split and process its children   
            if len(node.children) \> 0:  
                for child in node.children:  
                    self.\_decompose\_node(child, source\_bytes, chunks)  
            else:  
                \# Capture terminal leaf nodes even if they exceed limits \[9\]  
                chunks.append({  
                    "content": node\_raw\_content,  
                    "metadata": {  
                        "type": f"terminal\_{node.type}",  
                        "start\_line": node.start\_point \+ 1,  
                        "end\_line": node.end\_point \+ 1  
                    }  
                })

    def \_merge\_sibling\_chunks(self, chunks: List\]) \-\> List\]:  
        """  
        Aggregates small sibling chunks (e.g. variable assignments, simple returns)  
        to maintain context while respecting target size limits.  
        """  
        merged\_list \=  
        if not chunks:  
            return merged\_list

        current\_accumulator \= chunks\["content"\]  
        current\_meta \= chunks\["metadata"\]

        for next\_chunk in chunks\[1:\]:  
            next\_content \= next\_chunk\["content"\]  
            next\_meta \= next\_chunk\["metadata"\]

            \# If combining sibling nodes does not exceed the size limit, merge them   
            if len(current\_accumulator) \+ len(next\_content) \<= self.target\_chunk\_size:  
                current\_accumulator \+= "\\n" \+ next\_content  
                current\_meta\["end\_line"\] \= next\_meta\["end\_line"\]  
                current\_meta\["type"\] \= "aggregated\_nodes"  
            else:  
                merged\_list.append({  
                    "content": current\_accumulator,  
                    "metadata": current\_meta  
                })  
                current\_accumulator \= next\_content  
                current\_meta \= next\_meta

        \# Append remaining accumulated nodes  
        merged\_list.append({  
            "content": current\_accumulator,  
            "metadata": current\_meta  
        })  
        return merged\_list

class ChromaCodeIndexer:  
    """  
    Manages vector storage and similarity searches in ChromaDB.\[4\]  
    """  
    def \_\_init\_\_(self, database\_directory: str):  
        self.client \= chromadb.PersistentClient(path=database\_directory)  
        self.embed\_func \= embedding\_functions.OpenAIEmbeddingFunction(  
            api\_key=os.environ.get("OPENAI\_API\_KEY", "dummy-key"),  
            model\_name="text-embedding-3-small"  
        )  
        self.collection \= self.client.get\_or\_create\_collection(  
            name="codebase\_ast\_collection",  
            embedding\_function=self.embed\_func,  
            metadata={"hnsw:space": "cosine"} \# Use cosine similarity  
        )

    def index\_target\_file(self, file\_absolute\_path: str, workspace\_root: str) \-\> None:  
        """  
        Decomposes a source file using cAST and indexes the chunks in ChromaDB.  
        """  
        with open(file\_absolute\_path, "r", encoding="utf-8") as f:  
            raw\_code \= f.read()

        chunker \= ASTCodeChunker()  
        ast\_segments \= chunker.generate\_syntax\_chunks(raw\_code)  
          
        file\_relative\_path \= os.path.relpath(file\_absolute\_path, workspace\_root)  
          
        documents \=  
        metadatas \=  
        ids \=

        for idx, segment in enumerate(ast\_segments):  
            documents.append(segment\["content"\])  
            metadatas.append({  
                "source\_file": file\_relative\_path,  
                "node\_type": segment\["metadata"\]\["type"\],  
                "start\_line": segment\["metadata"\]\["start\_line"\],  
                "end\_line": segment\["metadata"\]\["end\_line"\]  
            })  
            ids.append(f"{file\_relative\_path}\#chunk\_{idx}")

        if documents:  
            self.collection.upsert(  
                ids=ids,  
                documents=documents,  
                metadatas=metadatas  
            )

    def semantic\_code\_search(self, query: str, max\_results: int \= 5) \-\> List\]:  
        """  
        Retrieves matching code chunks from the vector database.\[4\]  
        """  
        query\_results \= self.collection.query(  
            query\_texts=\[query\],  
            n\_results=max\_results  
        )

        matches \=  
        if query\_results and "documents" in query\_results and query\_results\["documents"\]:  
            for idx in range(len(query\_results\["documents"\])):  
                matches.append({  
                    "id": query\_results\["ids"\]\[idx\],  
                    "content": query\_results\["documents"\]\[idx\],  
                    "metadata": query\_results\["metadatas"\]\[idx\],  
                    "distance": query\_results\["distances"\]\[idx\] if "distances" in query\_results else 0.0  
                })  
        return matches

### **Mathematical Formulation of Vector Retrieval**

The semantic engine maps code chunks into high-dimensional vector spaces using OpenAI's embedding model. It then ranks these chunks by computing the cosine distance between the search vector ![][image7] and document vectors ![][image8]:  
![][image9]  
The cosine distance, which ranges from ![][image10] (identical direction) to ![][image11] (opposite direction), is defined as:  
![][image12]  
Using this formulation, the retrieval engine ranks the codebase chunks, identifying syntactically intact code blocks that share the closest semantic relationship with the search query.2

## **Technical Deep Dive: Self-Correcting Agentic Workspace and Safe Patching Pipeline**

Allowing autonomous agents to modify files directly can introduce compilation errors, syntax violations, or broken dependencies.17 To mitigate these risks, the platform implements a structured self-correction workflow modeled on the **PatchPilot** architecture.5 This pipeline runs code edits inside isolated workspace environments with strict execution boundaries.6

┌─────────────────────────────────┐  
│  Generate Proposed Code Patch   │  
└─────────────────────────────────┘  
                 │  
                 ▼  
┌─────────────────────────────────┐  
│   Validate Path Boundaries      │ ──\> Blocks path traversal attacks  
└─────────────────────────────────┘  
                 │  
                 ▼  
┌─────────────────────────────────┐  
│     Check Diff line Budget      │ ──\> Halts if modifications exceed limits  
└─────────────────────────────────┘  
                 │  
                 ▼  
┌─────────────────────────────────┐  
│   Apply Patch inside Sandbox    │ ──\> Write to temp directory  
└─────────────────────────────────┘  
                 │  
                 ▼  
┌─────────────────────────────────┐  
│ Run Linters & Unit Test Suites  │  
└─────────────────────────────────┘  
                 │  
         ┌───────┴───────┐  
         ▼               ▼  
    \[All Passed\]    
         │               │  
         │               v  
         │     ┌───────────────────┐  
         │     │ Route Errors back │ ──\> Agent modifies patch to fix issues  
         │     │  to Repair Loop   │  
         │     └───────────────────┘  
         │               │  
         │               ▼  
         │     ┌───────────────────┐  
         │     │  Retry Validation │  
         │     └───────────────────┘  
         │               │  
         v               v  
┌─────────────────────────────────┐  
│ Merge Verified Changes to Main  │  
└─────────────────────────────────┘

The self-correction pipeline operates within the following constraints:

* **Sandbox Boundary Validation**: To prevent path traversal attacks, the platform checks all file paths against the designated sandbox workspace directory, blocking any actions that attempt to escape this boundary.6  
* **Strict Diff Budgets**: To ensure changes remain focused and reviewable, the platform enforces a strict diff budget.10 If a proposed patch modifies more lines than the defined limit (e.g., 120 lines), the transaction is rejected.10  
* **Diagnostic-Driven Refinement**: If compilation errors or test failures occur during sandbox execution, the platform captures the diagnostic output and routes it back to the agent.5 The agent uses this feedback to generate a targeted correction patch, continuing the loop until all validation checks pass.5

### **Workspace Patch and Self-Correction Implementation**

The following python module manages sandboxed file modifications, validates path boundaries, and handles automated self-correction loops.

Python  
\# backend/app/core/patcher.py  
import os  
import sys  
import subprocess  
from typing import Tuple, List, Dict, Any

class SandboxedPatchPilot:  
    """  
    Manages secure workspace modifications, enforces diff budgets,  
    and runs self-correction loops on syntax failures.\[5, 6, 10, 17\]  
    """  
    def \_\_init\_\_(self, workspace\_directory: str, max\_changed\_lines\_budget: int \= 120):  
        self.workspace\_root \= os.path.abspath(workspace\_directory)  
        self.max\_changed\_lines\_budget \= max\_changed\_lines\_budget  
        if not os.path.exists(self.workspace\_root):  
            os.makedirs(self.workspace\_root)

    def verify\_workspace\_boundary(self, relative\_file\_path: str) \-\> str:  
        """  
        Checks file paths against the workspace root to prevent   
        directory traversal exploits.  
        """  
        absolute\_target\_path \= os.path.abspath(os.path.join(self.workspace\_root, relative\_file\_path))  
        if not absolute\_target\_path.startswith(self.workspace\_root):  
            raise PermissionError(  
                f"Security Violation: Target path '{absolute\_target\_path}' "  
                f"lies outside authorized workspace root '{self.workspace\_root}'"  
            )  
        return absolute\_target\_path

    def calculate\_changed\_lines(self, unified\_diff\_raw: str) \-\> int:  
        """  
        Counts the modified lines in a unified diff block, excluding meta headers.  
        """  
        line\_count \= 0  
        for line in unified\_diff\_raw.splitlines():  
            \# Match additions and deletions while skipping unified diff headers  
            if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):  
                line\_count \+= 1  
        return line\_count

    def apply\_diff\_patch(self, target\_relative\_path: str, unified\_diff\_content: str) \-\> Tuple\[bool, str\]:  
        """  
        Applies a unified diff patch to a target file in the sandbox environment.\[6, 17\]  
        """  
        try:  
            absolute\_target\_path \= self.verify\_workspace\_boundary(target\_relative\_path)  
              
            \# Enforce the strict line modification budget   
            lines\_changed \= self.calculate\_changed\_lines(unified\_diff\_content)  
            if lines\_changed \> self.max\_changed\_lines\_budget:  
                return False, (  
                    f"Line Budget Overrun: Modification requested {lines\_changed} lines, "  
                    f"exceeding target budget limits of {self.max\_changed\_lines\_budget} lines."  
                )

            \# Create the file if it does not exist   
            if not os.path.exists(absolute\_target\_path):  
                with open(absolute\_target\_path, "w", encoding="utf-8") as f:  
                    f.write("")

            \# Write the unified diff to a temporary patch file  
            temporary\_patch\_path \= os.path.join(self.workspace\_root, "changeset.patch")  
            with open(temporary\_patch\_path, "w", encoding="utf-8") as f:  
                f.write(unified\_diff\_content)

            \# Apply the patch using the system patch utility  
            patch\_execution\_command \= \[  
                "patch",   
                "--forward",   
                "--reject-file=-",   
                absolute\_target\_path,   
                temporary\_patch\_path  
            \]  
              
            process\_run \= subprocess.run(  
                patch\_execution\_command,  
                stdout=subprocess.PIPE,  
                stderr=subprocess.PIPE,  
                text=True,  
                timeout=15  
            )

            \# Clean up the temporary patch file  
            if os.path.exists(temporary\_patch\_path):  
                os.remove(temporary\_patch\_path)

            if process\_run.returncode \== 0:  
                \# Run post-patch syntax validation checks   
                syntax\_valid, syntax\_error\_msg \= self.validate\_syntax(absolute\_target\_path)  
                if not syntax\_valid:  
                    return False, f"Post-Patch Compilation Error: {syntax\_error\_msg}"  
                return True, f"Successfully patched {target\_relative\_path} and verified syntax"  
            else:  
                return False, f"Failed to apply patch: {process\_run.stderr or process\_run.stdout}"

        except PermissionError as security\_error:  
            return False, str(security\_error)  
        except subprocess.TimeoutExpired:  
            return False, "Failed to apply patch: patch utility timed out."  
        except Exception as unexpected\_error:  
            return False, f"Unexpected patching exception: {str(unexpected\_error)}"

    def validate\_syntax(self, file\_absolute\_path: str) \-\> Tuple\[bool, str\]:  
        """  
        Validates Python syntax to catch potential compilation errors.  
        """  
        if not file\_absolute\_path.endswith(".py"):  
            return True, "Syntax checks are skipped for non-python files."  
          
        try:  
            with open(file\_absolute\_path, "r", encoding="utf-8") as f:  
                compile(f.read(), file\_absolute\_path, "exec")  
            return True, "Syntax verified successfully"  
        except SyntaxError as syntax\_err:  
            return False, f"Line {syntax\_err.lineno}: {syntax\_err.msg}"

    def run\_workspace\_verification\_suite(self, test\_trigger\_command: str) \-\> Tuple\[bool, str\]:  
        """  
        Runs automated test suites to verify system behavior.  
        """  
        try:  
            process\_run \= subprocess.run(  
                test\_trigger\_command,  
                shell=True,  
                cwd=self.workspace\_root,  
                stdout=subprocess.PIPE,  
                stderr=subprocess.PIPE,  
                text=True,  
                timeout=30  
            )  
            if process\_run.returncode \== 0:  
                return True, "All tests passed successfully"  
            else:  
                return False, f"Test Suite Failed: {process\_run.stdout}\\n{process\_run.stderr}"  
        except subprocess.TimeoutExpired:  
            return False, "Test suite execution timed out."  
        except Exception as err:  
            return False, f"Failed to execute verification suite: {str(err)}"

This testing framework acts as the core of the self-correction loop, providing detailed diagnostic feedback that helps the agent refine and verify codebase modifications safely.5

## **Model Context Protocol Multi-Server Connection Pool**

Modern AI agents rely on standardized integration protocols to interact with external tools and systems.7 To support this, the platform implements a stateful **Model Context Protocol (MCP)** connection pool that manages multi-server communication across stdio, HTTP, and WebSocket transports.3

                        ┌─────────────────────────────────┐  
                        │      MultiServerMCPClient       │  
                        └─────────────────────────────────┘  
                                         │  
                 ┌───────────────────────┼───────────────────────┐  
                 ▼                       ▼                       ▼  
    ┌─────────────────────────┐   ┌──────────────┐   ┌─────────────────────────┐  
    │ Filesystem MCP Server   │   │ Math Server  │   │  Web-Search MCP Server  │  
    │  (npx server-filesystem)│   │ (math\_server)│   │   (streamable-http)     │  
    └─────────────────────────┘   └──────────────┘   └─────────────────────────┘  
                 │                       │                       │  
                 v                       v                       v  
               stdio                   stdio               Streamable-HTTP  
                 │                       │                       │  
                 └───────────────────────┼───────────────────────┘  
                                         │  
                                         ▼  
                        ┌─────────────────────────────────┐  
                        │   Unified Tool Registry Layer   │  
                        └─────────────────────────────────┘

The MCP client-side architecture includes:

* **Stateful Tool Pooling**: The platform establishes and maintains connections to multiple local or remote MCP servers, harvesting their individual tool schemas.3  
* **Dynamic Tool Translation**: Harvester outputs are converted into standardized LangChain tool definitions, allowing seamless integration with dynamic agent routing loops.3  
* **Stateful and Stateless Execution Support**: The platform supports both lightweight, stateless tool executions and persistent, stateful tool sessions, preserving directory context across multi-step execution runs.3

### **MCP Client and Server Pool Management**

The following python module configures multi-server stdio connections and converts their native tools into standardized LangChain schemas.

Python  
\# backend/app/mcp/client\_manager.py  
import os  
import asyncio  
from typing import Dict, List, Any, Optional  
from mcp import ClientSession, StdioServerParameters  
from mcp.client.stdio import stdio\_client  
from langchain\_core.tools import BaseTool, Tool  
from langchain\_mcp\_adapters.tools import load\_mcp\_tools

class MCPMultiServerManager:  
    """  
    Manages persistent connections to multiple local and remote MCP servers,  
    and exposes their tools to LangChain agents.\[3, 7, 14, 15\]  
    """  
    def \_\_init\_\_(self):  
        \# Pool to store active MCP server parameters and client sessions  
        self.server\_registry: Dict \= {}  
        self.active\_sessions: Dict \= {}  
        self.client\_contexts: Dict\[str, Any\] \= {}  
        self.consolidated\_tools\_list: List \=

    def register\_stdio\_server(self, server\_identifier: str, execution\_command: str, execution\_arguments: List\[str\]) \-\> None:  
        """  
        Registers an MCP server configuration in the pool.\[11, 23\]  
        """  
        server\_params \= StdioServerParameters(  
            command=execution\_command,  
            args=execution\_arguments,  
            env=os.environ.copy()  
        )  
        self.server\_registry\[server\_identifier\] \= server\_params

    async def initialize\_all\_connections(self) \-\> None:  
        """  
        Establishes active stdio connections and initializes sessions  
        for all registered servers.  
        """  
        for identifier, params in self.server\_registry.items():  
            try:  
                \# Open stdio transport channel  
                read\_stream, write\_stream \= await stdio\_client(params).\_\_aenter\_\_()  
                  
                \# Initialize client session \[3, 21\]  
                session \= ClientSession(read\_stream, write\_stream)  
                await session.\_\_aenter\_\_()  
                await session.initialize()  
                  
                self.active\_sessions\[identifier\] \= session  
                print(f"Connected to MCP server: '{identifier}'")  
            except Exception as connection\_err:  
                print(f"Failed to connect to MCP server '{identifier}': {str(connection\_err)}")

    async def harvest\_registered\_tools(self) \-\> List:  
        """  
        Retrieves tool configurations from all active MCP servers and   
        converts them into LangChain tool schemas.  
        """  
        combined\_tools \=  
        for identifier, session in self.active\_sessions.items():  
            try:  
                \# Load MCP server tools as LangChain tools   
                mcp\_langchain\_tools \= await load\_mcp\_tools(session)  
                for tool in mcp\_langchain\_tools:  
                    \# Prefix tool names to prevent conflicts across servers \[15\]  
                    tool.name \= f"{identifier}\_{tool.name}"  
                    combined\_tools.append(tool)  
            except Exception as harvesting\_err:  
                print(f"Failed to harvest tools from '{identifier}': {str(harvesting\_err)}")  
          
        self.consolidated\_tools\_list \= combined\_tools  
        return self.consolidated\_tools\_list

    async def execute\_pooled\_tool(self, tool\_identifier: str, execution\_arguments: Dict\[str, Any\]) \-\> Any:  
        """  
        Executes a tool on the matching MCP server and returns the result.\[14, 21\]  
        """  
        \# Parse the server identifier and target tool name from the prefixed ID  
        if "\_" not in tool\_identifier:  
            raise ValueError(f"Invalid tool identifier format: '{tool\_identifier}'")  
          
        server\_prefix, target\_tool\_name \= tool\_identifier.split("\_", 1)  
        session \= self.active\_sessions.get(server\_prefix)  
        if not session:  
            raise ConnectionError(f"No active session found for server: '{server\_prefix}'")

        \# Execute the tool and return the output \[14, 21\]  
        execution\_result \= await session.call\_tool(target\_tool\_name, arguments=execution\_arguments)  
        return execution\_result.content

    async def disconnect\_all(self) \-\> None:  
        """  
        Gracefully closes all active sessions and transport channels.  
        """  
        for identifier, session in list(self.active\_sessions.items()):  
            try:  
                await session.\_\_aexit\_\_(None, None, None)  
                del self.active\_sessions\[identifier\]  
                print(f"Disconnected MCP session: '{identifier}'")  
            except Exception as close\_err:  
                print(f"Error disconnecting session '{identifier}': {str(close\_err)}")

## **Front-End UI Architecture: Beige Aesthetics and Interactive Components**

The user interface is designed to match the technical capabilities of the back end, using a soft, elegant beige aesthetic and custom interactive elements to present system states and metrics clearly.

### **Visual Styling Properties**

The styling pipeline uses a minimal beige-themed configuration designed for high-performance visual rendering.

CSS  
/\* frontend/src/index.css \*/  
@import url('https://db.onlinewebfonts.com/c/5ac3fe7c6abd2f62067f266d89671492?family=HelveticaNowDisplay-Medium');  
@import url('https://db.onlinewebfonts.com/c/1aa3377e489837a26d019bba501e779d?family=HelveticaNowDisplayW01-Rg');

:root {  
  \--font\-heading: 'HelveticaNowDisplay-Medium', 'Helvetica Neue', Arial, sans-serif;  
  \--font\-body: 'HelveticaNowDisplayW01-Rg', 'Helvetica Neue', Arial, sans-serif;  
  \--color\-beige-base: \#f5f5f0;  
  \--color\-beige-dark: \#e6e6d8;  
  \--color\-beige-contrast: \#121210;  
  \--color\-beige-border: rgba(18, 18, 16, 0.1);  
}

body {  
  margin: 0;  
  font-family: var(--font-body);  
  background-color: var(--color-beige-base);  
  color: var(--color-beige-contrast);  
  overflow-x: hidden;  
  \-webkit-font\-smoothing: antialiased;  
}

### **Full-Screen Interactive Landing Page implementation**

The following React module implements the full-screen hero landing page, featuring horizontal mouse-scrub video controls, animated responsive navigation, blurred introductory elements, typewriter hooks, and copy-to-clipboard actions \[Prompt context\].

TypeScript  
// frontend/src/components/HeroSection.tsx  
import React, { useState, useEffect, useRef, useMemo } from "react";

// Custom Typewriter Hook to type character sequences progressively  
export function useTypewriter(targetText: string, typingSpeedMs: number \= 38, startDelayMs: number \= 600\) {  
  const \= useState("");  
  const \= useState(false);

  useEffect(() \=\> {  
    let currentIdx \= 0;  
    let typingTimer: any \= null;

    const startTimer \= setTimeout(() \=\> {  
      typingTimer \= setInterval(() \=\> {  
        if (currentIdx \< targetText.length) {  
          setDisplayedText((prev) \=\> prev \+ targetText.charAt(currentIdx));  
          currentIdx++;  
        } else {  
          setIsDone(true);  
          clearInterval(typingTimer);  
        }  
      }, typingSpeedMs);  
    }, startDelayMs);

    return () \=\> {  
      clearTimeout(startTimer);  
      if (typingTimer) clearInterval(typingTimer);  
    };  
  },);

  return { displayedText, isDone };  
}

interface HeroSectionProps {  
  onDiscoverClick: () \=\> void;  
}

export const HeroSection: React.FC\<HeroSectionProps\> \= ({ onDiscoverClick }) \=\> {  
  const \[isMobileMenuOpen, setIsMobileMenuOpen\] \= useState(false);  
  const \[isPageLoaded, setIsPageLoaded\] \= useState(false);  
  const videoReference \= useRef\<HTMLVideoElement | null\>(null);  
    
  // Mouse scrub state tracking variables  
  const cursorCoordinates \= useRef({ previousX: 0 });  
  const pendingSeekUpdate \= useRef\<number | null\>(null);  
  const isSeeking \= useRef(false);

  // Initialize page-load entry transitions  
  useEffect(() \=\> {  
    setIsPageLoaded(true);  
  },);

  // Set up the typewriter hook for the welcome prompt  
  const { displayedText, isDone } \= useTypewriter(  
    "Glad you stopped in. Good taste tends to find us. Now, what are we building?",  
    38,  
    600  
  );

  // Handle horizontal mouse coordinates to scrub the background video  
  useEffect(() \=\> {  
    const handleMouseScrub \= (event: MouseEvent) \=\> {  
      const videoElement \= videoReference.current;  
      if (\!videoElement || videoElement.readyState \< 2\) return;

      const screenWidth \= window.innerWidth;  
      const xOffsetDelta \= event.clientX \- cursorCoordinates.current.previousX;  
      cursorCoordinates.current.previousX \= event.clientX;

      const scrubSensitivity \= 0.8;  
      const calculatedDurationDelta \= (xOffsetDelta / screenWidth) \* scrubSensitivity \* videoElement.duration;  
      const calculatedTargetTime \= Math.max(0, Math.min(videoElement.duration, videoElement.currentTime \+ calculatedDurationDelta));

      if (\!isSeeking.current) {  
        isSeeking.current \= true;  
        videoElement.currentTime \= calculatedTargetTime;  
      } else {  
        pendingSeekUpdate.current \= calculatedTargetTime;  
      }  
    };

    window.addEventListener("mousemove", handleMouseScrub);  
    return () \=\> {  
      window.removeEventListener("mousemove", handleMouseScrub);  
    };  
  },);

  // Process any pending seek requests once the current seek action completes  
  const handleSeekedEvent \= () \=\> {  
    const videoElement \= videoReference.current;  
    if (\!videoElement) return;

    if (pendingSeekUpdate.current\!== null) {  
      const nextTargetTime \= pendingSeekUpdate.current;  
      pendingSeekUpdate.current \= null;  
      videoElement.currentTime \= nextTargetTime;  
    } else {  
      isSeeking.current \= false;  
    }  
  };

  const executeClipboardCopy \= async () \=\> {  
    try {  
      await navigator.clipboard.writeText("hello@mainframe.co");  
      alert("Address copied to clipboard.");  
    } catch {  
      alert("Failed to copy address.");  
    }  
  };

  return (  
    \<div className="relative h-screen w-full overflow-hidden select-none bg-\[\#f5f5f0\]"\>  
      {/\* Background Video Element controlled via horizontal mouse movement \*/}  
      \<video  
        ref={videoReference}  
        onSeeked={handleSeekedEvent}  
        src="https://d8j0ntlcm91z4.cloudfront.net/user\_38xzZboKViGWJOttwIXH07lWA1P/hf\_20260530\_042513\_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4"  
        className="fixed inset-0 h-full w-full object-cover pointer-events-none"  
        style={{ objectPosition: "70% center", zIndex: 0 }}  
        muted  
        playsInline  
        preload="auto"  
      /\>

      {/\* Main Navigation Overlay \*/}  
      \<nav className="fixed top-0 left-0 w-full flex justify-between items-center px-5 sm:px-8 py-4 sm:py-5 bg-transparent" style={{ zIndex: 10 }}\>  
        \<div className="flex items-center gap-3"\>  
          \<span className="text-\[21px\] sm:text-\[26px\] tracking-tight text-black font-semibold" style={{ fontFamily: "var(--font-heading)" }}\>  
            Mainframe(R)  
          \</span\>  
          \<span className="text-\[25px\] sm:text-\[30px\] text-black select-none leading-none tracking-tight"\>✳︎\</span\>  
        \</div\>

        {/\* Desktop Links \*/}  
        \<div className="hidden md:flex items-center gap-1 text-\[23px\] text-black"\>  
          \<a href="\#labs" className="hover:opacity-60 transition-opacity"\>Labs\</a\>,   
          \<a href="\#studio" className="hover:opacity-60 transition-opacity ml-1"\>Studio\</a\>,   
          \<a href="\#openings" className="hover:opacity-60 transition-opacity ml-1"\>Openings\</a\>,   
          \<a href="\#shop" className="hover:opacity-60 transition-opacity ml-1"\>Shop\</a\>  
        \</div\>

        \<a href="\#contact" className="hidden md:block text-\[23px\] text-black underline underline-offset-2 hover:opacity-60 transition-opacity"\>  
          Get in touch  
        \</a\>

        {/\* Mobile Hamburger Toggle \*/}  
        \<button   
          onClick={() \=\> setIsMobileMenuOpen(\!isMobileMenuOpen)}  
          className="flex flex-col gap-\[5px\] justify-center items-center w-6 h-6 md:hidden z-20 focus:outline-none"  
        \>  
          \<span className={\`w-6 h-\[2px\] bg-black transition-all duration-300 ${isMobileMenuOpen? "rotate-45 translate-y-\[7px\]" : ""}\`} /\>  
          \<span className={\`w-6 h-\[2px\] bg-black transition-all duration-300 ${isMobileMenuOpen? "opacity-0" : ""}\`} /\>  
          \<span className={\`w-6 h-\[2px\] bg-black transition-all duration-300 ${isMobileMenuOpen? "-rotate-45 \-translate-y-\[7px\]" : ""}\`} /\>  
        \</button\>  
      \</nav\>

      {/\* Mobile Menu Overlay \*/}  
      \<div   
        className={\`fixed inset-0 bg-white/95 backdrop-blur-sm flex flex-col justify-center px-8 gap-8 transition-all duration-300 md:hidden\`}  
        style={{   
          zIndex: 9,  
          opacity: isMobileMenuOpen? 1 : 0,  
          pointerEvents: isMobileMenuOpen? "auto" : "none"  
        }}  
      \>  
        \<a href="\#labs" className="text-\[32px\] font-medium text-black"\>Labs\</a\>  
        \<a href="\#studio" className="text-\[32px\] font-medium text-black"\>Studio\</a\>  
        \<a href="\#openings" className="text-\[32px\] font-medium text-black"\>Openings\</a\>  
        \<a href="\#shop" className="text-\[32px\] font-medium text-black"\>Shop\</a\>  
        \<hr className="border-black/10 w-24 my-2" /\>  
        \<a href="\#contact" className="text-\[32px\] font-medium text-black underline"\>Get in touch\</a\>  
      \</div\>

      {/\* Hero Section Container \*/}  
      \<div className="relative w-full h-full flex flex-col justify-end md:justify-center px-5 sm:px-8 md:px-10 pb-12 md:pb-0" style={{ zIndex: 1 }}\>  
        \<div className="max-w-xl text-left"\>  
          {/\* Blurred Introductory Sub-label \*/}  
          \<div className="mb-5 sm:mb-6 select-none pointer-events-none filter blur-\[4px\] text-black leading-tight" style={{ fontSize: "clamp(18px, 4vw, 26px)" }}\>  
            Hey there, meet A.R.I.A,\<br /\>  
            Mainframe's Adaptive Response Interface Agent  
          \</div\>

          {/\* Welcome Prompt with Typewriter Effect \*/}  
          \<div className="mb-5 sm:mb-8 text-black font-normal leading-\[1.35\] min-height-\[54px\]" style={{ fontSize: "clamp(18px, 4vw, 26px)" }}\>  
            \<span\>{displayedText}\</span\>  
            {\!isDone && (  
              \<span className="inline-block w-\[2px\] h-\[1.1em\] bg-black align-middle ml-\[2px\] animate-pulse" /\>  
            )}  
          \</div\>

          {/\* Action Navigation Pills \*/}  
          \<div   
            className={\`flex flex-wrap gap-y-1 transition-all duration-700 transform ${isPageLoaded? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}\`}  
            style={{ transitionDelay: "400ms" }}  
          \>  
            \<button onClick={onDiscoverClick} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-\[13px\] sm:text-\[15px\] px-4 sm:px-5 py-\[0.3em\] mx-\[0.2em\] mb-\[0.4em\] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200"\>  
              Pitch us an idea  
            \</button\>  
            \<button onClick={onDiscoverClick} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-\[13px\] sm:text-\[15px\] px-4 sm:px-5 py-\[0.3em\] mx-\[0.2em\] mb-\[0.4em\] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200"\>  
              Come work here  
            \</button\>  
            \<button onClick={onDiscoverClick} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-\[13px\] sm:text-\[15px\] px-4 sm:px-5 py-\[0.3em\] mx-\[0.2em\] mb-\[0.4em\] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200"\>  
              Send a brief hello  
            \</button\>  
            \<button onClick={onDiscoverClick} className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-\[13px\] sm:text-\[15px\] px-4 sm:px-5 py-\[0.3em\] mx-\[0.2em\] mb-\[0.4em\] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200"\>  
              See how we operate  
            \</button\>

            {/\* Email Copier Pill Button \*/}  
            \<button   
              onClick={executeClipboardCopy}  
              className="inline-flex items-center justify-center bg-transparent text-white border border-white/30 rounded-full text-\[13px\] sm:text-\[15px\] px-4 sm:px-5 py-\[0.3em\] mx-\[0.2em\] mb-\[0.4em\] gap-2 sm:gap-3 whitespace-nowrap hover:bg-white hover:text-black transition-colors duration-200"  
            \>  
              \<span className="underline underline-offset-1"\>Reach us: hello@mainframe.co\</span\>  
              \<svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"\>  
                \<path d="M16 1H4c-1.1 0-2.9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2.9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /\>  
              \</svg\>  
            \</button\>  
          \</div\>  
        \</div\>  
      \</div\>  
    \</div\>  
  );  
};

### **Dashboard Control Panel and Code Editor Workspace**

The following React module implements the main workspace dashboard, providing controls to adjust models, select providers, set extended thinking budgets, and monitor workspace execution and stats.

TypeScript  
// frontend/src/components/ConsolePanel.tsx  
import React, { useState, useEffect } from "react";

interface AgentMetric {  
  title: string;  
  value: string;  
  trend: string;  
}

export const ConsolePanel: React.FC \= () \=\> {  
  const \= useState("anthropic");  
  const \= useState("claude-3-7-sonnet");  
  const \= useState(16000);  
  const \= useState(true);  
  const \[userQuery, setUserQuery\] \= useState("");  
  const \[activeConsoleLog, setActiveConsoleLog\] \= useState\<string\>();

  const availableModels: Record\<string, string\> \= {  
    anthropic: \["claude-3-7-sonnet", "claude-3-5-sonnet"\],  
    deepseek: \["deepseek-reasoner", "deepseek-chat"\],  
    openai: \["gpt-4o", "o3-mini"\],  
    google: \["gemini-2.5-pro", "gemini-2.5-flash"\],  
    ollama: \["qwen2.5-coder-7b", "llama3.3"\]  
  };

  const agentStatistics: AgentMetric \=;

  const handleProviderChange \= (provider: string) \=\> {  
    setSelectedProvider(provider);  
    setSelectedModel(availableModels\[provider\]);  
  };

  const triggerSearchAnalysis \= () \=\> {  
    if (\!userQuery.trim()) return;  
      
    // Simulate real-time console log streaming  
    const timestamp \= new Date().toLocaleTimeString();  
    setActiveConsoleLog((prev) \=\> \[  
     ...prev,  
      \`\[${timestamp}\] Initiating search: "${userQuery}"\`,  
      \`\[${timestamp}\] Extracting code chunks via Tree-Sitter...\`,  
      \`\[${timestamp}\] Analyzing semantic vectors in ChromaDB...\`,  
      \`\[${timestamp}\] Running test suite validations...\`  
    \]);  
    setUserQuery("");  
  };

  return (  
    \<div className="w-full min-h-screen bg-\[\#f5f5f0\] text-\[\#121210\] p-6 sm:p-10 flex flex-col gap-8"\>  
      {/\* Dynamic Statistics Carousel Card Layout \*/}  
      \<div className="w-full flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-black/10 select-none"\>  
        {agentStatistics.map((stat, idx) \=\> (  
          \<div   
            key={idx}   
            className="min-w-\[280px\] bg-\[\#e6e6d8\] p-5 rounded-2xl border border-black/10 flex flex-col gap-2 hover:shadow-sm transition-shadow"  
          \>  
            \<span className="text-\[13px\] tracking-widest uppercase opacity-60 font-semibold"\>{stat.title}\</span\>  
            \<span className="text-\[28px\] font-semibold tracking-tight"\>{stat.value}\</span\>  
            \<span className="text-\[12px\] italic opacity-50"\>{stat.trend}\</span\>  
          \</div\>  
        ))}  
      \</div\>

      {/\* Main Console and Code Editor Layout \*/}  
      \<div className="grid grid-cols-1 lg:grid-cols-3 gap-8"\>  
        {/\* Left Control Dashboard \*/}  
        \<div className="bg-\[\#e6e6d8\] p-6 rounded-2xl border border-black/10 flex flex-col gap-6"\>  
          \<h2 className="text-\[22px\] font-semibold tracking-tight uppercase" style={{ fontFamily: "var(--font-heading)" }}\>  
            Execution Config  
          \</h2\>  
            
          {/\* Provider Selection \*/}  
          \<div className="flex flex-col gap-2"\>  
            \<label className="text-\[12px\] uppercase opacity-60 font-bold"\>Model Provider\</label\>  
            \<div className="grid grid-cols-3 gap-2"\>  
              {Object.keys(availableModels).map((prov) \=\> (  
                \<button  
                  key={prov}  
                  onClick={() \=\> handleProviderChange(prov)}  
                  className={\`py-2 px-3 text-\[13px\] rounded-lg border font-medium uppercase transition-all ${  
                    selectedProvider \=== prov  
                     ? "bg-\[\#121210\] text-white border-transparent"  
                      : "bg-\[\#f5f5f0\] text-black border-black/10 hover:bg-black/5"  
                  }\`}  
                \>  
                  {prov}  
                \</button\>  
              ))}  
            \</div\>  
          \</div\>

          {/\* Model Selection \*/}  
          \<div className="flex flex-col gap-2"\>  
            \<label className="text-\[12px\] uppercase opacity-60 font-bold"\>Target Model\</label\>  
            \<select  
              value={selectedModel}  
              onChange={(e) \=\> setSelectedModel(e.target.value)}  
              className="w-full py-2.5 px-3 rounded-lg border border-black/10 bg-\[\#f5f5f0\] text-\[14px\] outline-none"  
            \>  
              {availableModels\[selectedProvider\].map((model) \=\> (  
                \<option key={model} value={model}\>{model}\</option\>  
              ))}  
            \</select\>  
          \</div\>

          {/\* Extended Thinking Controls \*/}  
          \<div className="flex flex-col gap-3 p-4 bg-\[\#f5f5f0\] rounded-xl border border-black/5"\>  
            \<div className="flex justify-between items-center"\>  
              \<label className="text-\[12px\] uppercase opacity-60 font-bold"\>Extended Thinking\</label\>  
              \<input  
                type="checkbox"  
                checked={isThinkingActive}  
                onChange={(e) \=\> setIsThinkingActive(e.target.checked)}  
                className="w-4 h-4 accent-black"  
              /\>  
            \</div\>  
              
            {isThinkingActive && (  
              \<div className="flex flex-col gap-1.5 transition-opacity"\>  
                \<div className="flex justify-between text-\[11px\] font-semibold opacity-60"\>  
                  \<span\>Thinking Budget:\</span\>  
                  \<span\>{thinkingBudget.toLocaleString()} Tokens\</span\>  
                \</div\>  
                \<input  
                  type="range"  
                  min="1024"  
                  max="128000"  
                  step="1024"  
                  value={thinkingBudget}  
                  onChange={(e) \=\> setThinkingBudget(Number(e.target.value))}  
                  className="w-full accent-black cursor-pointer"  
                /\>  
              \</div\>  
            )}  
          \</div\>

          {/\* Prompt Entry Area \*/}  
          \<div className="flex flex-col gap-2"\>  
            \<label className="text-\[12px\] uppercase opacity-60 font-bold"\>Agent Request\</label\>  
            \<textarea  
              value={userQuery}  
              onChange={(e) \=\> setUserQuery(e.target.value)}  
              placeholder="e.g. Find and refactor performance bottlenecks in database connection pools..."  
              className="w-full h-32 p-3 rounded-lg border border-black/10 bg-\[\#f5f5f0\] text-\[14px\] outline-none resize-none"  
            /\>  
            \<button  
              onClick={triggerSearchAnalysis}  
              className="w-full py-3 bg-\[\#121210\] text-\[\#f5f5f0\] rounded-lg font-semibold uppercase hover:opacity-90 transition-opacity"  
            \>  
              Execute Agent Analysis  
            \</button\>  
          \</div\>  
        \</div\>

        {/\* Right Execution and Log Console \*/}  
        \<div className="lg:col-span-2 bg-\[\#121210\] text-\[\#f5f5f0\] p-6 rounded-2xl flex flex-col gap-4"\>  
          \<div className="flex justify-between items-center border-b border-white/10 pb-3"\>  
            \<span className="text-\[14px\] tracking-wider uppercase opacity-80 font-bold"\>Execution Stream Logs\</span\>  
            \<span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" /\>  
          \</div\>

          {/\* Real-time Streaming Output Container \*/}  
          \<div className="flex-1 min-h-\[300px\] max-h-\[500px\] overflow-y-auto font-mono text-\[13px\] flex flex-col gap-2 scrollbar-thin scrollbar-thumb-white/10"\>  
            {activeConsoleLog.length \=== 0? (  
              \<span className="text-white/40 italic"\>Waiting for execution request instructions...\</span\>  
            ) : (  
              activeConsoleLog.map((log, index) \=\> (  
                \<div key={index} className="border-l-2 border-white/20 pl-3 py-1"\>  
                  {log}  
                \</div\>  
              ))  
            )}  
          \</div\>  
        \</div\>  
      \</div\>  
    \</div\>  
  );  
};

## **Engineering Prompt Blueprint for Automated Interface Generation**

To simplify deployment and guarantee high fidelity, the following master instruction prompt is formatted for direct ingestion into automated UI code generators (e.g. Claude Code, Cursor, Replit Agent, or open models).19  
Role: High-Fidelity Front-End UI Engineer  
Task: Construct a highly responsive, clean, and interactive single-page application using React, TypeScript, and Tailwind CSS. The interface must use a minimalist, beige-toned aesthetic (\#f5f5f0, \#e6e6d8) to match the platform's professional coding utilities.  
FONTS & CSS VARIABLES

1. Load these display fonts in "index.html":  
   * Heading: [https://db.onlinewebfonts.com/c/5ac3fe7c6abd2f62067f266d89671492?family=HelveticaNowDisplay-Medium](https://db.onlinewebfonts.com/c/5ac3fe7c6abd2f62067f266d89671492?family=HelveticaNowDisplay-Medium)  
   * Body: [https://db.onlinewebfonts.com/c/1aa3377e489837a26d019bba501e779d?family=HelveticaNowDisplayW01-Rg](https://db.onlinewebfonts.com/c/1aa3377e489837a26d019bba501e779d?family=HelveticaNowDisplayW01-Rg)  
2. Define these global variables inside "index.css":  
   :root {  
   \--font-heading: 'HelveticaNowDisplay-Medium', 'Helvetica Neue', Arial, sans-serif;  
   \--font-body: 'HelveticaNowDisplayW01-Rg', 'Helvetica Neue', Arial, sans-serif;  
   }  
   body {  
   font-family: var(--font-body);  
   background-color: \#f5f5f0;  
   color: \#121210;  
   }  
3. Logo text elements must use var(--font-heading), while general body text elements use var(--font-body).

MOUSE-SCRUB CONTROLLED BACKGROUND VIDEO

1. Implement a full-screen HTML5 element:  
   * Styling: position: fixed; inset: 0; z-index: 0; object-fit: cover; object-position: 70% center;.  
   * Source URL: [https://d8j0ntlcm91z4.cloudfront.net/user\_38xzZboKViGWJOttwIXH07lWA1P/hf\_20260530\_042513\_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4](https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4)  
   * Attributes: muted, playsInline, preload="auto". Do NOT autoplay.  
2. Control video scrubbing using horizontal mouse movements:  
   * Track 'prevX' coordinates via a window 'mousemove' event listener.  
   * Calculate delta: delta \= currentX \- prevX.  
   * Convert delta to a video time offset: (delta / window.innerWidth) \* SENSITIVITY \* video.duration, using a SENSITIVITY of 0.8.  
   * Clamp the calculated target time strictly between 0 and video.duration.  
   * Prevent seek-flooding: Update video.currentTime and register an 'onSeeked' handler to process the next update only after the previous seek action completes.

NAVBAR COMPONENT (Fixed, z-index: 10\)

1. Padding: px-5 sm:px-8 py-4 sm:py-5. Layout: Flex row, justify-between, items-center.  
2. Left Logo: "Mainframe(R)" (registered trademark symbol) in black, text-\[21px\] sm:text-\[26px\], tracking-tight, using var(--font-heading). Next to it, render a static black asterisk (✳︎) at text-\[25px\] sm:text-\[30px\] with letter-spacing: \-0.02em.  
3. Desktop Navigation (hidden below md): Centered text-\[23px\] black links: "Labs", "Studio", "Openings", "Shop", separated by commas (,). Include hover transitions with opacity-60.  
4. Desktop CTA (right, hidden below md): Underlined "Get in touch" anchor tag, using text-\[23px\] black with hover:opacity-60 transition-opacity.  
5. Mobile Hamburger: Horizontal lines button that toggles between 3 lines and a close icon (top rotates 45deg, middle fades out, bottom rotates \-45deg). Toggling displays a full-screen menu overlay at z-index 9\.

HERO COMPONENT (z-index: 1\)

1. Full height h-screen, flex-col. Mobile alignment: justify-end, pb-12. Desktop alignment: justify-center, pb-0. Padding: px-5 sm:px-8 md:px-10.  
2. Intro Label (non-interactive, color black):  
   * Font size: clamp(18px, 4vw, 26px). Apply text blur filter (blur(4px)).  
   * Render these lines:  
     Line 1: "Hey there, meet A.R.I.A,"  
     Line 2: "Mainframe's Adaptive Response Interface Agent"  
3. Typewriter Component:  
   * Implement custom useTypewriter hook (38ms per character typing speed, 600ms initial start delay).  
   * Target text: "Glad you stopped in. Good taste tends to find us. Now, what are we building?"  
   * While typing, display a blinking cursor using step-end animations. Remove the cursor once typing is done.  
4. Action Pill Buttons:  
   * Animate entry (opacity 0-\>1, translateY(8px)-\>0) triggered 400ms after window registration, without waiting for the typewriter to finish.  
   * Pill Buttons 1-4 (White, black text, border-black/10, rounded-full, text-\[13px\] sm:text-\[15px\]): "Pitch us an idea", "Come work here", "Send a brief hello", "See how we operate". On hover, invert colors (bg-black, text-white).  
   * Pill Button 5 (Outline style, border-white, transparent background): Text "Reach us: hello@mainframe.co" (underlined) and a inline double-overlapping rectangle copy SVG. On click, copy email to clipboard using navigator.clipboard.writeText.

METRICS CAROUSEL AND INSTRUMENTATION DASHBOARD

1. Once the user clicks "See how we operate" or scrolls past the hero section, reveal the active execution cockpit.  
2. Build a horizontal scrollable metrics carousel displaying:  
   * Indexed Codebases: "48 Repositories"  
   * Processed AST Nodes: "1,412,804 Nodes"  
   * Applied Patches: "4,912 Patches"  
   * Average Thinking Tokens: "12,410 Tokens"  
   * Connected MCP Servers: "8 Operational"  
3. Add a model selector allowing operators to toggle providers (Anthropic, DeepSeek, OpenAI) and models (claude-3-7-sonnet, deepseek-reasoner, o3-mini).  
4. Include real-time configuration fields for thinking budgets (0k up to 128k output limits).  
5. Build a real-time terminal window displaying agent execution outputs, streaming both thinking traces and output completions.

No additional UI libraries may be used. Keep all components modular, clean, and highly performant.

## **Technical Baseline and Component Configuration**

To demonstrate the system's runtime configuration, this section details the initialization of stateful tool loops, unified adapters, and the vector storage engine.

### **Backend Application Entry Point**

The following FastAPI setup configures dynamic WebSockets, registers multiple MCP servers, and manages real-time streaming connections.3

Python  
\# backend/app/main.py  
import os  
import json  
import asyncio  
from fastapi import FastAPI, WebSocket, WebSocketDisconnect  
from fastapi.middleware.cors import CORSMiddleware  
from app.core.orchestrator import UnifiedModelRouter  
from app.mcp.client\_manager import MCPMultiServerManager  
from app.vectorstore.chroma\_client import ChromaCodeIndexer

app \= FastAPI(  
    title="Autonomous Refactoring Platform Backend",  
    description="Orchestrates AST parsing, ChromaDB indices, multi-server MCP sessions, and multi-model routing loops."  
)

\# Configure CORS for sandbox testing  
app.add\_middleware(  
    CORSMiddleware,  
    allow\_origins=\["\*"\],  
    allow\_credentials=True,  
    allow\_methods=\["\*"\],  
    allow\_headers=\["\*"\],  
)

\# Initialize platform controllers  
router\_engine \= UnifiedModelRouter()  
mcp\_manager \= MCPMultiServerManager()  
code\_indexer \= ChromaCodeIndexer(database\_directory="./chroma\_db")

@app.on\_event("startup")  
async def startup\_initialization\_routine():  
    """  
    Startup sequence to register and connect to default MCP servers.\[3, 11, 23\]  
    """  
    \# Register filesystem MCP server \[11\]  
    mcp\_manager.register\_stdio\_server(  
        server\_identifier="filesystem\_service",  
        execution\_command="npx",  
        execution\_arguments=\["-y", "@modelcontextprotocol/server-filesystem", os.path.abspath("./sandbox\_workspace")\]  
    )  
      
    \# Establish connections to all registered servers on startup \[14, 21\]  
    await mcp\_manager.initialize\_all\_connections()  
      
    \# Harvest server tools and convert them to LangChain definitions   
    await mcp\_manager.harvest\_registered\_tools()  
    print("All MCP connections successfully initialized and pooled.")

@app.websocket("/ws/refactor-stream")  
async def handle\_refactor\_websocket\_stream(websocket: WebSocket):  
    """  
    WebSocket endpoint that processes incoming user requests, manages agent execution states,  
    and streams thinking logs and completions to the front end.\[8, 18\]  
    """  
    await websocket.accept()  
    try:  
        while True:  
            \# Receive configuration payload from the cockpit front end  
            received\_message\_raw \= await websocket.receive\_text()  
            payload \= json.loads(received\_message\_raw)  
              
            provider \= payload.get("provider", "anthropic")  
            model\_name \= payload.get("model", "claude-3-7-sonnet")  
            messages \= payload.get("messages",)  
            thinking\_budget \= int(payload.get("thinking\_budget", 16000))

            \# Stream model completions and thinking traces \[12, 18\]  
            async for update in router\_engine.execute\_stream(  
                provider=provider,  
                model\_name=model\_name,  
                messages=messages,  
                thinking\_budget=thinking\_budget  
            ):  
                await websocket.send\_json(update)  
              
            \# Send completion notification \[12\]  
            await websocket.send\_json({"type": "status", "content": "Execution cycle complete"})

    except WebSocketDisconnect:  
        print("WebSocket client connection closed gracefully.")  
    except Exception as runtime\_err:  
        await websocket.send\_json({"type": "error", "content": f"Platform crash: {str(runtime\_err)}"})

## **Comparative Architectural Performance Metrics**

To guide infrastructure configuration and deployment planning, this section compares the operational performance of key system components. The metrics contrast traditional approaches with the optimized, AST-driven and sandbox-verified patterns defined in this specification.2

Chunking Retrieval Recall (Recall@5)  
Traditional Line Splitter:  ██████████████░░░░░ 70%  
AST-Based cAST Splitter:   ███████████████████ 95% 

Refactoring Verification Pipeline Efficiency  
Direct Code Block Swap:    ████████░░░░░░░░░░░ 40% (high compilation failures)  
PatchPilot Sandbox Loop:   ██████████████████░ 90% (validated compilation) 

The table below contrasts traditional approaches with the targeted, performance-optimized architectural configurations defined in this blueprint.

| Operational Benchmark | Standard Approach | AST & Sandbox Blueprint | Primary Bottleneck Addressed | Metrics Difference |
| :---- | :---- | :---- | :---- | :---- |
| **Retrieval Accuracy** | Line-count splitting 2 | AST structural division 1 | Logical blocks cut across lines 2 | ![][image13] Recall@5 improvement 2 |
| **Code Modification** | Raw output rewrite 6 | Unified Diffs & budgets 10 | AI replaces unrelated blocks 10 | ![][image14] context overhead reduction 17 |
| **Verification Loop** | Manual evaluation | Sandbox compilations 6 | Broken code slips to main repository | ![][image10] manual checks required 5 |
| **Tool Integration** | Custom API adapters | Stateful MCP server pool 3 | Custom code needed for new tools 3 | Instant, multi-tool orchestration 14 |
| **History Storage** | Direct payload cache | History sanitization layer 8 | Reasoning logs trigger 400 errors 8 | ![][image4] DeepSeek API crash immunity 8 |

This architectural comparison illustrates the reliability and efficiency gains achieved by integrating structural code parsing, sandboxed validation, and multi-provider route managers.2

## **Platform Conclusions and Operational Recommendations**

Developing a model-agnostic code analysis and refactoring platform requires balancing dynamic model routing, semantic code indexing, and safe modification mechanisms. This architectural analysis yields several key operational recommendations:

### **Structural Code Contextualization**

Traditional linear text splitting degrades retrieval quality by fragmenting logical code structures.2 Implementing structural segmentation via **Abstract Syntax Trees (cAST)** ensures that logical components remain intact.1 Storing these cohesive, syntax-aware chunks in ChromaDB improves the accuracy of downstream code generation tasks.1

### **Provider Interoperability Constraints**

Developing a model-agnostic platform requires managing differences in how individual models handle internal reasoning and tool execution. For instance, the system must support Claude 3.7 Sonnet's detailed thinking budget payloads and double-turn signature requirements.18 Simultaneously, it must sanitize DeepSeek R1's non-standard reasoning\_content fields before appending them to the conversation history to prevent API crash loops.8 These mitigations should be handled by a dedicated processing layer at the edge of the orchestration stack.8

### **Defensive Autonomous Refactoring**

To prevent agents from generating broken or insecure code, the system must enforce strict operational boundaries.6 Applying changes via **Unified Diffs** constrained by a localized **Line Budget** (e.g., 120 lines maximum) minimizes modifications and keeps code clean.10 These changes are applied and tested in path-restricted, sandboxed workspace directories.6  
By combining standardized interfaces like the **Model Context Protocol** with structured verification loops, developers can build a secure, efficient, and model-agnostic environment for automated software engineering.3

#### **Works cited**

1. Chunking \- Chroma Docs, accessed June 3, 2026, [https://docs.trychroma.com/guides/build/chunking](https://docs.trychroma.com/guides/build/chunking)  
2. cAST: Enhancing Code Retrieval-Augmented Generation with Structural Chunking via Abstract Syntax Tree \- arXiv, accessed June 3, 2026, [https://arxiv.org/html/2506.15655v1](https://arxiv.org/html/2506.15655v1)  
3. Model Context Protocol (MCP) \- Docs by LangChain, accessed June 3, 2026, [https://docs.langchain.com/oss/python/langchain/mcp](https://docs.langchain.com/oss/python/langchain/mcp)  
4. Implement RAG chunking strategies with LangChain and watsonx.ai \- IBM, accessed June 3, 2026, [https://www.ibm.com/think/tutorials/chunking-strategies-for-rag-with-langchain-watsonx-ai](https://www.ibm.com/think/tutorials/chunking-strategies-for-rag-with-langchain-watsonx-ai)  
5. PatchPilot: A Stable and Cost-Efficient Agentic Patching Framework \- arXiv, accessed June 3, 2026, [https://arxiv.org/html/2502.02747v1](https://arxiv.org/html/2502.02747v1)  
6. GPT-5.1 Apply Patch Tool: Automated Code Editing in AG2, accessed June 3, 2026, [https://docs.ag2.ai/latest/docs/blog/2025/12/22/GPT-5.1-Apply-Patch-Tool/](https://docs.ag2.ai/latest/docs/blog/2025/12/22/GPT-5.1-Apply-Patch-Tool/)  
7. I Tried to Use Langchain with MCP Servers, Here're the Steps: \- Apidog, accessed June 3, 2026, [https://apidog.com/blog/langchain-mcp-server/](https://apidog.com/blog/langchain-mcp-server/)  
8. Pointed LangChain at a non-OpenAI endpoint last week, structured output and reasoning\_content started acting weird \- Reddit, accessed June 3, 2026, [https://www.reddit.com/r/LangChain/comments/1ttg1c1/pointed\_langchain\_at\_a\_nonopenai\_endpoint\_last/](https://www.reddit.com/r/LangChain/comments/1ttg1c1/pointed_langchain_at_a_nonopenai_endpoint_last/)  
9. Enhancing LLM Code Generation with RAG and AST-Based[https://api-docs.deepseek.com/guides/reasoning\_model](https://api-docs.deepseek.com/guides/reasoning_model)  
10. .0  
11. ChatDeepSeek integration \- Docs by LangChain, accessed June 3, 2026, [https://docs.langchain.com/oss/javascript/integrations/chat/deepseek](https://docs.langchain.com/oss/javascript/integrations/chat/deepseek)  
12. Practical Guide to MCP (Model Context Protocol) in Python \- DEV Community, accessed June 3, 2026, [https://dev.to/m\_sea\_bass/practical-guide-to-mcp-model-context-protocol-in-python-ijd](https://dev.to/m_sea_bass/practical-guide-to-mcp-model-context-protocol-in-python-ijd)  
13. Model context protocol (MCP) \- OpenAI Agents SDK, accessed June 3, 2026, [https://openai.github.io/openai-agents-python/mcp/](https://openai.github.io/openai-agents-python/mcp/)  
14. LangChain MCP: Integrating LangChain with Model Context Protocol \- Leanware, accessed June 3, 2026, [https://www.leanware.co/insights/langchain-mcp-integrating-langchain-with-model-context-protocol](https://www.leanware.co/insights/langchain-mcp-integrating-langchain-with-model-context-protocol)  
15. MiniMax M2.5 Agentic Coding: Multi-File Refactor, Tool Calling & CI \- Verdent Guides, accessed June 3, 2026, [https://www.verdent.ai/guides/minimax-m2-5-agentic-coding](https://www.verdent.ai/guides/minimax-m2-5-agentic-coding)  
16. Building with extended thinking \- Claude API Docs, accessed June 3, 2026, [https://platform.claude.com/docs/en/build-with-claude/extended-thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)  
17. Claude 3.7 Sonnet and Claude Code \- Anthropic, accessed June 3, 2026, [https://www.anthropic.com/news/claude-3-7-sonnet](https://www.anthropic.com/news/claude-3-7-sonnet)  
18. Anthropic's Claude 3.7 Sonnet hybrid reasoning model is now available in Amazon Bedrock, accessed June 3, 2026, [https://aws.amazon.com/blogs/aws/anthropics-claude-3-7-sonnet-the-first-hybrid-reasoning-model-is-now-available-in-amazon-bedrock/](https://aws.amazon.com/blogs/aws/anthropics-claude-3-7-sonnet-the-first-hybrid-reasoning-model-is-now-available-in-amazon-bedrock/)  
19. Demystifying the Model Context Protocol (MCP) with Python: A Beginner's Guide | by Mostafa Wael | Medium, accessed June 3, 2026, [https://mostafawael.medium.com/demystifying-the-model-context-protocol-mcp-with-python-a-beginners-guide-0b8cb3fa8ced](https://mostafawael.medium.com/demystifying-the-model-context-protocol-mcp-with-python-a-beginners-guide-0b8cb3fa8ced)  
20. DeepSeek R1 \`reasoning\_content\` not accessible · Issue \#32845 \- GitHub, accessed June 3, 2026, [https://github.com/langchain-ai/langchain/issues/32845](https://github.com/langchain-ai/langchain/issues/32845)  
21. langchain\_mcp\_adapters \- LangChain Reference Docs, accessed June 3, 2026, [https://reference.langchain.com/python/langchain-mcp-adapters](https://reference.langchain.com/python/langchain-mcp-adapters)  
22. Claude's extended thinking \- Anthropic, accessed June 3, 2026, [https://www.anthropic.com/news/visible-extended-thinking](https://www.anthropic.com/news/visible-extended-thinking)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAAAWCAYAAACMq7H+AAAAvElEQVR4Xu3VsQkCQRCF4SdiIIKJoBiKgmBkZm4DgpGRLdiAHYgNCFZgAV6siZHFWIFvGBV3wWMvdd8HfzTZMHcLiIjI32qzLbuwYTTLXoft2JXNWT0c523AjvDLmbFaOM7bmJ1eTaDlfNgi7FrO8OuxK5LIgj3YErqcUvpBV/B+6m/wC9OySrTYht3ZmjXDsXxrsBV8WbY0W578YJ+dfX4FG0UzEUlm/50e6yfURaYv3pQdEtvDlyUilTwBlyAZcxGg/R0AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAWCAYAAABwvpo0AAAAuklEQVR4Xu2VsQlCQRBER8RABBNBMRQFwcjs5zYgGBnZgg3YgdiAYAUW4I81MbIYK/izrAZ3GFzq7j540UY3c3sHBEEQBEX06YHe6TSbmWZAj/RBV7Sdju0yoRdo4xVtpWO7zOn14wJODi6HlJZv0NalfVes6Ztu4KTxX7h97HK+390TejPcBtGje/qiO9pNx37o0C00CAlEgnGJrIKsRE1n2SwI/hzZ8xEdFziEwZ9hSc+FnqBBBIEBGlI1GXP3ezhHAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAWCAYAAADafVyIAAAB4klEQVR4Xu2UOyxFQRCGR5CQeETjkVAQj4iGCJWoFBRE0HhUEtGQeBREJREFEZ0Q1RUFFQ0FCkJDNBqPRkGjoqLR8P93du/Zu/fcoNHwJ985Z3b3zOzOzq7IX1QWyAepfocj9mX7jd9RFzgDM2AHFMZ3R0Xn02DC78gEfWAdLIKq+G4pAVegydgD4AXMggpQBFrBITgQXWlMueAIzJmOWnADup0xbeABFBu7DCyDUtAD+kGn6MrqzJiYpsAlyHPa+MMtKDA2xzAAZ0rxvSHxMx2WkNTQKZ1zsKsG8Ao6jM38uwG4kjWQYewasCleaqhq8CyJAerBG5g3NvfkTjQwxXyPm2/uX0RCUkNZR8kC2PYUMAlOwSDYk2A/mJaE1Fi1gw/5OoBVueg/OcbmrLclSA1XyirsBelsYHX8JIArOqVzm5pGcGHsITDGxmSOkrW7clOTBrYk2DPuC4sgWs9PkujIBuCpDZOfGpbzvWg5W43ywQEnYF+CkqNawLt5+/JTQ7F8WcZugBH7wWP/KHoqKVYMT/W56Cn3xbTwULni5cZ7ygagjyXbyd1eBceix53Or0WvDF+cdUQ0x77ofFfUH6stugdWjFgpeq80m0G+mMIV0Z/DxKALoivh3RY2wX/9sj4BxTVXTOBB9H4AAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAWCAYAAAC2ew6NAAACoklEQVR4Xu2VzauNURTG1y2KkI9bpMhHPjIQhZSQAWJAykfCX4ARoWSgMGAgkUQmBiJSJAMRt0zEQCkMDERkZCImSjw/a6979tn33efekaTz1K9z3rU/3mfv9e61zbr6vzRO9IqesiHTcDGqDP4tYWy/uCNOiYvWbGakOC82lg1outheBjPNNZ/8kthhPlkpYrTRh76MybVIvBYzzU0fE5/EHjFNTBFbxQtxQQzzYWbzxG7xSPwUV6Kh0GbzFywUo81f8ECMzfrwnxht9KEvYxgb2ieeiDHpebk4YO6DTdoptonb5qb7RYdNYpn4aM1Gp4q35pOExovnYm8WO5RitIUY80ZMSs/M32e+EMQOn0v/Ebt80iopR5PFe2s2ysu+m08aYsKr1nppGC/HLxHfrPXiw9ZulPbj6T9aI85YlvJSnYyetYFGEX0/m39vZOZLiuViDGNPpOdV5tmJtPLZxSImihtZW6M6GSVWMxrxMFSOL+OUHA7JTfMDdN18d9lBdrKa8lDNKJP02eBGN4hfKZarNIp6xALzNEflwGCknPal4rRYl9r7VTNKjXtogxtdb0M3WopU30q/iCrBO2eLI9EpVDOKckO1eM1QLR4qU06Je2qtChPVol+djHIQakYpaewEB4qDVY4Po5z2JuUpR3wSX80/JcRn0KZORpmMy2B1Fhsh7iX4H99yPIcY8yP9lipTjmJhYXSAwii1sVxFr3gmjmaxWea7mV+5u8QHMSM9Mw+3FKnMbzAUKedA5cI084bRqLd/VkoDO8ZhAAr0SzE/OkmLxTtxUGwxL+7cIJSbUJSex+a3HSZfmV+lpcgS48tNYQGXs7YV7c1DExVgrbkJrtUmMfkc88WstPaFhMgQZvht0gRxTdwXd4u2rrr65/QbxPqXiTq7DLEAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAWCAYAAADTlvzyAAAArUlEQVR4XmNgGAWjgIaAD4hrgPgQECujyVEVCANxNxAfBmInIGZGlaYeUATiuQwQH5kDMSOqNPWAOhCvhmItBhpZBDIU5IvtDBBfgXxHU+APxJ+AOIiBRj7CBuiWONABLPmfYID4nG4WcwNxPhCfA+I4IOZElaYdYAXiCAaIxSAHgBxCFwAKWlAQ7wBiFTS5UYABQPEkDsSSRGAxBiqkXAMgnkUk7mWAWDwKsAIAPnoZc5XfHuwAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAAWCAYAAAB64jRmAAADJ0lEQVR4Xu2WS6hNURjH/0IRkUckRB5JCsUdUZTHjORRYmCGgTJQ3gORAQPhMhF5lMT8ljA4A0WUR3mURygRYiDMPL7f+fY6Z+11997n3tE1OL/6n7P3Wt9e+/vWt9a3l9SmTZs+op9psmmVaZZpYNaWY7Bpg+mM6bBpQr67zgzTUbkNtjxTxUXT3x7oqWm0aavpR9L3zfQhu/5kOmIapjzDTVdM100b5TYPTHtjo5mmR6Y98uDWme6ZxkQ2a0zPTHNNQ02HTDflL6iC2bxs+mXqSPqGyMd5p/yk4hxB4XDMbNNr0xPTpKyN8Y+brsmzF6D/RbghEB4iQB7gxbdMP03zMpuJppfKv3SE6b5pW9RWBhmNx4thNVxVvm+XPMgVUVtgi7zvlNzf8aa36j4hsD5cMOBXeTYDS0y71VyODJA6GTJUk2e2iqIgB2UCMhcHVBUkbfTV5O9lTMZmi6VM4YeldleekVGZyGz/pl2dk+ruJOD8R2WDVVAU5Go1g2ALLIj6qoJkwunrkk8Se5k9zfhsqXjJ1q/JHlkk0NOmfaZO+UO8OFDkZFV7SmrHCrmg4iCgLEicZu/9Ni2L2ncoX6xI2nZ50hqp/iOfWWAZUp2ey4sBS6KW2aXBpM6XEarsZ+WrZxpEIAR5Q17J0TnTq0yLmqZ1WHnUBopbHOwXOkOQZI60B8K6Z5MXFaJAb4KM7RjzkloHSeUdF4nMkIQyCHaq3O+H8jE0x/Rd3YtHCBLnIHUyUNaeUmTH3moVJP+tYMKmp43ypX2ei7Hy705N1UFSuVIngf73Kj44xBQFGVfXlN4EyZidaWPGQn4GyE8KbFS+e4F4ucJK+WZf2rBwB7sylTkbKAqyit4GeUeesJSOcEGVYoMGB9LCA+wFTkAHsnuYJs9i44NbAuPxPa0qNCnhxNPTIJnAs8ofM3kve7oOa3e/6Y1pszz1OD8/GGRwj81O01p59pmM+LuUckx+9gzVDnEOpb0Izq5U4Nie+3gFpRDkbdNB+dY7Ydokr8yPI7s6HN04wS+Xb+YiaKcfO+z/B0bKj3bAtlksTwLBp4eaNm3a9DH/AIrP1x5sFkfDAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAZCAYAAAAIcL+IAAAA10lEQVR4Xu3RMQsBYRzH8b8wUTaKQQxKySuQkQwMXoGJxS4vQMpokngHXoKBzaSsShlksyoZ+P49d3pcjMrgV5/u7nfP9fzvTuSfb8SPLEoIIYj0ywqSwQp9NLHEGj17URJbdOFzugZuqDnXEsAEB6TcknRwEjPKI3qixUzMQxo96vUCYaeTqpgtWm5BEthjaHXPhRWrK+Ai1nyanJit3TKCudM959PoW7axwVTMZzmKZz47WkYRx048872LzndF3XvDjf6uGAY4oywfts5jhLGl+LLix3MHeOMkCyTlYvkAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAaCAYAAABhJqYYAAAA30lEQVR4XmNgGAUMPEAsBsTM6BLIwBGIfwLxfyDeA8TcqNKYQAaInwBxK7oENmDDADHdD10CGygH4rdArIkuAQIgT4AkfIFYHIjXAPEBBognUQBI0QUgbgfiNCj7FxBPQlYEAvJAfAuIK4GYESqWwAAJCRT3gkwEuQtkJQtUDERjdQLIfSAT0pHEpIH4AQMWJ8AUeyKJgYLsNxAHAbElEBfCJHQYIM6AuY2fARJjX4HYGIirgdgFKgf2UA4QXwTiuUC8G4gDgfgKEO8E4l4gZoUphgH0BANSIILEHwXkAwC2TiTPu2XIQAAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,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>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAWCAYAAAASEbZeAAAAvklEQVR4Xs3RMQtBURjG8degKCWTmYFsSlaTxUCKCd9DWXUXX0DZfAiTgVGZsVtMNhYL//eec3JuUne8T/26vec8p1vniCQ7WYywwgLV6LZIHlvMkUMdZwz80hRHFLy1MS4o6qAbWlh7BU0TD/R0qOEuv6UGngj84V8pXO/i7QYvkVJHYpRi/a6Mmxu8uNJMB728PTbIfDvSxst+w0xwRcnOKTG3fxDzGmHSWGKHvi2cxDxPJHq6giFaYg4mNh8M7Sjjh2TpgQAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAaCAYAAACO5M0mAAAA1UlEQVR4XmNgGFpAEohrgXgWEDcCsQqqNASYAfFuILYFYn0g3grE/4G4GIgZYYo4gXgDECcBMTNUTBiITwHxVyA2hoqBrXwIxJ8YIKbBQBUDxNQimAArEE8E4p0MEE0wUM4AUQiicQIWIF4DxH+B2AFVChWYM0DcBwoBkI1YAT8Q7wHixUDMjSYHByDdM4C4jwESGjgBUQphiioZEOGpCcRucBUMkNAHxUIhlA0D6UAcBOOAJBKA+BsQPwHiR0j4HRDbwBTCYgYUuOj4ORArwRSOAsoBAOCsJ6IkC06cAAAAAElFTkSuQmCC>

[image12]: <data:image/png;base64,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>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC8AAAAWCAYAAABQUsXJAAACyklEQVR4Xu2WS6iOQRjHH6HIfeNS5JLLgkLCBllQLJRcQkQRlkK5bk5hQZKNko2DhIQUC5eFWMmChSISRygLrCgk/r/zzHjnnb73nPccSun869f3zTvzzvefeZ555jPrUpei+orBonvekYi+fvnDf60l4p7YIy6LoeXuVmF8l9iWd3RWE8QhcUJsF8PK3dZLrBWTwncMDBebxKgwZoR4JGaF9hrxUTSJceZzLhA3xQ3zCP2xlopLYrKYLR6Kb+a7GDVQ3Bc/Mw6LnmHMQtFivig0RhwRo8UysVosNo/I1DCmUkPMd7JP3pGIMYR5nugWno0V78Rz891E7NJ18Vi8EM1iphXvoJ3m5mPU+Dxl5R3ebDXTpdHLuaaJz+aGWAjC0FnznWU3EXMwV55OqYhUap4IHDdPMzRRnLG2/fxWHfMDzFPmpJXH8R7mF4V2HfOcm6diemiT31vD997m0Wo3XaLqmG+kQeKBeG9uCDHHBfMcJnXeiqtWHFZExDjsd8V6cc2K/CdVaqVLVGfNrxA/xA4rcpo5qBD08Qz2iWdiZBgTxZkhYv1Dm90+b4WPWNlWhXZrNcBsCtXjovlkeV/VgjDyxLy8xSqCMMulEheDSI8v5mOrxO9gPKbLDPOqRXsjD6gme80rSwqH7qV5Pud9G3gxE/lPRdlibd+OUfGw37bqipamSw9xThwIbc5BpTqSNtF4TAs0R0wJ3w+K72J+aKNo/o41/o08XahmVDVKaruqa570OGrlSwntt6JyMA/nIDUf04bIpumE8nRB+Gmxv2ge403iq3id8Ea8Mr8l0Urz/yPRJJ+7xSfzPM5FqnAhpeLMcCFG8/mCS6pjPoY+v/aBcknZRCzymPmdsE6cFh+suMRSsdvN1jinMX7FfD4KSaXqmO+I2Knx5v9T5lpxc6biGYusMsaCOD9E4FbWVxKml5uf8i516X/RL+ZohySrlu0kAAAAAElFTkSuQmCC>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAWCAYAAABOm/V6AAACQUlEQVR4Xu2VT0iVQRTFj2RQaLQwkshINMEgaCERQYlBQZsiFCkS3OYucGGkgqugvxBuFG2jEUUkrgQhV7qIcNNehAoRXJgrN7qoc7zffM5c30vB3L0DP957M/N9c+69c+cBJR2sDpGTpNJPOFWQw37wf+g4mSQvySfSScqSFaZzsHU1YeAWGScXyClHNYq7vUteuLHH5DMpJ1XkK5mF7aH3NZBeskLuZM9sSQ/+KcIqOb+9NFctWSRj0ZjSOwPbJOgJaSYtpIPcJ4/IIMxorrew1IxEjJIfpAc706nM6BmZjE0o0p+woIL0/Xb0W2dFZcrLIOnwDJET8SB1mbwjR9241E5ekyWkJo6ROaQmFMSN7LuCeQ5XBkmbaMM4NXKrup6NxoJqYZlqhEUdm5Bk7j1sQ717mJzO5m6SN3BlKCQtUL3u+QlYGV7BTIfUexMyPk/6YBt2Z+NK/0T2uauukS+wVvNqg71UURYzISkDivoibK0Ck6FQBs0/gHVWfTaWS4s/wDLhpQh1WIO5f5nw0uahDMqmyjkA6zod8ES6J9ZgrRRLDz+DlSForyZ8Ga6QBVKX/db9keghrO3ilpJ0UHXqf0Usw9ZuZL+78tXb8mWQVE6ZVxDSjjOi1GySq36igPaSibgMQWrf2ET43NIRMkXWSVM8UUSKQPdEaEcvzetSUhZjtSI1kewVrtzdTGjdR1gZwtX+G2k5QhnUIV5nyHdyHWa+P522DlAp9Fe8H7XAXl4oQ9Il8o1Mk6durqSS8Bf8ZGzejG5wdwAAAABJRU5ErkJggg==>