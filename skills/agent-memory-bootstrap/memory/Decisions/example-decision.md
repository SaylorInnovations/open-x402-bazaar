# Example: a decision worth remembering

Template — replace with a real decision once one exists. A good decision entry
has three parts:

**The choice itself**, stated plainly: e.g. "Integration tests hit a real
database, never a mock."

**Why**, in the user's own reasoning where possible: e.g. "A prior mocked-test
setup passed while the real migration broke production — mocks masked the
divergence."

**How to apply it**, so a future session can judge edge cases the original
decision didn't explicitly cover: e.g. "Applies to any test touching schema or
migrations; pure unit tests with no DB dependency are unaffected."

Delete this file once real decisions replace it.
