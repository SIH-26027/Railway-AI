from database.supabase_client import supabase
from datetime import date
from typing import Any, Dict, List
from planner.train_gap_analyzer import TrainOccupancy, calculate_train_free_gaps

cors: List[Dict[str, Any]] = supabase.table('corridors').select('*').execute().data  # type: ignore[assignment]
cor_map = {c['id']: c for c in cors}
moves: List[Dict[str, Any]] = supabase.table('train_movements').select('*, trains(train_number, train_name, train_type, priority)').execute().data  # type: ignore[assignment]

# Test target: Cauvery - Anangur UP Line
target_id = 'c333b62a-7895-455c-a7e1-1ed322b25404'
target_cor: Dict[str, Any] = cor_map.get(target_id, {})

def norm(s):
    if not s:
        return ""
    return "-".join(p.strip().lower() for p in s.replace('\u2013', '-').replace('\u2014', '-').split('-') if p.strip())

target_name = norm(target_cor.get('corridor_name', ''))
target_line = target_cor.get('line', '').lower()

# Mock extract_train_occupancies with corridor-level fallback
def test_extract(target_date):
    target_date_str = target_date.strftime("%Y-%m-%d")
    matched_moves = []
    for m in moves:
        if str(m.get('movement_date'))[:10] != target_date_str:
            continue
        m_cor = cor_map.get(m.get('corridor_id'), {})
        m_name = norm(m_cor.get('corridor_name', ''))
        m_line = m_cor.get('line', '').lower()
        m_dir = str(m.get('direction', '')).upper()

        cor_match = (m.get('corridor_id') == target_id) or (target_name and m_name and target_name == m_name)
        line_match = ('up' in target_line and (m_dir == 'UP' or 'up' in m_line)) or ('dn' in target_line and (m_dir == 'DN' or 'dn' in m_line))
        if cor_match and line_match:
            # enrich m with corridor info
            m_copy = dict(m)
            m_copy['corridor_id'] = target_id
            m_copy['line'] = target_cor.get('line')
            matched_moves.append(m_copy)
    return matched_moves

enriched_moves = test_extract(date(2026, 9, 21))
gaps = calculate_train_free_gaps(
    train_movements=enriched_moves,
    corridor_id=target_id,
    target_date=date(2026, 9, 21),
    line='UP Line',
    post_buffer=10,
    pre_buffer=10,
    min_required_duration=30,
)

print(f'\nFound {len(gaps)} train-free gaps:')
for g in gaps:
    print(f'  Gap: {g.usable_start_time} - {g.usable_end_time} ({g.usable_duration_minutes} min / {round(g.usable_duration_minutes/60, 1)}h)')
