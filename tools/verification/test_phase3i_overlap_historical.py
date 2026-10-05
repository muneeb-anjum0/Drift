"""Model-free normalized-pair checks for the closed-final overlap audit."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from phase3i_overlap_historical import key


def test_normalized_pair_key():
    assert key("  Card-payment! ", "Please STOP card payment.") == (
        "card payment", "please stop card payment"
    )
    assert key("A", "B") != key("B", "A")
