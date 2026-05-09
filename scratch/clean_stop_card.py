import os

file_path = r"c:\Users\lucas\OneDrive\Desktop\LDMS - Supabase\src\components\itinerary\StopCard.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first '  return (' starting after line 80
# Let's find '  return ('
ret_idx = content.find('\n  return (')
# Find '  const renderTransferModal = () => {'
modal_idx = content.find('\n  const renderTransferModal = () => {')

if ret_idx != -1 and modal_idx != -1 and ret_idx < modal_idx:
    new_content = content[:ret_idx + 1] + content[modal_idx + 1:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully cleaned up StopCard.jsx")
else:
    print(f"Error: ret_idx={ret_idx}, modal_idx={modal_idx}")
