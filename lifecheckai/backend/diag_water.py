import os
import sys
from pathlib import Path

# Add the project root to sys.path
project_root = Path("c:/Projects/hack/LifeCheckAi")
sys.path.append(str(project_root))

try:
    from lifecheckai.backend.app.services.water_service import get_state_catalog, get_dataset_years, DATA_PATH, _dataset_paths

    print(f"DATA_PATH: {DATA_PATH}")
    print(f"Exists: {DATA_PATH.exists()}")
    print(f"Files found by glob: {[p.name for p in _dataset_paths()]}")

    states = get_state_catalog()
    years = get_dataset_years()

    print(f"States found: {len(states)}")
    if states:
        print(f"First 5 states: {[s['name'] for s in states[:5]]}")
    
    print(f"Years found: {years}")

except Exception as e:
    import traceback
    traceback.print_exc()
