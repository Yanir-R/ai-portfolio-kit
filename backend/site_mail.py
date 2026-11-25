"""The two emails the site sends itself, in the site's look.

One is the notification Yanir gets when someone writes through the site. The
other is the short reply the visitor gets after the mail form. The booking
invite is cal.com's and is not built here.

Both are built for real mail apps, not browsers: tables for layout, inline
styles, system fonts, no images, and a plain-text part next to the HTML.

The visitor's reply is fixed text. It never repeats what they wrote, or the
topic, so the form cannot be used to send someone else words of the sender's
choosing under Yanir's name.
"""

import datetime
import html
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

SITE_URL = "https://yanirrot.com"
ISRAEL = ZoneInfo("Asia/Jerusalem")

# The site's tokens, as plain values: mail apps ignore CSS variables.
INK = "#0C1A44"
AMBER = "#FFC83D"
SOFT = "#FFF1C9"
LINE = "#B9C6E8"
MUTED = "#4A587F"
LINK = "#1736C4"
PAGE = "#E9EFFB"
RULE = "#DCE3F3"
FONT = "Arial,Helvetica,sans-serif"

NAME = {"he": "יניר רוט", "en": "Yanir Rot"}
TAGLINE = {"he": "סוכני AI לעסקים", "en": "AI agents for business"}

AUTO_REPLY = {
    "he": {
        "subject": "קיבלתי את ההודעה שלכם",
        "title": "קיבלתי את ההודעה",
        "lines": [
            "שלום, תודה שכתבתם. ההודעה הגיעה אליי, ואני חוזר אליכם במייל הזה.",
            "אם נוח לכם יותר לדבר, אפשר לקבוע כבר עכשיו שיחת אבחון של 20 עד 30 דקות.",
        ],
        "button": "קביעת שיחת אבחון",
        "url": f"{SITE_URL}/#call",
        "sign": "יניר",
        "why": "המייל נשלח כי פניתם אליי דרך האתר.",
    },
    "en": {
        "subject": "I got your message",
        "title": "I got your message",
        "lines": [
            "Hi, thanks for writing. Your message reached me, and I'll get back to you at this address.",
            "If you'd rather talk, you can book a 20 to 30 minute discovery call now.",
        ],
        "button": "Book a discovery call",
        "url": f"{SITE_URL}/en#call",
        "sign": "Yanir",
        "why": "You're getting this because you wrote to me through the site.",
    },
}

# The notification goes to Yanir, so it is in Hebrew whatever the visitor used.
ROUTES = {"form": "טופס המייל", "chat": "הצ׳אט"}
LANGS = {"he": "עברית", "en": "אנגלית"}


def _one_line(text: str) -> str:
    """Header-safe text: a topic typed by a visitor must not add a header."""
    return " ".join(text.split())[:120]


def _frame(lang: str, preheader: str, inner: str, footer: str) -> str:
    """The shared card: ink header with the amber rule, body, footer."""
    direction = "rtl" if lang == "he" else "ltr"
    align = "right" if lang == "he" else "left"
    return f"""<!doctype html>
<html lang="{lang}" dir="{direction}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>{html.escape(preheader)}</title></head>
<body style="margin:0;padding:0;background:{PAGE};">
<div style="display:none;max-height:0;overflow:hidden;">{html.escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{PAGE};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="{direction}"
 style="max-width:560px;background:#ffffff;border:2px solid {INK};border-radius:12px;border-collapse:separate;font-family:{FONT};font-size:16px;line-height:1.55;color:{INK};text-align:{align};">
<tr><td style="background:{INK};border-bottom:6px solid {AMBER};border-radius:10px 10px 0 0;padding:14px 24px;font-family:{FONT};">
<strong style="font-size:19px;color:#ffffff;">{NAME[lang]}</strong>
<span style="font-size:14px;color:#D5DCEE;">&nbsp;&nbsp;{TAGLINE[lang]}</span>
</td></tr>
<tr><td style="padding:22px 24px 8px;font-family:{FONT};">
{inner}
</td></tr>
<tr><td style="border-top:1px solid {RULE};padding:12px 24px 14px;font-family:{FONT};font-size:13px;color:{MUTED};">
<a href="{SITE_URL}" style="color:{LINK};font-weight:700;text-decoration:underline;">yanirrot.com</a>
&nbsp;·&nbsp; {footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def _title(text: str) -> str:
    return f'<h1 style="margin:0 0 10px;font-family:{FONT};font-size:27px;line-height:1.15;font-weight:800;color:{INK};">{html.escape(text)}</h1>'


def _para(text: str, extra: str = "") -> str:
    return f'<p style="margin:0 0 14px;{extra}">{html.escape(text)}</p>'


def _button(label: str, url: str) -> str:
    """A table button, so Outlook draws the amber box and the border too."""
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border-collapse:separate;">
<tr><td style="background:{AMBER};border:2px solid {INK};border-radius:10px;">
<a href="{html.escape(url, quote=True)}" style="display:inline-block;padding:12px 22px;font-family:{FONT};font-size:16px;font-weight:800;color:{INK};text-decoration:none;">{html.escape(label)}</a>
</td></tr></table>"""


