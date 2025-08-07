#!/usr/bin/env python3
"""
Script to cleanup the problematic doPostOld remnants from Code.gs
"""

def cleanup_code_gs():
    with open('Code.gs', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the start and end of problematic code
    start_marker = "// doPostOld function (1063 lines) was removed during Router Pattern refactoring"
    end_marker = "function addIncomeData(userId, date, content, amount, allocation, subCategory) {"
    
    start_idx = -1
    end_idx = -1
    
    for i, line in enumerate(lines):
        if start_marker in line:
            start_idx = i
        if end_marker in line:
            end_idx = i
            break
    
    if start_idx != -1 and end_idx != -1:
        print(f"Found problematic code from line {start_idx + 1} to {end_idx}")
        
        # Keep everything before the start, add clean comment, then keep from end onwards
        clean_lines = (
            lines[:start_idx] + 
            ["// =================== LEGACY FUNCTIONS REMOVED ===================\n",
             "// doPostOld function (1063 lines) was removed during Router Pattern refactoring\n",
             "\n"] +
            lines[end_idx:]
        )
        
        # Write the cleaned file
        with open('Code.gs', 'w', encoding='utf-8') as f:
            f.writelines(clean_lines)
        
        print(f"✅ Successfully cleaned Code.gs!")
        print(f"   - Removed {end_idx - start_idx - 2} lines of problematic code")
        print(f"   - File now has {len(clean_lines)} lines")
        
    else:
        print("❌ Could not find markers for cleanup")

if __name__ == "__main__":
    cleanup_code_gs()
