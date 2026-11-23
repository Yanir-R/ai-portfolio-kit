"""The shared tokenizer: English rules unchanged, Hebrew normalised, scripts side by side.

The query and the chunks go through the same functions, so these tests pin
the property that matters - two spellings of one word reduce to a shared term -
rather than what any particular term looks like.
"""

import pytest

import lexical
import selection
from lexical import HEBREW, LATIN, analyze, char_trigrams, hebrew_stem, index_terms, normalise, trigram_similarity


def _variants(word: str):
    (token,) = analyze(word)
    return set(token.variants)


def _share_a_term(a: str, b: str) -> bool:
    return bool(_variants(a) & _variants(b))


# --- English: kept, and applied the same way as before ------------------------


@pytest.mark.parametrize("word", ["meanings", "burned", "studies", "uses", "nothing", "tokens", "agents"])
def test_english_stemming_is_selections_stemmer(word):
    assert analyze(word)[0].term == selection._stem(word)


def test_english_stopwords_and_short_words_carry_no_term():
    assert [t.term for t in analyze("what is the AI for")] == [None, None, None, None, None]


def test_a_trailing_period_is_not_part_of_the_term():
    # The R0 `_TERM_RE` bug: "ReelSensei." became "reelsensei." and matched nothing.
    assert [t.term for t in analyze("Tell me about ReelSensei.")][-1] == "reelsensei"
    assert analyze("Hermes.")[0].term == selection._stem("hermes")
    assert analyze("projects.")[0].term == "project"


def test_the_baseline_selector_keeps_its_own_tokenizer():
    # Fixed here only, so the R0 numbers measured against selection.py stay valid.
    assert "reelsensei." in selection._terms("Tell me about ReelSensei.")


@pytest.mark.parametrize(
    "text, expected",
    [("node.js", "node.js"), ("22.7", "22.7"), ("c++", "c++"), ("c#", "c#"), ("gpt-4", "gpt-4")],
)
def test_inner_and_trailing_symbol_punctuation_survives(text, expected):
    assert analyze(text)[0].form == expected


# --- Hebrew normaliser (plan section 6.1) --------------------------------------


def test_niqqud_is_stripped_so_vocalised_and_plain_spellings_meet():
    assert normalise("כָּתַבְתָּ") == normalise("כתבת")
    assert _variants("כָּתַבְתָּ") == _variants("כתבת")


def test_niqqud_range_is_stripped_but_maqaf_separates_words():
    assert normalise("\u05b0\u05b4\u05bc\u05c1\u05c2\u05c7") == ""
    assert [t.form for t in analyze("בית\u05beספר")] == ["בית", "ספר"]


@pytest.mark.parametrize("final, medial", [("ך", "כ"), ("ם", "מ"), ("ן", "נ"), ("ף", "פ"), ("ץ", "צ")])
def test_final_letters_are_folded(final, medial):
    assert normalise(f"אב{final}") == f"אב{medial}"


def test_prefixed_plural_reaches_the_bare_noun():
    assert hebrew_stem(normalise("והפרויקטים")) == hebrew_stem(normalise("פרויקט"))
    assert _share_a_term("והפרויקטים", "פרויקט")
    assert _share_a_term("הפרויקטים", "פרויקטים")


def test_two_letter_prefix_reaches_the_verb():
    assert _share_a_term("כשכתבת", "כתבת")
    assert _share_a_term("כשכתבת", "כתבתי")
    assert "כתב" in _variants("כשכתבת")


@pytest.mark.parametrize("prefixed", ["וה", "שה", "וב", "ול", "מה", "כש", "ו", "ה", "ב", "ל", "מ", "ש", "כ"])
def test_each_listed_prefix_is_stripped(prefixed):
    assert _share_a_term(f"{prefixed}סוכנים", "סוכנים")


@pytest.mark.parametrize("suffixed", ["סוכנים", "סוכנות", "סוכני", "סוכנך", "סוכננו", "סוכנכם", "סוכנהם", "סוכנה"])
def test_plural_and_possessive_suffixes_are_stripped(suffixed):
    assert _share_a_term(suffixed, "סוכן")


def test_a_noun_ending_in_kaf_nun_keeps_its_letters():
    assert "סוכנ" in _variants("סוכן")


def test_the_min_stem_guard_keeps_two_letters():
    assert lexical.HEBREW_MIN_STEM_LENGTH == 2
    # "בת" would lose its ב as a prefix and its ת as a suffix; the guard keeps both.
    assert hebrew_stem("בת") == "בת"
    assert all(len(v) >= 2 for v in _variants("ובת"))
    assert all(len(v) >= 2 for w in ["הים", "שתי", "כמה", "ולך"] for t in analyze(w) for v in t.variants)


def test_hebrew_closed_class_words_carry_no_term():
    assert [t.term for t in analyze("מה זה שלום ושלך האם")] == [None, None, None, None, None]


def test_hebrew_abbreviation_quotes_are_dropped():
    assert analyze('צה"ל')[0].form == "צהל"
    assert analyze("״שלום״")[0].form == "שלומ"


def test_trigram_similarity_survives_a_missed_affix():
    near = trigram_similarity(char_trigrams("היילייט"), char_trigrams("היילייטס"))
    far = trigram_similarity(char_trigrams("היילייט"), char_trigrams("פרויקט"))
    assert near >= 0.6 > far
    assert trigram_similarity(char_trigrams("אב"), char_trigrams("אב")) == 1.0
    assert trigram_similarity(frozenset(), char_trigrams("אב")) == 0.0


# --- both scripts, side by side -----------------------------------------------


def test_mixed_question_yields_both_scripts_in_order():
    tokens = analyze("מה זה ReelSensei?")
    assert [(t.script, t.form) for t in tokens] == [(HEBREW, "מה"), (HEBREW, "זה"), (LATIN, "reelsensei")]
    assert [t.term for t in tokens if t.term] == ["reelsensei"]


def test_mixed_question_keeps_hebrew_content_terms_beside_latin_ones():
    terms = [t.term for t in analyze("ספר על הפרויקטים ReelSensei") if t.term]
    assert terms == ["פרויקט", "reelsensei"]


def test_index_terms_keep_repeats_and_every_variant():
    assert index_terms("agents agents") == ["agent", "agent"]
    assert set(index_terms("כתבת")) == _variants("כתבת")
