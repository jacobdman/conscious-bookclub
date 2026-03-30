📚 Feature: Smart Book Discovery & Backlog Curation
🧠 Overview

Transform book selection from an overwhelming list into a structured, engaging flow by separating discovery (Suggested) from curation (Backlog) and introducing a swipe-based review system.

This system encourages quick participation, surfaces high-quality books, and maintains a living, community-driven backlog.

🔄 Core Flow
1. Add Book → Suggested Pool
Any member can add a book
Book enters Suggested (discovery layer)
2. Swipe-Based Review (Suggested)

Users review books one at a time:

👉 Swipe Right — Like
Contributes toward promotion threshold
⬆️ Swipe Up — Super-like
Immediately promotes book to Backlog
Limited to 3 per user (lifetime pool)
Refunded when the book is selected
Can be removed anytime
👈 Swipe Left — Pass
Removes book from user’s feed (personal only)
No global impact
🔖 Bookmark
Saves to personal “Review Later” list
No global impact
3. Promotion to Backlog

Books move from Suggested → Backlog when they meet:

Promotion Threshold = max(
  club_min_threshold,
  ceil(active_users * percentage_threshold)
)
Definitions:
Club Min Threshold: default 3 likes
Active Users: members who interacted with suggestions in last 30 days
Percentage Threshold: default 50%
Key Rule:
Super-like bypasses threshold entirely (separate system)
4. Backlog (Single Source of Truth)

The backlog is a living, curated list of all books the club has collectively endorsed.

No size limit
No archive layer
No automatic removal

If a book is in the backlog, it means:

“At some point, this club agreed it’s worth considering.”

5. Periodic Re-Validation (Backlog Cleanup)

To keep backlog relevant over time, books are periodically re-evaluated.
Outcome:
Books with continued support remain in backlog
Books that lose sufficient support are removed from backlog


🎯 UX: Swipe-Based Book Review System
🧭 Top-Level Structure
🏷️ Queue Selector (Top Center)
Displays current queue:
“Discover”
“Hot Picks”
“Champion Picks”
“Bookmarked”
“Backlog Review”
Includes a down arrow (⌄)
Interaction:
Tap opens a modal dropdown menu
User can switch queues instantly
Important:
Queues are NOT stored in DB
They are purely:
filters
sorting strategies
prioritization layers on the same dataset

👉 This keeps backend simple and flexible

❌ Exit (Top Right)
“X” button
Returns user to main app (Dashboard / Books tab)
📚 Main Content Area
🃏 Book Card (Center of Screen)
Front (Default View)
Large book cover (dominant visual)
Title (bold)
Author (subtle)
Interaction:
Tap → Flip animation (horizontal or vertical)
Reveals back side with details
🔄 Back of Card (Details View)

Scrollable content:

Submitted by (user name)
Book description
Optional:
Submitter notes (“Why I added this”)
Metadata (pages, genre, etc.)
Interaction:
Tap again → flip back
OR swipe still works from this side
👇 Bottom Action Bar (Primary Interaction)

Persistent bottom nav with 4 actions:

Default Queues (Discover / Hot Picks / Champion Picks)
❤️ Like
⭐ Super-like
Disabled (grayed out) if user has none remaining
👈 Pass
🔖 Bookmark
Backlog Review Mode (Dynamic Swap)

Buttons change to:

👍 Still Interested
👎 No Longer Interested
⏭ Skip

👉 Same layout, different semantics → low cognitive load

🖐️ Swipe Interaction (Core Mechanic)
Card is draggable in all 4 directions

As user drags:

Card moves with finger
Background overlay fades in with directional cue
Directional Mapping
👉 Right → Like
Overlay: ❤️ or “LIKE”
⬆️ Up → Super-like
Overlay: ⭐ or “SUPER”
👈 Left → Pass
Overlay: ⏭ or “PASS”
⬇️ Down → Bookmark
Overlay: 🔖 or “SAVE”
Visual Feedback
Opacity increases as drag distance increases
Slight rotation adds physical feel
Snap + animate off-screen on release
Tap vs Swipe Behavior
Tap → Flip card
Swipe → Action

👉 Important:

Must have a small dead zone threshold so taps don’t accidentally swipe
🔀 Queue Definitions (Filtering Logic)

These are not separate datasets — just views.

📖 Discover
Default queue
Mix of:
new books
resurfaced books
lightly engaged books
🔥 Hot Picks
Books close to promotion threshold

High leverage:

“Your vote could push this into backlog”

⭐ Champion Picks
Books with ≥1 super-like
Sorted by:
super-like recency
total likes
🔖 Bookmarked
User’s private saved books
No ranking impact
🔁 Backlog Review
Books selected for re-validation
Triggered periodically (time-based or batch-based)
🧠 Subtle UX Wins (Important)
1. Zero Overwhelm
One book at a time
No scrolling required (except details)
2. Clear Intent Per Action
Swipe = decision
Tap = learn more
3. No Negative Social Signal
No visible “reject counts”
Pass is invisible to others
4. High Engagement Loops
Hot Picks = urgency
Champion Picks = social proof
Backlog Review = maintenance
⚖️ Final UX Philosophy

This system is built on:

Momentum over perfection
One decision at a time
Clear separation of intent

Users are never:

overwhelmed
forced to browse lists
or asked to think too hard

Instead, they:

react
engage
shape the backlog naturally
🔥 One Small Recommendation (Optional but High Impact)

Add a subtle microcopy hint under queue title:

Discover → “Find your next great read”
Hot Picks → “Almost in the backlog”
Champion Picks → “Backed by your club”
Backlog Review → “Keep your backlog fresh”

This massively improves onboarding without tutorials.