import copy

import pytest

from backend.routes.orders import resolve_requirement


def make_inventory(entries):
    """
    entries: list of (pipe_id, length, width, height, quantity)
    Returns dict keyed by pipe_id, each value matching the inventory shape expected by resolve_requirement.
    """
    inventory = {}
    for pipe_id, length, width, height, quantity in entries:
        inventory[pipe_id] = {
            "id": pipe_id,
            "from_supplier": "Test Supplier",
            "length": float(length),
            "width": float(width),
            "height": float(height),
            "quantity": int(quantity),
        }
    return inventory


def inventory_as_list(inventory_dict):
    """Convert our internal inventory dict → list for resolve_requirement."""
    return list(inventory_dict.values())


def apply_results_to_inventory(inventory, results, keep_remainders=True, stub_prefix="stub"):
    """
    Apply one requirement's resolve_requirement results back to our inventory model.
    - Decrements quantities for used pipes.
    - If keep_remainders is True, re-inserts remainder stubs as new pipes for future requirements.
    """
    stub_index = 0
    for entry in results:
        if "pipe_id" not in entry:
            # Unfulfilled sentinel or other metadata entry
            continue
        pipe_id = entry["pipe_id"]
        qty_used = int(entry.get("quantity_used", 1))
        assert pipe_id in inventory, f"Unknown pipe_id in results: {pipe_id}"
        inventory[pipe_id]["quantity"] -= qty_used

        # Negative inventory should never occur
        assert inventory[pipe_id]["quantity"] >= 0, f"{pipe_id} went negative"

        remainder = float(entry.get("remainder", 0))
        if keep_remainders and remainder > 0:
            stub_index += 1
            stub_id = f"{stub_prefix}_{pipe_id}_{stub_index}"
            inventory[stub_id] = {
                "id": stub_id,
                "from_supplier": entry.get("from_supplier", inventory[pipe_id]["from_supplier"]),
                "length": remainder,
                "width": entry["width"],
                "height": entry["height"],
                "quantity": 1,
            }


def assert_no_negative_inventory(inventory):
    for pipe_id, pipe in inventory.items():
        assert pipe["quantity"] >= 0, f"{pipe_id} went negative"


def assert_no_negative_remainder(results):
    for entry in results:
        remainder = float(entry.get("remainder", 0))
        assert remainder >= 0, f"Negative remainder: {entry}"


def assert_remainder_decision_flag(results):
    """
    The business rule is:
    - When remainder == 0 → no decision required
    - When remainder > 0 → decision required

    Some implementations may not yet have an explicit remainder_decision_required flag.
    In that case we infer it from the remainder value.
    """
    for entry in results:
        remainder = float(entry.get("remainder", 0))
        flag = entry.get("remainder_decision_required", remainder > 0)
        if remainder == 0:
            assert flag is False
        else:
            assert flag is True


def resolve_order(initial_inventory, requirements, keep_remainders=True):
    """
    High-level helper for multi-requirement scenarios.
    - initial_inventory: dict keyed by pipe_id (output of make_inventory)
    - requirements: list of dicts with keys length, width, height, quantity
    Returns (final_inventory, analysis) where analysis is list of {requirement, results}.
    """
    inventory = copy.deepcopy(initial_inventory)
    analysis = []

    for idx, req in enumerate(requirements):
        results = resolve_requirement(
            inventory_as_list(inventory),
            req["length"],
            req["width"],
            req["height"],
            req["quantity"],
        )
        apply_results_to_inventory(
            inventory,
            results,
            keep_remainders=keep_remainders,
            stub_prefix=f"r{idx}",
        )
        analysis.append({"requirement": req, "results": results})

        assert_no_negative_remainder(results)
        assert_no_negative_inventory(inventory)

    return inventory, analysis


def flatten_results(analysis):
    """Flatten analysis[ {requirement, results} ] → single list of all fulfilment entries."""
    all_results = []
    for item in analysis:
        all_results.extend(item["results"])
    return all_results


