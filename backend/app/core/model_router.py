"""
Smart Model Router.

Automatically selects the optimal model (reasoning vs speed vs cost)
based on the required agent role.
"""

import os

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents import AgentRole

class SmartModelRouter:
    def get_llm_for_role(self, role: AgentRole):
        """
        Returns an initialized LangChain chat model optimized for the role.
        """
        openai_key = os.environ.get("OPENAI_API_KEY") or None
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY") or None
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY") or None
        google_key = os.environ.get("GOOGLE_API_KEY") or None

        # Deep reasoning tasks
        if role in [AgentRole.PLANNER, AgentRole.ARCHITECT]:
            if anthropic_key:
                return ChatAnthropic(
                    model="claude-3-7-sonnet-20250219",
                    anthropic_api_key=anthropic_key,
                    max_tokens=64000,
                    temperature=1.0,
                    thinking={"type": "enabled", "budget_tokens": 16000},
                    extra_headers={"anthropic-beta": "output-128k-2025-02-19"}
                )
            elif deepseek_key:
                return ChatOpenAI(
                    model="deepseek-reasoner",
                    openai_api_key=deepseek_key,
                    base_url="https://api.deepseek.com",
                    temperature=1.0,
                )
            
        # Code generation tasks (Speed + Accuracy)
        elif role == AgentRole.CODER:
            if anthropic_key:
                return ChatAnthropic(
                    model="claude-3-7-sonnet-20250219",
                    anthropic_api_key=anthropic_key,
                    temperature=0.0
                )
            elif openai_key:
                return ChatOpenAI(
                    model="gpt-4o",
                    openai_api_key=openai_key,
                    temperature=0.0
                )
                
        # Fast evaluation tasks (Review, QA)
        elif role in [AgentRole.REVIEWER, AgentRole.QA]:
            if google_key:
                return ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    google_api_key=google_key,
                    temperature=0.0
                )
            elif openai_key:
                return ChatOpenAI(
                    model="gpt-4o-mini",
                    openai_api_key=openai_key,
                    temperature=0.0
                )

        # Fallback to whatever is configured
        if openai_key:
            return ChatOpenAI(model="gpt-4o", openai_api_key=openai_key)
        elif anthropic_key:
            return ChatAnthropic(model="claude-3-5-sonnet-latest", anthropic_api_key=anthropic_key)
        else:
            raise ValueError("No API keys found for model routing.")
