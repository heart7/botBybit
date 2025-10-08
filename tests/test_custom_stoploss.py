import math
from user_data.strategies.ml_grid_strategy import MLGridStrategy


def test_custom_stoploss_inactive():
    s = MLGridStrategy({})
    # profit below threshold -> should return 1 (no custom stoploss)
    res = s.custom_stoploss('BTC/USDT', None, None, 40000.0, 0.005)
    assert res == 1


def test_custom_stoploss_trailing():
    s = MLGridStrategy({})
    # profit 1.5% -> trailing should set stop to 0.5% (returned as negative)
    res = s.custom_stoploss('BTC/USDT', None, None, 40000.0, 0.015)
    # Expect approximately -0.005
    assert math.isclose(res, -0.005, rel_tol=1e-6, abs_tol=1e-8)
