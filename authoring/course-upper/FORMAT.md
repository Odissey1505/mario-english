# How to author a unit of the Upper-Intermediate course

One Python file per unit, in `authoring/course-upper/`. `tools/build_course.py` turns every file
here into `data/courses/english-upper-intermediate.js`, which the game ships with.

## The file

```python
# Unit 5 — lessons 17-20
SECTION = {'name': 'Unit 5 · The Open Road', 'lessons': [

L('Lesson 17 · Holidays',
words="""villa|🏖️|a large comfortable house people rent for a seaside break
houseboat||a home that floats and is moored on a river or canal""",
grammar="""This time tomorrow we ___ across the Channel. | will be sailing; will sail; sail | 1 | Future Continuous describes an action in progress at a point in the future.
! By Friday we will arrive at the campsite. | By Friday; we will arrive; at the campsite | 2 | "By + time" needs Future Perfect: we will have arrived.
? Put it in the Future Perfect: "By June they ___ (save) enough for the trip." | will have saved | Future Perfect = will have + past participle.
# We will have been travelling for ten hours by midnight | Future Perfect Continuous counts how long an action will have lasted."""),

]}
```

`L` is handed to the file by the builder — do not import or define it.
Use `"""…"""` strings so apostrophes are safe, and never put a `"` inside them.

## Vocabulary lines

```
headword|emoji or nothing|a plain English definition
```

* The emoji is optional — `word||definition` is fine, and an empty slot is much better than a
  misleading picture. Abstract words usually have no good emoji; concrete ones often do.
* The definition is what the learner reads in the game and picks the word from, so it carries the
  lesson. Plain English, roughly 5–14 words, no jargon.
* **The definition must not contain the headword or any part of it** — not "to feel frustrated when…"
  for *frustrated*. The builder rejects that.
* At least 12 characters. Define the phrase as a whole for multi-word entries.

## Grammar lines

One question per line. The first character picks the kind:

| Start | Kind | Shape |
|---|---|---|
| *(none)* | multiple choice | `sentence with ___ \| option; option; option \| answer number (1-based) \| explanation` |
| `!` | find the mistake | `! the wrong sentence \| chunk; chunk; chunk \| number of the wrong chunk \| explanation` |
| `?` | typed answer | `? the task \| accepted answer; another accepted answer \| explanation` |
| `#` | word order | `# The whole correct sentence \| explanation` |

* `;` separates options, so never use one inside an option.
* Never use `|` inside the text of a question, an option or an explanation.
* A choice question needs 3+ options and either a `___` gap or a real question form.
* For `!`, the chunks are shown as the pieces of the sentence to choose between — split the sentence
  into 3–4 chunks and point at the one that is wrong.
* For `#`, write the finished sentence; the game shuffles the words itself. 4+ words.
* Every line needs an explanation: one short sentence that teaches the rule, not a label.

## What every lesson needs

* 6+ words (normally the whole list the syllabus gives for that lesson).
* **22+ grammar questions**, with a mix of at least: 14 choice, 3 find-the-mistake, 2 typed, 2 word
  order. More is welcome.
* No duplicated question text inside a lesson, and no repeated options inside one question.

## What makes them good

* Put the lesson's own vocabulary inside the grammar sentences. The two halves should feel like one
  lesson, not two lists.
* Write for 14–17-year-olds: real situations, texting a friend, arguing with a sibling, missing a
  train, a group chat that goes wrong. Humour is welcome. Avoid "He ___ to school every day".
* Explanations teach: *"Future Perfect looks back at a finished action from a point in the future"*
  beats *"Use Future Perfect"*.
* Distractors should be the mistakes a real learner makes, not nonsense.
* Vary the question shape across the lesson so twenty questions never feel like one question
  repeated — gap, error-spotting, transformation, word order, short answer.

## Checking your file

```
python3 tools/check_section.py authoring/course-upper/u05.py
```

It prints each lesson with its counts and either `ok` or the exact problems. Fix and rerun until
clean. Then stop — do not touch any other file in the project.
