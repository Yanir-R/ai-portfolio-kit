"""Questions a visitor might type, and the document each one is about.

Written the way a visitor phrases things, which is mostly not the way the
document does: "a tool that remembers what I told the AI" for PersonaKit,
"software for a barbershop" for Trinity CRM. A question that only repeats a
project's name tests nothing a title match would not pass.

`expected` is a (kind, slug) pair. None means the question is about Yanir or
his offer, which the profile answers and the profile is always sent, so the
right result is a small set. OFF_TOPIC means no document covers it at all.
"""

OFF_TOPIC = "off-topic"

P = "project"
W = "writing"

QUESTIONS = (
    # --- named directly -------------------------------------------------------
    ("en", "What is ReelSensei?", (P, "reelsensei")),
    ("en", "Can you summarize and elaborate on ReelSensei?", (P, "reelsensei")),
    ("en", "Tell me about PersonaKit", (P, "personakit")),
    ("en", "How does the review engine decide a verdict?", (P, "review-engine")),
    ("en", "What is Trinity Legal?", (P, "trinity-legal")),
    ("en", "Is Trinity CRM an AI product?", (P, "trinity-crm")),
    ("en", "What does catchup do?", (P, "catchup")),
    ("en", "What is Hermes?", (P, "hermes")),
    ("en", "How does this portfolio site work?", (P, "ai-chat-portfolio")),
    # --- described, not named -------------------------------------------------
    ("en", "Do you have a tool that remembers what I told my coding assistant?", (P, "personakit")),
    ("en", "Have you built software for a barbershop?", (P, "trinity-crm")),
    ("en", "Did you make a booking system for a small business?", (P, "trinity-crm")),
    ("en", "Have you worked with lawyers?", (P, "trinity-legal")),
    ("en", "Any experience migrating files to the cloud for an office?", (P, "trinity-legal")),
    ("en", "Do you have something that checks pull requests automatically?", (P, "review-engine")),
    ("en", "Is there a bot you talk to on Telegram?", (P, "hermes")),
    ("en", "Do you run a personal assistant that works around the clock?", (P, "hermes")),
    ("en", "Have you done anything with video or gaming clips?", (P, "reelsensei")),
    ("en", "I was away and my agent wrote a lot. Do you have a way to recap that?", (P, "catchup")),
    ("en", "How do you stop the chatbot here from making things up?", (P, "ai-chat-portfolio")),
    ("en", "What did you write about spending too much on an AI editor?", (W, "cursor-token-burn")),
    ("en", "Have you written about empty results from tools?", (W, "three-meanings-of-nothing")),
    ("en", "Did you publish anything about JavaScript being asynchronous?", (W, "callbacks-promises-async-await")),
    ("en", "What was that story about a segfault?", (W, "crashed-claude-cli")),
    ("en", "When should a cheap model ask an expensive one for help?", (W, "agent-advisor")),
    ("en", "How many AI agents do you run?", (P, "agent-fleet")),
    ("en", "Do you have a multi-agent setup where a person signs off?", (P, "agent-fleet")),
    # --- about Yanir and the offer: the profile answers -----------------------
    ("en", "Can you build AI agents for my company?", None),
    ("en", "How much do you charge?", None),
    ("en", "Are you available for a full-time job?", None),
    ("en", "What is your background?", None),
    ("en", "How does working with you start?", None),
    ("en", "Do you work with municipalities?", None),
    ("en", "Where have you worked before?", None),
    # --- nothing here covers it -----------------------------------------------
    ("en", "What is the weather in Paris?", OFF_TOPIC),
    ("en", "Write me a haiku about autumn", OFF_TOPIC),
    ("en", "Who won the world cup?", OFF_TOPIC),
    # --- Hebrew, named --------------------------------------------------------
    ("he", "ספר לי על PersonaKit", (P, "personakit")),
    ("he", "מה זה Trinity Legal?", (P, "trinity-legal")),
    ("he", "מה זה Hermes?", (P, "hermes")),
    ("he", "מה עושה catchup?", (P, "catchup")),
    ("he", "מה זה ReelSensei?", (P, "reelsensei")),
    # --- Hebrew, described ----------------------------------------------------
    ("he", "בנית תוכנה למספרה?", (P, "trinity-crm")),
    ("he", "יש לך מערכת לקביעת תורים לעסק קטן?", (P, "trinity-crm")),
    ("he", "עבדת עם עורכי דין?", (P, "trinity-legal")),
    ("he", "יש לך ניסיון בהעברת קבצים של משרד לענן?", (P, "trinity-legal")),
    ("he", "יש לך כלי שבודק קוד אוטומטית לפני מיזוג?", (P, "review-engine")),
    ("he", "יש לך בוט בטלגרם?", (P, "hermes")),
    ("he", "יש לך עוזר אישי שעובד מסביב לשעון?", (P, "hermes")),
    ("he", "יש כלי שזוכר מה אמרתי ל-AI?", (P, "personakit")),
    ("he", "לא הייתי ליד המחשב והסוכן כתב המון. יש דרך לקבל תקציר?", (P, "catchup")),
    ("he", "עשית משהו עם וידאו או משחקים?", (P, "reelsensei")),
    ("he", "כתבת משהו על עלויות של Cursor?", (W, "cursor-token-burn")),
    ("he", "כמה סוכנים יש לך?", (P, "agent-fleet")),
    ("he", "איך בנוי מערך הסוכנים שלך?", (P, "agent-fleet")),
    # --- Hebrew, about Yanir and the offer ------------------------------------
    ("he", "אתה בונה סוכני AI לעסקים?", None),
    ("he", "כמה זה עולה?", None),
    ("he", "אתה פנוי למשרה מלאה?", None),
    ("he", "איך מתחילים לעבוד איתך?", None),
    ("he", "אתה עובד עם רשויות מקומיות?", None),
    ("he", "מה הרקע שלך?", None),
    # --- Hebrew, nothing covers it --------------------------------------------
    ("he", "מה מזג האוויר בתל אביב?", OFF_TOPIC),
    ("he", "תכתוב לי שיר על הסתיו", OFF_TOPIC),
)
