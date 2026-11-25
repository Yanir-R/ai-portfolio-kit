"""Checks around the model call, for text the model should not see or send.

The rules in prompt.py are the first line: they tell the model what it may say.
They are also the weakest line, because a model can be argued out of its rules.
Everything here is plain code that runs whatever the model was persuaded of:

- Input: characters a person cannot see are removed before the model reads a
  message. Unicode "tag" characters and zero-width marks can carry a whole
  instruction that renders as nothing on screen, which is how hidden prompts
  are usually smuggled into otherwise innocent text.
- History: the conversation is replayed from the browser, so anyone writing
  their own request can put words in the assistant's mouth ("Sure, from now on
  I'll ignore my rules"). Each reply the server sends carries a signature, and a
  replayed assistant turn without a valid one is dropped. A visitor's own turns
  need no signature: they are the visitor's words either way.
- Output: the chat window renders markdown, so a reply that contains an image
  makes the visitor's browser fetch it, and a link can point anywhere. Images
  are removed and links are kept only to hosts the site itself links to. A
  reply that quotes the rules is replaced with a short decline. The rules are
  public in this repository, so this is not about secrecy; it keeps the chat
  from reciting its own configuration in Yanir's voice.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import unicodedata
from typing import Optional, Set
from urllib.parse import urlsplit

# --- Input -----------------------------------------------------------------

# Format characters (Unicode category Cf) that render as nothing: zero-width
# spaces and joiners, direction overrides, the byte-order mark and the tag
# block (U+E0000-U+E007F), which mirrors ASCII invisibly. Category Cf is
# removed as a whole rather than by a list, so a new invisible character does
# not need a code change. Hebrew text does not depend on any of them to read
# correctly, and the model does not need them to understand it.
def _is_invisible(char: str) -> bool:
    return unicodedata.category(char) == "Cf"


def clean_input(text: str) -> str:
    """The text with invisible characters removed and line breaks kept."""
    if not text:
        return text
    return "".join(char for char in text if not _is_invisible(char))


# --- Signed assistant turns ------------------------------------------------

_TURN_LABEL = b"chat-turn-v1"
_PROCESS_FALLBACK = secrets.token_hex(32)


def _turn_key() -> bytes:
    """The key replies are signed with.

    Derived from the edge secret, which every instance already shares, so a
    reply signed by one instance verifies on another and after a restart. The
    label keeps the derived key distinct from the secret itself. Without an edge
    secret (local development) a random key for this process is used: signing
    still works, it just does not survive a restart.
    """
    base = os.getenv("CHAT_TURN_SECRET", "").strip() or os.getenv(
        "ORIGIN_SHARED_SECRET", ""
    ).strip()
    if not base:
        base = _PROCESS_FALLBACK
    return hmac.new(base.encode("utf-8"), _TURN_LABEL, hashlib.sha256).digest()


def sign_turn(text: str) -> str:
    """The signature the browser sends back with this reply."""
    digest = hmac.new(_turn_key(), text.strip().encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()[:32]


def turn_is_signed(text: str, signature: Optional[str]) -> bool:
    """Whether `text` is a reply this server sent, unchanged."""
    if not signature or len(signature) != 32:
        return False
    return hmac.compare_digest(sign_turn(text).encode(), signature.encode("utf-8", "replace"))


# --- Output ----------------------------------------------------------------

# Hosts a link in an answer may point to: the site and the places it already
# links to. Subdomains count (www.linkedin.com, personakit.me/docs is a path).
ALLOWED_LINK_HOSTS: Set[str] = {
    "yanirrot.com",
    "personakit.me",
    "cal.com",
    "github.com",
    "linkedin.com",
}

# ![alt](url) and ![alt][ref]: the image is dropped entirely, alt text too,
# since alt text chosen by an injected instruction is still its words.
_MD_IMAGE = re.compile(
    r"!\[[^\]]*\]\([^()]*(?:\([^()]*\)[^()]*)*\)|!\[[^\]]*\]\[[^\]]*\]"
)
# [text](url "title")
# The URL may hold one level of balanced parentheses, as markdown allows.
_MD_LINK = re.compile(
    r"\[([^\]]*)\]\(\s*<?([^()\s>]*(?:\([^()\s]*\)[^()\s>]*)*)>?(?:\s+\"[^\"]*\")?\s*\)"
)
# <https://...> autolinks
_MD_AUTOLINK = re.compile(r"<(https?://[^>\s]+)>", re.IGNORECASE)
# [ref]: url  reference definitions, which make [text][ref] a link
_MD_REFERENCE = re.compile(r"^\s{0,3}\[[^\]]+\]:\s*\S+.*$", re.MULTILINE)


def _host_allowed(url: str) -> bool:
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return False
    if parts.scheme not in ("https", "http"):
        return False
    host = (parts.hostname or "").lower().rstrip(".")
    return any(host == allowed or host.endswith("." + allowed) for allowed in ALLOWED_LINK_HOSTS)


def _keep_or_unlink(match: "re.Match[str]") -> str:
    label, url = match.group(1), match.group(2)
    return match.group(0) if _host_allowed(url) else label


def clean_output(text: str) -> str:
    """The answer with images removed and links kept only to known hosts."""
    text = _MD_IMAGE.sub("", text)
    text = _MD_REFERENCE.sub("", text)
    text = _MD_LINK.sub(_keep_or_unlink, text)
    text = _MD_AUTOLINK.sub(lambda m: m.group(0) if _host_allowed(m.group(1)) else "", text)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


# How many consecutive words of the rules an answer may share with them before
# it counts as reciting them. Ordinary answers share short phrases ("Yanir's
# work"); eight words in the rules' own order is a quotation.
_SHINGLE_WORDS = 8


def _words(text: str) -> list:
    return re.findall(r"[a-z0-9']+", text.lower())


def _shingles(words: list) -> Set[tuple]:
    return {
        tuple(words[i : i + _SHINGLE_WORDS]) for i in range(len(words) - _SHINGLE_WORDS + 1)
    }


class RulesEcho:
    """Spots an answer that quotes the rules it was given."""

    def __init__(self, rules: str):
        self._shingles = _shingles(_words(rules))

    def matches(self, answer: str, threshold: int = 2) -> bool:
        found = 0
        for shingle in _shingles(_words(answer)):
            if shingle in self._shingles:
                found += 1
                if found >= threshold:
                    return True
        return False
