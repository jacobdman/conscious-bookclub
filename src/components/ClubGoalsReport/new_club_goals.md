We want to update our goals reporting. We have great charts and endpoints in place, but we want to make it more user-friendly and engaging. We can update our endpoints, remove them, or add new ones. Please propose a plan for how we can improve the reporting. We are going to be adding a new book progress report, a new personal goal section, and multiple new sub views under the club goals report view.

Please also note here, reports that are applied to a users personal goals page should only show data for that user (and only for the current selected club if the user happens to be in multiple). All other reports should show data for the entire club.

new concepts:
- habit weighting
- book goals
- personal goal progress
---

## 🧍‍♂️ **Section 1: Personal Progress**

*(Displayed on each member’s Goals page in a NEW TAB called "goals report")* this doesn't have to be a tab but we don't want to clutter the goals screen, instead given users the option to view the goals reports separately.

These views emphasize **self-improvement and consistency** over raw volume.

### **1.1 Habit Consistency (Quarterly Average)**

* **Purpose:** Show each user’s average habit completion rate for the current quarter.
* **Formula:**
  `habit_consistency = SUM(period_completion_rate * weight) / SUM(weight)`
  where:

  * `period_completion_rate = completed_periods / total_periods`
  * `weight_n = 1 / log2(n + 1)` a scale that rewards meaningful habits without letting users spam easy ones.
* **Weighting logic:**
  * Use diminishing returns so 10 trivial habits don’t outweigh 3 real ones.

  we will also need to update the regular goals view to communicate to users the weighting of habits and allowing them to re-order the habits to change the weighting (i.e. move a habit up or down in the list).

### **1.2 Weekly Completion Trend**

* **Chart Type:** Line chart.
* **Purpose:** Visualize *consistency over time*.
* **Metric:** % of weekly goals completed per week (not total number).
* **Interpretation:** Smooth line = consistent progress. Jagged = fluctuating participation.

### **1.3 Goal Type Distribution**

* **Chart Type:** Donut or pie.
* **Purpose:** Fun overview of a user’s active goals by type (Habits, Metrics, Milestones, One-Time).
* **Use:** Lighthearted metric for reflection and discussion.

---

## 🏆 **Section 2: Club "Competitive Goals"**

*(Shared view for leaderboards and gamified insights)*

### **2.1 Habit Consistency Leaderboard**

* **Metric:** Weighted average of all habit goals (see §1.1).
* **Display:** current implementation is fine.

### **2.2 Habit Streaks Leaderboard**

* **Metric:** Longest active or all-time streak (in days or weeks).
* **Display:** List or bar chart with flame icon + streak count.
* **Encourages:** Daily/weekly discipline.

### **2.3 Weekly Completion Trend**
A club wide view of the weekly completion trend.

* **Chart Type:** area chart or line chart.
* **Metric:** Weighted average of all habit goals (see §1.2).
* **Purpose:** Visualize *consistency over time per member* so we can see who is consistently achieving their goals and who is not.
* **Metric:** % of weekly goals completed per week (not total number).
* **Interpretation:** Smooth line = consistent progress. Jagged = fluctuating participation.

## 📈 **Section 3: Club Insights & Analytics**

*(For review sessions or year-end summaries)*

### **3.1 Average Completion by Goal Type**

* **Chart:** Grouped bar or radar.
* **Purpose:** Compare how the club performs on different goal types (e.g., high habit adherence but low milestone completion).

### **3.2 Participation Heatmap**

* **Chart:** sparklines or weekly "heatstrip" (like a calendar heatmap but aggregated by week).
* **Metric:** Weekly active goal entries (any type).
* **Purpose:** Show engagement density across the club per user.

### **3.3 Top Performer by Category**

* **Display:** Cards with avatars + metrics.
* **Categories:**

  * “Most Consistent” (highest average completion)
  * “Top Metric Earner” (highest normalized effort)
  * “Milestone Master” (most completed milestones)
  * “Streak Champion” (longest active streak).

### **3.4 Goal Type Distribution**

A club wide view of the goal type distribution. (see §1.3)

* **Chart Type:** Donut or pie.
* **Purpose:** Fun overview of a user’s active goals by type (Habits, Metrics, Milestones, One-Time).
* **Use:** Lighthearted metric for reflection and discussion.

## 📚 **Section 4: Book Progress**

We already have a book progress report, but we should add a simple progress ring to each book representing the % of the book that has been read by the club as a whole.

### **4.1 Book Progress Ring**

* **Chart Type:** Progress ring.
* **Purpose:** Visualize *book progress as a whole*.
* **Metric:** % of book read by the club as a whole.

---

## ⚙️ **Technical Implementation Notes**

* **Aggregation windows:** Quarterly for leaderboards; weekly for trends.
* **Normalization:**

  * Habits → % completed per period
  * Metrics → % of target achieved
  * Milestones / One-Time → binary completion
* **Weighting:**

  * Use diminishing weights: `weight = log(1 + target_count)`
  * Optionally restrict max countable habits (e.g., 5) to prevent spam.
* **Views to create in SQL:**

  1. `user_habit_summary` (completion rate, streaks, weighted average)
  2. `club_goal_leaderboard` (aggregated per quarter)
  3. `metric_effort_summary` (normalized progress)
  4. `club_progress_summary` (for shared rings)
