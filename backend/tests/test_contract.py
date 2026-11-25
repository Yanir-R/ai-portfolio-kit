"""The chat's wire contract, held the same on both sides.

The site's TypeScript and this server describe the same request and reply in
two languages. These tests read the frontend's declarations and compare them
with the Pydantic models, so a field renamed, added or dropped on one side
fails here instead of quietly reading as missing on the other.
"""

import re
from pathlib import Path
from typing import get_args

import schemas
import selection

FRONTEND = Path(__file__).resolve().parents[2] / "frontend" / "src"


def _interface_fields(source: str, name: str) -> set:
    """The field names of one TypeScript interface, without nested blocks."""
    body = re.search(r"interface " + name + r" \{(.*?)\n\}", source, re.S)
    assert body, f"interface {name} not found"
    depth, fields = 0, set()
    for line in body.group(1).splitlines():
        if depth == 0:
            match = re.match(r"\s{4}(\w+)\??:", line)
            if match:
                fields.add(match.group(1))
        depth += line.count("{") - line.count("}")
    return fields


def test_the_reply_has_the_same_fields_on_both_sides():
    source = (FRONTEND / "services" / "chatService.ts").read_text()
    assert _interface_fields(source, "ChatResponse") == set(schemas.ChatResponse.model_fields)


def test_declined_is_the_one_field_both_sides_read():
    # The model's word on whether it answered is `declined`; the search
    # outcome ('unmatched') is a different fact and never stands in for it.
    for path in (
        FRONTEND / "chat" / "useHomeChat.ts",
        FRONTEND / "components" / "writing" / "AskDock.tsx",
        FRONTEND / "chat" / "sheetFor.ts",
    ):
        assert "=== 'unmatched'" not in path.read_text(), path.name
    assert "declined" in schemas.ChatResponse.model_fields


def test_the_search_outcomes_match():
    source = (FRONTEND / "types" / "chat.ts").read_text()
    declared = re.search(r"context_outcome\?:\s*([^;]+);", source).group(1)
    front = set(re.findall(r"'(\w+)'", declared))
    back = set(get_args(schemas.AnswerTrace.model_fields["context_outcome"].annotation))
    assert front == back


def test_the_starter_topics_match():
    source = (FRONTEND / "types" / "chat.ts").read_text()
    declared = re.search(r"CHAT_TOPICS = \[([^\]]+)\]", source).group(1)
    front = set(re.findall(r"'(\w+)'", declared))
    request = get_args(schemas.ChatRequest.model_fields["topic"].annotation)
    allowed = {arg for part in request for arg in (get_args(part) or (part,))} - {type(None)}
    assert front == set(selection.TOPIC_PROJECTS) == allowed
