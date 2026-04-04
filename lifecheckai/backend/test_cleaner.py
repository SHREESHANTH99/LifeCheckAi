import re

def _clean_location_name(value, state_name=""):
    if value is None:
        return ""
    
    text = str(value).strip()
    # Remove leading/trailing non-alphanumeric (except space/parentheses)
    # text = re.sub(r"^[^a-zA-Z0-9(]+|[^a-zA-Z0-9)]+$", "", text)
    # Let's try a simpler one: strip all starting non-letters/numbers
    text = re.sub(r"^[^a-zA-Z0-9]+", "", text)
    text = re.sub(r"[^a-zA-Z0-9]+$", "", text)

    if state_name:
        upper_state = state_name.upper().strip()
        # Remove "DELHI DELHI" pattern
        text = text.replace(f"{upper_state} {upper_state}", upper_state)
        
        # Case insensitive check for state name at end
        pattern = re.compile(rf"[, ]+{re.escape(upper_state)}$", re.IGNORECASE)
        text = pattern.sub("", text).strip()

    # Final cleanup of multiple spaces/dashes
    text = re.sub(r"[\s]{2,}", " ", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip()

# Test cases
test_cases = [
    ("- - - WELL AT ALIPUR, DELHI DELHI", "Delhi"),
    ("- - - WELL AT ALIPUR, DELHI DELHI WELL AT AURBINDO MARG,", "Delhi"),
    ("BORE WELL AT KANURU PANCHAYAT, ANDHRA PRADESH", "Andhra Pradesh"),
]

for t, state in test_cases:
    print(f"Original: '{t}'")
    print(f"Cleaned:  '{_clean_location_name(t, state)}'")
    print("-" * 20)