def _message(
    sender: str,
    to: str,
    subject: str,
    text: str,
    html_body: str,
    reply_to: Optional[str] = None,
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain="yanirrot.com")
    if reply_to:
        msg["Reply-To"] = reply_to
    # The plain part first: mail apps show the last part they can render.
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def notification(
    sender_address: str,
    receiver: str,
    visitor: str,
    message: str,
    topic: Optional[str],
    route: str,
    lang: Optional[str],
    replied: bool,
) -> MIMEMultipart:
    """The email to Yanir. Replying to it answers the visitor directly."""
    topic = _one_line(topic) if topic else None
    subject = f"פנייה חדשה מהאתר: {topic}" if topic else "פנייה חדשה מהאתר"
    when = datetime.datetime.now(ISRAEL).strftime("%d.%m.%Y %H:%M")
    via = ROUTES.get(route, route)
    if lang in LANGS:
        via = f"{via} · {LANGS[lang]}"

    rows: List[Tuple[str, str, bool]] = [("מאת", visitor, True)]
    if topic:
        rows.append(("נושא", topic, False))
    rows.append(("דרך", via, False))
    rows.append(("מתי", when, True))

    cells = []
    for i, (label, value, ltr) in enumerate(rows):
        top = f"border-top:1px solid {RULE};" if i else ""
        value_html = html.escape(value)
        if ltr:
            value_html = f'<span dir="ltr">{value_html}</span>'
        cells.append(
            f'<tr><th align="right" valign="top" style="{top}padding:10px 14px;width:64px;font-family:{FONT};font-size:14px;font-weight:700;color:{MUTED};text-align:right;">{label}</th>'
            f'<td style="{top}padding:10px 0 10px 14px;font-family:{FONT};font-size:16px;font-weight:700;color:{INK};">{value_html}</td></tr>'
        )
    table = (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border:1.5px solid {LINE};border-radius:10px;border-collapse:separate;margin:0 0 16px;">'
        + "".join(cells)
        + "</table>"
    )
    body = html.escape(message).replace("\n", "<br>")
    quote = (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:separate;">'
        f'<tr><td style="background:{SOFT};border:1.5px solid {INK};border-radius:10px;padding:12px 14px;font-family:{FONT};font-size:16px;color:{INK};">'
        f'<div style="font-size:14px;font-weight:700;color:#5E4300;margin:0 0 2px;">ההודעה</div>'
        f'<div dir="auto">{body}</div></td></tr></table>'
    )
    note = "הפונה קיבל מייל קצר שההודעה הגיעה." if replied else ""
    inner = (
        _title("פנייה חדשה מהאתר")
        + table
        + quote
        + _button("מענה", f"mailto:{visitor}")
        + (_para(note, f"font-size:15px;color:{MUTED};") if note else "")
    )
    page = _frame("he", subject, inner, "נשלח מהאתר yanirrot.com")

    lines = ["פנייה חדשה מהאתר", ""]
    lines += [f"{label}: {value}" for label, value, _ in rows]
    lines += ["", "ההודעה:", message, ""]
    if note:
        lines.append(note)
    lines.append("מענה למייל הזה עונה ישירות לפונה.")
    text = "\n".join(lines)

    return _message(
        formataddr(("האתר yanirrot.com", sender_address)),
        receiver,
        subject,
        text,
        page,
        reply_to=visitor,
    )


def auto_reply(sender_address: str, reply_to: str, visitor: str, lang: str) -> MIMEMultipart:
    """The fixed reply to the visitor. Takes nothing they wrote but their address."""
    copy: Dict = AUTO_REPLY.get(lang, AUTO_REPLY["he"])
    lang = lang if lang in AUTO_REPLY else "he"
    inner = (
        _title(copy["title"])
        + "".join(_para(line) for line in copy["lines"])
        + _button(copy["button"], copy["url"])
        + _para(copy["sign"], "font-weight:800;")
    )
    page = _frame(lang, copy["subject"], inner, html.escape(copy["why"]))
    text = "\n\n".join(
        [copy["title"], *copy["lines"], f'{copy["button"]}: {copy["url"]}', copy["sign"], "—", f'yanirrot.com · {copy["why"]}']
    )
    return _message(
        formataddr((NAME[lang], sender_address)),
        visitor,
        copy["subject"],
        text,
        page,
        reply_to=reply_to,
    )