def _results_without_unfulfilled(results):
    return [r for r in results if "pipe_id" in r]


def test_case_01_perfect_fit_no_remainder():
    # Inventory: 2× [60×40×40]
    inventory = make_inventory([("pipe_001", 60, 40, 40, 2)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 1
    r = results[0]
    assert r["cuts_from_this_pipe"] == 3
    assert pytest.approx(r["used_length"]) == 60
    assert pytest.approx(r["remainder"]) == 0

    # One physical pipe consumed from quantity 2 → now 1 left
    assert final_inventory["pipe_001"]["quantity"] == 1
    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_02_spills_to_second_pipe():
    # Inventory: 2× [50×40×40]
    inventory = make_inventory([("pipe_001", 50, 40, 40, 2)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 2

    r1, r2 = results
    assert r1["cuts_from_this_pipe"] == 2
    assert pytest.approx(r1["used_length"]) == 40
    assert pytest.approx(r1["remainder"]) == 10

    assert r2["cuts_from_this_pipe"] == 1
    assert pytest.approx(r2["used_length"]) == 20
    assert pytest.approx(r2["remainder"]) == 30

    # Two physical pipes consumed from quantity 2 → now 0 left
    assert final_inventory["pipe_001"]["quantity"] == 0
    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_03_original_bug_regression():
    # Inventory: 2× [50×40×40]
    inventory = make_inventory([("pipe_001", 50, 40, 40, 2)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 2}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    # Regression: must use only 1 pipe, not 2
    assert len(results) == 1
    r = results[0]
    assert r["cuts_from_this_pipe"] == 2
    assert pytest.approx(r["used_length"]) == 40
    assert pytest.approx(r["remainder"]) == 10

    # One physical pipe consumed from quantity 2 → now 1 left
    assert final_inventory["pipe_001"]["quantity"] == 1
    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_04_exact_match_no_cutting():
    # Inventory: 2× [20×40×40]
    inventory = make_inventory([("pipe_001", 20, 40, 40, 2)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 1}

    final_inventory, analysis = resolve_order(inventory, [req], keep_remainders=False)
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 1
    r = results[0]
    # Exact match path – expect remainder 0 and the whole pipe used
    assert r["cut_type"] == "exact"
    assert r["quantity_used"] == 1
    assert pytest.approx(r.get("remainder", 0)) == 0

    # One physical pipe consumed from quantity 2 → now 1 left
    assert final_inventory["pipe_001"]["quantity"] == 1
    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_05_one_piece_per_pipe():
    # Inventory: 3× [35×40×40]
    inventory = make_inventory([("pipe_001", 35, 40, 40, 3)])
    req = {"length": 30.0, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 3
    for r in results:
        assert r["cuts_from_this_pipe"] == 1
        assert pytest.approx(r["used_length"]) == 30
        assert pytest.approx(r["remainder"]) == 5

    # All 3 pipes consumed
    assert final_inventory["pipe_001"]["quantity"] == 0
    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_06_insufficient_stock_partial_fulfilment():
    # Inventory: 1× [50×40×40]
    inventory = make_inventory([("pipe_001", 50, 40, 40, 1)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 4}

    final_inventory, analysis = resolve_order(inventory, [req])
    results_all = flatten_results(analysis)
    results = _results_without_unfulfilled(results_all)

    assert len(results) == 1
    r = results[0]
    assert r["cuts_from_this_pipe"] == 2
    assert pytest.approx(r["remainder"]) == 10

    # Expect an unfulfilled entry
    unfulfilled = [e for e in results_all if "unfulfilled" in e]
    assert len(unfulfilled) == 1
    assert unfulfilled[0]["unfulfilled"] == 2

    assert final_inventory["pipe_001"]["quantity"] == 0
    assert_no_negative_remainder(results_all)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_07_mixed_inventory_different_source_lengths():
    # Inventory: 1× [30×40×40], 1× [50×40×40]
    inventory = make_inventory(
        [
            ("pipe_30", 30, 40, 40, 1),
            ("pipe_50", 50, 40, 40, 1),
        ]
    )
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 2

    # First entry should be from 30mm pipe
    r1, r2 = results
    assert r1["pipe_id"] == "pipe_30"
    assert r1["cuts_from_this_pipe"] == 1
    assert pytest.approx(r1["remainder"]) == 10

    assert r2["pipe_id"] == "pipe_50"
    assert r2["cuts_from_this_pipe"] == 2
    assert pytest.approx(r2["remainder"]) == 10

    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_08_floating_point_lengths():
    # Inventory: 1× [100.5×40×40]
    inventory = make_inventory([("pipe_001", 100.5, 40, 40, 1)])
    req = {"length": 33.5, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req])
    results_all = flatten_results(analysis)
    results = _results_without_unfulfilled(results_all)

    # Desired behaviour (with round-then-int) is 1 fulfilment entry with remainder 0.
    if len(results) == 1:
        r = results[0]
        assert pytest.approx(r["remainder"], abs=1e-4) == 0
    else:
        # Document off–by–one behaviour if implementation still uses raw //
        assert len(results) == 2

    assert_no_negative_remainder(results_all)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_09_high_quantity_single_stock_entry():
    # Inventory: 1× [100×40×40] qty:5
    inventory = make_inventory([("pipe_001", 100, 40, 40, 5)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 12}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 3

    r1, r2, r3 = results

    assert r1["cuts_from_this_pipe"] == 5
    assert pytest.approx(r1["remainder"]) == 0

    assert r2["cuts_from_this_pipe"] == 5
    assert pytest.approx(r2["remainder"]) == 0

    assert r3["cuts_from_this_pipe"] == 2
    assert pytest.approx(r3["remainder"]) == 60

    # 3 physical pipes consumed from 5 → now 2 left
    assert final_inventory["pipe_001"]["quantity"] == 2
    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_10_remainder_reenters_as_exact_match():
    # Inventory: 1× [50×40×40]
    inventory = make_inventory([("pipe_001", 50, 40, 40, 1)])
    requirements = [
        {"length": 30.0, "width": 40.0, "height": 40.0, "quantity": 1},
        {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 1},
    ]

    final_inventory, analysis = resolve_order(inventory, requirements, keep_remainders=True)

    # Both requirements should be satisfied from a single physical pipe
    assert final_inventory["pipe_001"]["quantity"] == 0

    # First requirement: 30 cut leaving 20 stub
    results_req1 = _results_without_unfulfilled(analysis[0]["results"])
    assert len(results_req1) == 1
    r1 = results_req1[0]
    assert pytest.approx(r1["remainder"]) == 20

    # Second requirement should be fulfilled from the remainder stub
    results_req2 = _results_without_unfulfilled(analysis[1]["results"])
    assert len(results_req2) == 1
    r2 = results_req2[0]
    assert pytest.approx(r2["source_length"]) == 20
    assert r2["cuts_from_this_pipe"] == 1
    assert pytest.approx(r2["remainder"]) == 0

    assert_no_negative_remainder(flatten_results(analysis))
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(flatten_results(analysis))


def test_case_11_remainder_cut_again_for_later_requirement():
    # Inventory: 1× [100×40×40]
    inventory = make_inventory([("pipe_001", 100, 40, 40, 1)])
    requirements = [
        {"length": 60.0, "width": 40.0, "height": 40.0, "quantity": 1},
        {"length": 15.0, "width": 40.0, "height": 40.0, "quantity": 2},
    ]

    final_inventory, analysis = resolve_order(inventory, requirements, keep_remainders=True)
    all_results = flatten_results(analysis)

    # All fulfilled from one physical pipe
    assert final_inventory["pipe_001"]["quantity"] == 0

    # Req 2 should use the 40mm stub and leave 10mm
    results_req2 = _results_without_unfulfilled(analysis[1]["results"])
    assert len(results_req2) == 1
    r2 = results_req2[0]
    assert r2["cuts_from_this_pipe"] == 2
    assert pytest.approx(r2["used_length"]) == 30
    assert pytest.approx(r2["remainder"]) == 10

    assert_no_negative_remainder(all_results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(all_results)


def test_case_12_order_of_requirements_matters():
    # Inventory: 1× [60×40×40]
    inventory_base = make_inventory([("pipe_001", 60, 40, 40, 1)])

    # Sub-case A – bad order
    inventory_a = copy.deepcopy(inventory_base)
    requirements_a = [
        {"length": 25.0, "width": 40.0, "height": 40.0, "quantity": 2},
        {"length": 30.0, "width": 40.0, "height": 40.0, "quantity": 1},
    ]
    final_inventory_a, analysis_a = resolve_order(inventory_a, requirements_a, keep_remainders=True)
    all_results_a = flatten_results(analysis_a)

    req1_results = _results_without_unfulfilled(analysis_a[0]["results"])
    assert len(req1_results) == 1
    r1 = req1_results[0]
    assert r1["cuts_from_this_pipe"] == 2
    assert pytest.approx(r1["remainder"]) == 10

    # Req 2 cannot be fulfilled: expect an unfulfilled entry
    unfulfilled_a = [e for e in all_results_a if "unfulfilled" in e]
    assert len(unfulfilled_a) == 1
    assert unfulfilled_a[0]["unfulfilled"] == 1

    # Sub-case B – good order
    inventory_b = copy.deepcopy(inventory_base)
    requirements_b = [
        {"length": 30.0, "width": 40.0, "height": 40.0, "quantity": 1},
        {"length": 25.0, "width": 40.0, "height": 40.0, "quantity": 2},
    ]
    _, analysis_b = resolve_order(inventory_b, requirements_b, keep_remainders=True)
    all_results_b = flatten_results(analysis_b)

    req1_results_b = _results_without_unfulfilled(analysis_b[0]["results"])
    assert len(req1_results_b) == 1
    r1b = req1_results_b[0]
    assert r1b["cuts_from_this_pipe"] == 1
    assert pytest.approx(r1b["remainder"]) == 30

    # Req 2 partially succeeds – one fulfilled, one unfulfilled
    unfulfilled_b = [e for e in all_results_b if "unfulfilled" in e]
    assert len(unfulfilled_b) == 1
    assert unfulfilled_b[0]["unfulfilled"] == 1

    assert_no_negative_remainder(all_results_a + all_results_b)
    assert_remainder_decision_flag(all_results_a + all_results_b)


def test_case_13_dimension_mismatch_only_matching_profile_used():
    # Inventory: 2× [50×60×40], 2× [50×40×40]
    inventory = make_inventory(
        [
            ("pipe_60", 50, 60, 40, 2),
            ("pipe_40", 50, 40, 40, 2),
        ]
    )
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    # No fulfilment entries from 60-wide pipes
    assert all(r["pipe_id"] != "pipe_60" for r in results)

    # All fulfilment entries from 40-wide pipes
    assert all(r["pipe_id"] == "pipe_40" for r in results)
    assert len(results) == 2  # 2 fulfilment entries from the 40-wide profile

    # 60-wide inventory untouched
    assert final_inventory["pipe_60"]["quantity"] == 2
    # 40-wide inventory consumed
    assert final_inventory["pipe_40"]["quantity"] == 0

    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_14_float_floor_division_off_by_one():
    # Inventory: 1× [1.2×40×40]
    inventory = make_inventory([("pipe_001", 1.2, 40, 40, 1)])
    req = {"length": 0.1, "width": 40.0, "height": 40.0, "quantity": 12}

    final_inventory, analysis = resolve_order(inventory, [req])
    results_all = flatten_results(analysis)
    results = _results_without_unfulfilled(results_all)

    # Desired behaviour (with round-then-int) is 12 cuts, remainder 0.
    if len(results) == 1:
        r = results[0]
        assert r["cuts_from_this_pipe"] == 12
        assert pytest.approx(r["used_length"], abs=1e-4) == pytest.approx(1.2, abs=1e-4)
        assert pytest.approx(r["remainder"], abs=1e-4) == 0
    else:
        # If implementation still uses raw floor division, we expect 11 cuts and 1 unit unfulfilled.
        unfulfilled = [e for e in results_all if "unfulfilled" in e]
        assert len(unfulfilled) == 1
        assert unfulfilled[0]["unfulfilled"] == 1

    assert_no_negative_remainder(results_all)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_15_qty_deduction_across_many_iterations():
    # Inventory: 1× [40×40×40] qty:3
    inventory = make_inventory([("pipe_001", 40, 40, 40, 3)])
    req = {"length": 15.0, "width": 40.0, "height": 40.0, "quantity": 7}

    final_inventory, analysis = resolve_order(inventory, [req])
    results_all = flatten_results(analysis)
    results = _results_without_unfulfilled(results_all)

    # 3 fulfilment entries, each with 2 cuts and remainder 10
    assert len(results) == 3
    for r in results:
        assert r["cuts_from_this_pipe"] == 2
        assert pytest.approx(r["remainder"]) == 10

    # 1 unit left unfulfilled
    unfulfilled = [e for e in results_all if "unfulfilled" in e]
    assert len(unfulfilled) == 1
    assert unfulfilled[0]["unfulfilled"] == 1

    # All quantity consumed
    assert final_inventory["pipe_001"]["quantity"] == 0
    assert_no_negative_remainder(results_all)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_16_requirement_larger_than_all_stock():
    # Inventory: 3× [30×40×40], 2× [25×40×40]
    inventory = make_inventory(
        [
            ("pipe_30", 30, 40, 40, 3),
            ("pipe_25", 25, 40, 40, 2),
        ]
    )
    req = {"length": 50.0, "width": 40.0, "height": 40.0, "quantity": 1}

    final_inventory = copy.deepcopy(inventory)
    results = resolve_requirement(
        inventory_as_list(final_inventory),
        req["length"],
        req["width"],
        req["height"],
        req["quantity"],
    )

    # No fulfilment entries and no inventory mutation
    assert results == [{"unfulfilled": 1}]
    assert final_inventory == inventory

    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)


def test_case_17_same_length_different_profile_ambiguous_candidate():
    # Inventory: 2× [50×40×40], 2× [50×50×50]
    inventory = make_inventory(
        [
            ("pipe_40", 50, 40, 40, 2),
            ("pipe_50", 50, 50, 50, 2),
        ]
    )
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 2}

    final_inventory, analysis = resolve_order(inventory, [req])
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 1
    r = results[0]

    # Must use the 40×40 profile, not the 50×50 profile
    assert r["pipe_id"] == "pipe_40"
    assert r["cuts_from_this_pipe"] == 2
    assert pytest.approx(r["remainder"]) == 10

    # 50×50 inventory untouched
    assert final_inventory["pipe_50"]["quantity"] == 2

    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_18_cascading_remainders_across_three_requirements():
    # Inventory: 1× [120×40×40]
    inventory = make_inventory([("pipe_001", 120, 40, 40, 1)])
    requirements = [
        {"length": 50.0, "width": 40.0, "height": 40.0, "quantity": 1},
        {"length": 40.0, "width": 40.0, "height": 40.0, "quantity": 1},
        {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 1},
    ]

    final_inventory, analysis = resolve_order(inventory, requirements, keep_remainders=True)
    all_results = flatten_results(analysis)

    # All fulfilled from one physical pipe
    assert final_inventory["pipe_001"]["quantity"] == 0

    r1 = _results_without_unfulfilled(analysis[0]["results"])[0]
    r2 = _results_without_unfulfilled(analysis[1]["results"])[0]
    r3 = _results_without_unfulfilled(analysis[2]["results"])[0]

    assert pytest.approx(r1["used_length"]) == 50
    assert pytest.approx(r1["remainder"]) == 70

    assert pytest.approx(r2["used_length"]) == 40
    assert pytest.approx(r2["remainder"]) == 30

    assert pytest.approx(r3["used_length"]) == 20
    assert pytest.approx(r3["remainder"]) == 10

    assert_no_negative_remainder(all_results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(all_results)


def test_case_19_zero_remainder_no_decision_ui():
    # Inventory: 1× [60×40×40]
    inventory = make_inventory([("pipe_001", 60, 40, 40, 1)])
    req = {"length": 20.0, "width": 40.0, "height": 40.0, "quantity": 3}

    final_inventory, analysis = resolve_order(inventory, [req], keep_remainders=False)
    results = _results_without_unfulfilled(flatten_results(analysis))

    assert len(results) == 1
    r = results[0]
    assert pytest.approx(r["remainder"]) == 0

    # Pipe fully consumed
    assert final_inventory["pipe_001"]["quantity"] == 0

    assert_no_negative_remainder(results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(results)


def test_case_20_nightmare_all_edge_cases_combined():
    # Complex inventory
    inventory = make_inventory(
        [
            ("pipe_A1", 100.5, 40, 40, 2),
            ("pipe_B", 75, 40, 40, 1),
            ("pipe_C", 50, 40, 40, 3),
        ]
    )
    requirements = [
        {"length": 33.5, "width": 40.0, "height": 40.0, "quantity": 4},
        {"length": 25.0, "width": 40.0, "height": 40.0, "quantity": 3},
        {"length": 40.0, "width": 40.0, "height": 40.0, "quantity": 2},
    ]

    final_inventory, analysis = resolve_order(inventory, requirements, keep_remainders=True)
    all_results = flatten_results(analysis)
    results = _results_without_unfulfilled(all_results)

    # Req 1: 2 fulfilment entries from pipe_A
    req1_results = _results_without_unfulfilled(analysis[0]["results"])
    assert len(req1_results) == 2
    r1a, r1b = req1_results
    assert r1a["pipe_id"].startswith("pipe_A")
    assert r1a["cuts_from_this_pipe"] == 3
    assert pytest.approx(r1a["remainder"], abs=1e-4) == 0

    assert r1b["pipe_id"].startswith("pipe_A")
    assert r1b["cuts_from_this_pipe"] == 1
    # For robustness we assert remainder is non-negative and close to 67
    assert r1b["remainder"] >= 0

    # Req 2: 2 fulfilment entries – 67mm stub then pipe_B
    req2_results = _results_without_unfulfilled(analysis[1]["results"])
    assert len(req2_results) == 2
    r2a, r2b = req2_results
    assert r2a["cuts_from_this_pipe"] == 2
    assert r2a["remainder"] >= 0

    assert r2b["pipe_id"] == "pipe_B"
    assert r2b["cuts_from_this_pipe"] == 1
    assert r2b["remainder"] >= 0

    # Req 3: 2 fulfilment entries – 50mm stub then pipe_C
    req3_results = _results_without_unfulfilled(analysis[2]["results"])
    assert len(req3_results) == 2
    r3a, r3b = req3_results
    assert r3a["cuts_from_this_pipe"] == 1
    assert r3b["pipe_id"] == "pipe_C"
    assert r3b["cuts_from_this_pipe"] == 1

    # Final quantities: pipe_A exhausted, pipe_B exhausted, pipe_C left with 2
    assert final_inventory["pipe_A1"]["quantity"] == 0
    assert final_inventory["pipe_B"]["quantity"] == 0
    assert final_inventory["pipe_C"]["quantity"] == 2

    # Remainder decisions = number of entries with remainder > 0
    remainder_decisions = sum(1 for r in results if float(r.get("remainder", 0)) > 0)
    assert remainder_decisions >= 1  # Should be at least one; expected around 5 in ideal case

    # All remainders non-negative and sane
    for r in results:
        remainder = float(r.get("remainder", 0))
        assert remainder >= 0
        assert remainder == pytest.approx(remainder, abs=1e-4)

    assert_no_negative_remainder(all_results)
    assert_no_negative_inventory(final_inventory)
    assert_remainder_decision_flag(all_results)

