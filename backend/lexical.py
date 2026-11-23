"""One tokenizer for every lexical path: questions and chunk text alike.

Lexical retrieval only works if a question is reduced to terms the same way
the documents were. Two tokenizers - one for the index, one for the query -
drift apart the first time someone fixes a bug in only one of them, and the
symptom is silent: a document that plainly answers the question scores zero.
So this module is the single place text becomes terms, and `retrieval.py`
calls it for both sides.

**English** keeps the rules `selection.py` already uses: the closed-class
stopword list, `MIN_TERM_LENGTH`, and `_stem`. They are imported, not copied,
so the baseline selector and the new retriever cannot disagree about what an
English word reduces to. `selection.py` stays the R0 comparison baseline until
it is retired (plan phase R3); at that point these rules move here.

One deliberate difference: the Latin token pattern here never ends on a
period or hyphen. `selection._TERM_RE` allows a trailing ".", so "ReelSensei."
became the term "reelsensei." and matched nothing (R0 baseline, "Worst
misses"). The fix lives only in this module, so the R0 numbers measured
against `selection.py` stay valid.

**Hebrew** gets a light, dependency-free normaliser (plan section 6.1),
applied to both queries and chunk text:

1. Strip niqqud and cantillation marks (U+0591-U+05C7), so vocalised and
   unvocalised spellings meet. The few punctuation code points in that block
   (maqaf, paseq, sof pasuq, nun hafukha) separate words instead of vanishing,
   so a maqaf compound splits rather than fusing into one token.
2. Normalise final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ).
3. Strip at most one common prefix (including two- and three-letter
   combinations), keeping at least `HEBREW_MIN_STEM_LENGTH` letters.
4. Strip at most one plural or possessive suffix, with the same guard.
5. Character trigrams (`char_trigrams`, `trigram_similarity`) as a fallback
   for a Hebrew term that still does not meet a dictionary form; the
   retriever applies it against the index vocabulary.

Like `_stem`, this aims at agreement, not linguistics: "והפרויקטים" and
"פרויקט" must land on the same term, and whatever that term looks like does
not matter because every occurrence reduces the same way.

A first letter can be a prefix or part of the root, and a light stemmer
cannot tell which: "כתבת" (you wrote) loses its כ as if it were "like", while
"כשכתבת" (when you wrote) loses only כש. So a Hebrew token carries two
variants - the full stem and the suffix-only stem - and both sides index or
match on either. "כתבת", "כשכתבת" and "כתבתי" then share the variant "כתב".
The retriever scores a question word once, by its best-matching variant, so
the second variant widens matching without counting the word twice.

The two scripts are tokenised side by side, in text order, never one instead
of the other: "מה זה ReelSensei?" yields the Hebrew tokens and the Latin term
`reelsensei`.

Nothing here logs, and nothing here keeps text after returning. Tokens carry
visitor words; callers must log counts, never tokens.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import FrozenSet, Iterable, List, Optional, Tuple

from selection import _STOPWORDS as ENGLISH_STOPWORDS
from selection import MIN_TERM_LENGTH, _stem

LATIN = "latin"
HEBREW = "hebrew"

# Shortest Hebrew word kept as a term, and the fewest letters prefix or suffix
# stripping may leave behind. Hebrew is written without most vowels, so real
# roots are often three letters and some content words two; one letter left
# behind would merge unrelated words. Proposed as 2 in plan section 6.1. The
# committed corpus has no Hebrew text, so the eval set cannot tune it yet (see
# docs/plans/RAG-R1-RESULTS.md); it stays at the proposed value.
HEBREW_MIN_STEM_LENGTH = 2
HEBREW_MIN_TERM_LENGTH = 2

# Niqqud and cantillation: combining marks in U+0591-U+05C7.
_HEBREW_MARKS = (0x0591, 0x05C7)
# Punctuation inside that block. These separate words rather than decorate a
# letter, so they become spaces instead of being deleted.
_HEBREW_BLOCK_PUNCTUATION = frozenset({"\u05be", "\u05c0", "\u05c3", "\u05c6"})

_FINAL_LETTERS = str.maketrans({"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"})

# Latin: starts and ends on a letter, digit, "+" or "#" ("c++", "c#"), and
# may contain ".", "-", "+", "#" inside ("node.js", "22.7", "gpt-4"). Never a
# trailing period - the R0 `_TERM_RE` bug.
# Hebrew: letters, optionally joined by geresh / gershayim or their ASCII
# stand-ins inside an abbreviation ("צה"ל"); a quote at either edge is
# punctuation, not part of the word.
_TOKEN_RE = re.compile(
    r"(?P<latin>[a-z0-9](?:[a-z0-9+#.\-]*[a-z0-9+#])?)"
    r"|(?P<hebrew>[\u05d0-\u05ea]+(?:['\"\u05f3\u05f4][\u05d0-\u05ea]+)*)"
)
_HEBREW_QUOTES = str.maketrans("", "", "'\"\u05f3\u05f4")

# Written in normalised form (final letters already folded), longest first, so
# the first match is the longest one. Single letters are the inseparable
# prepositions and particles; the combinations are the frequent stacked forms.
_HEBREW_PREFIXES: Tuple[str, ...] = tuple(
    sorted(
        {
            "ו", "ה", "ב", "ל", "מ", "ש", "כ",
            "וה", "וב", "ול", "ומ", "וש", "וכ", "שה", "שב", "של", "שמ", "מה", "כש",
            "וכש", "ושה", "ומה",
        },
        key=lambda p: (-len(p), p),
    )
)

# Plural and possessive endings, normalised the same way ("ים" is "ימ" here
# because the final mem is folded first). The feminine-plural possessives
# (כן, הן, תן) are left out on purpose: after folding, "ן" is "נ", and
# stripping "כנ" would cut every noun that simply ends in כן (סוכן → סו).
_HEBREW_SUFFIXES: Tuple[str, ...] = tuple(
    sorted(
        {
            "ימ", "ות", "ה", "ת", "י", "ו", "כ", "נו", "כמ", "המ",
            "יכ", "יה", "יו", "ינו", "יכמ", "יהמ", "תי", "תמ",
        },
        key=lambda s: (-len(s), s),
    )
)


def strip_niqqud(text: str) -> str:
    """Removes Hebrew combining marks; block punctuation becomes a space."""
    low, high = _HEBREW_MARKS
    out = []
    for char in text:
        if char in _HEBREW_BLOCK_PUNCTUATION:
            out.append(" ")
        elif not (low <= ord(char) <= high):
            out.append(char)
    return "".join(out)


def fold_final_letters(word: str) -> str:
    return word.translate(_FINAL_LETTERS)


def normalise(text: str) -> str:
    """NFKC, lower-case Latin, niqqud stripped, final letters folded.

    The order matters: NFKC first so Hebrew presentation forms (U+FB1D-FB4F)
    decompose into a letter plus a mark, and then the mark is stripped.
    """
    return fold_final_letters(strip_niqqud(unicodedata.normalize("NFKC", text).lower()))


def strip_hebrew_prefix(word: str) -> str:
    for prefix in _HEBREW_PREFIXES:
        if word.startswith(prefix) and len(word) - len(prefix) >= HEBREW_MIN_STEM_LENGTH:
            return word[len(prefix):]
    return word


def strip_hebrew_suffix(word: str) -> str:
    for suffix in _HEBREW_SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= HEBREW_MIN_STEM_LENGTH:
            return word[: -len(suffix)]
    return word


def hebrew_stem(word: str) -> str:
    """One prefix, then one suffix, each only if the guard still holds.

    Expects a normalised word (see `normalise`).
    """
    return strip_hebrew_suffix(strip_hebrew_prefix(word))


def _normalised_set(words: str) -> FrozenSet[str]:
    return frozenset(normalise(word) for word in words.split())


# Closed-class Hebrew, on the same principle as the English list: pronouns,
# prepositions, question words, particles, greetings, and the verbs the
# English list already treats as carrying no topic (tell, say, know, want,
# need, work, give, get, do). Matched before stemming, on the surface form and
# on the form without its prefix, so "ושלך" is caught as well as "שלך".
HEBREW_STOPWORDS: FrozenSet[str] = _normalised_set(
    """
    אני אתה את הוא היא אנחנו אתם אתן הם הן
    שלי שלך שלו שלה שלנו שלכם שלכן שלהם שלהן
    לי לך לו לה לנו לכם להם אותי אותך אותו אותה אותם
    זה זו זאת הזה הזו הזאת אלה אלו האלה
    מה מי איפה מתי למה איך כמה האם מהו מהי מהם מהן איזה איזו אילו
    על של עם בלי אל את מן לפני אחרי בין תחת לגבי בשביל אצל כמו
    גם רק עוד כבר אז כי אם או אבל כן לא אין יש היה היו הייתה תהיה
    כל הכל משהו כלום מאוד יותר פחות הרבה קצת
    ספר תספר ספרי תספרי תגיד תגידי אמרת אומר יודע יודעת רוצה צריך
    עושה עשית עבדת עובד עובדת עבודה תן תני קיבלת
    שלום היי הי בוקר ערב תודה בבקשה סליחה ביי
    """
)


@dataclass(frozen=True)
class Token:
    """One word as the tokenizer saw it.

    `form` is the normalised surface word; `variants` are the terms scoring
    may match it on (empty when the word carries no topic: a stopword or too
    short). Both may be visitor text: never log them.
    """

    script: str
    form: str
    variants: Tuple[str, ...]

    @property
    def term(self) -> Optional[str]:
        """The primary term, or None for a word that carries no topic."""
        return self.variants[0] if self.variants else None


def _latin_variants(form: str) -> Tuple[str, ...]:
    if len(form) < MIN_TERM_LENGTH or form in ENGLISH_STOPWORDS:
        return ()
    return (_stem(form),)


def _hebrew_variants(form: str) -> Tuple[str, ...]:
    if len(form) < HEBREW_MIN_TERM_LENGTH:
        return ()
    if form in HEBREW_STOPWORDS or strip_hebrew_prefix(form) in HEBREW_STOPWORDS:
        return ()
    full, suffix_only = hebrew_stem(form), strip_hebrew_suffix(form)
    return (full,) if full == suffix_only else (full, suffix_only)


def analyze(text: str) -> List[Token]:
    """Every word in `text`, both scripts, in text order."""
    tokens: List[Token] = []
    for match in _TOKEN_RE.finditer(normalise(text)):
        latin = match.group("latin")
        if latin is not None:
            tokens.append(Token(script=LATIN, form=latin, variants=_latin_variants(latin)))
        else:
            form = match.group("hebrew").translate(_HEBREW_QUOTES)
            tokens.append(Token(script=HEBREW, form=form, variants=_hebrew_variants(form)))
    return tokens


def index_terms(text: str) -> List[str]:
    """Every variant of every topic-bearing word, repeats kept (BM25 counts them).

    The document side of matching. The query side works on `analyze` tokens so
    each question word is scored once.
    """
    return [variant for token in analyze(text) for variant in token.variants]


def script_of(term: str) -> str:
    return HEBREW if term and "\u05d0" <= term[0] <= "\u05ea" else LATIN


def char_trigrams(term: str) -> FrozenSet[str]:
    """Trigrams of the term with edge markers, so two-letter stems still have some."""
    padded = f"^{term}$"
    return frozenset(padded[i : i + 3] for i in range(len(padded) - 2))


def trigram_similarity(a: Iterable[str], b: Iterable[str]) -> float:
    """Dice coefficient of two trigram sets: 1.0 identical, 0.0 disjoint."""
    left, right = frozenset(a), frozenset(b)
    if not left or not right:
        return 0.0
    return 2.0 * len(left & right) / (len(left) + len(right))
