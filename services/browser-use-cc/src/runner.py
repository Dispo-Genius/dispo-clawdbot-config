#!/usr/bin/env python3
"""
browser-use runner for Claude Code.

Executes AI-driven browser automation tasks using the browser-use library,
connecting to Brave via CDP and optionally solving CAPTCHAs via CapSolver.
"""

import asyncio
import os
import sys
import json

from browser_use import Agent, Browser, ChatAnthropic


async def main():
    task = os.environ.get("TASK")
    if not task:
        print(json.dumps({"error": "TASK environment variable not set"}))
        sys.exit(1)

    cdp_port = int(os.environ.get("CDP_PORT", "9222"))
    screenshot_path = os.environ.get("SCREENSHOT_PATH")
    capsolver_key = os.environ.get("CAPSOLVER_API_KEY")

    # Configure browser to connect to existing Brave instance via CDP
    browser = Browser(cdp_url=f"http://localhost:{cdp_port}")

    # Configure Anthropic LLM (uses ANTHROPIC_API_KEY from environment)
    llm = ChatAnthropic(model="claude-sonnet-4-5")

    # Configure CapSolver if API key is available
    agent_kwargs = {}
    if capsolver_key:
        agent_kwargs["captcha_solver"] = {
            "provider": "capsolver",
            "api_key": capsolver_key,
        }

    try:
        # Create agent
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            **agent_kwargs,
        )

        # Run the task
        result = await agent.run()

        # Take screenshot if requested
        if screenshot_path:
            page = await browser.get_current_page()
            if page:
                await page.screenshot(path=screenshot_path)

        # Output result
        output = {
            "success": True,
            "result": str(result) if result else None,
        }
        if screenshot_path:
            output["screenshot"] = screenshot_path

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
        }))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
