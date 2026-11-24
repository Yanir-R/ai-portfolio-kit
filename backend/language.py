"""Which language a visitor is writing in.

The corpus exists in English and, for most documents, in Hebrew. A Hebrew
question matched against English text finds nothing, so the language is read
from the question before any document is chosen.

Read from the letters typed and nothing else. The browser's language setting
is not a signal: plenty of Hebrew speakers run an English browser.
"""

from __future__ import annotations

from typing import Iterable

from context import ENGLISH, HEBREW


def _language_of(text: str) -> str | None:
    """The language `text` is written in, or None when it has no letters."""
    if any("\u05d0" <= char <= "\u05ea" for char in text):
        return HEBREW
    if any(char.isascii() and char.isalpha() for char in text):
        return ENGLISH
    return None


def detect_language(message: str, earlier: Iterable[str] | None = None) -> str:
    """The language of `message`: Hebrew or English.

    Any Hebrew letter decides it. A Hebrew sentence that names a tool or a
    project is mostly Latin letters by count ("מה זה Trinity Legal?"), so a
    share of the letters would call it English. A message with no letters at
    all ("?", "2") takes the language of the visitor's most recent earlier
    message that has some, and English when there is none.
    """
    for text in [message, *reversed(list(earlier or []))]:
        language = _language_of(text)
        if language is not None:
            return language
    return ENGLISH
