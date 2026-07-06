"""
Smart Model Router.

Automatically selects the optimal model (reasoning vs speed vs cost)
based on the required agent role.
"""

from typing import Tuple
import os

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents import AgentRole

class SmartModelRouter:
    def __init__(self):
        self.openai_key = os.environ.get("OPENAI_API_KEY") or None
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY") or None
        self.deepseek_key = os.environ.get("DEEPSEEK_API_KEY") or None
        self.google_key = os.environ.get("GOOGLE_API_KEY") or None

    def get_llm_for_role(self, role: AgentRole):
        """
        Returns an initialized LangChain chat model optimized for the role.
        """
        # Deep reasoning tasks
        if role in [AgentRole.PLANNER, AgentRole.ARCHITECT]:
            if self.anthropic_key:
                return ChatAnthropic(
                    model="claude-3-7-sonnet-20250219",
                    anthropic_api_key=self.anthropic_key,
                    max_tokens=64000,
                    temperature=1.0,
                    thinking={"type": "enabled", "budget_tokens": 16000},
                    extra_headers={"anthropic-beta": "output-128k-2025-02-19"}
                )
            elif self.deepseek_key:
                return ChatOpenAI(
                    model="deepseek-reasoner",
                    openai_api_key=self.deepseek_key,
                    base_url="https://api.deepseek.com",
                    temperature=1.0,
                )
            
        # Code generation tasks (Speed + Accuracy)
        elif role == AgentRole.CODER:
            if self.anthropic_key:
                return ChatAnthropic(
                    model="claude-3-7-sonnet-20250219",
                    anthropic_api_key=self.anthropic_key,
                    temperature=0.0
                )
            elif self.openai_key:
                return ChatOpenAI(
                    model="gpt-4o",
                    openai_api_key=self.openai_key,
                    temperature=0.0
                )
                
        # Fast evaluation tasks (Review, QA)
        elif role in [AgentRole.REVIEWER, AgentRole.QA]:
            if self.google_key:
                return ChatGoogleGenerativeAI(
                    model="gemini-2.5-flash",
                    google_api_key=self.google_key,
                    temperature=0.0
                )
            elif self.openai_key:
                return ChatOpenAI(
                    model="gpt-4o-mini",
                    openai_api_key=self.openai_key,
                    temperature=0.0
                )

        # Fallback to whatever is configured
        if self.openai_key:
            return ChatOpenAI(model="gpt-4o", openai_api_key=self.openai_key)
        elif self.anthropic_key:
            return ChatAnthropic(model="claude-3-5-sonnet-latest", anthropic_api_key=self.anthropic_key)
        else:
            raise ValueError("No API keys found for model routing.")
