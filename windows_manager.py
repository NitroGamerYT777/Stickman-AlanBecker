import sys

# We need a placeholder for win32gui and win32con for non-Windows environments
if sys.platform == 'win32':
    import win32gui
    import win32con

def get_visible_windows():
    """
    Returns a list of visible windows with their titles and rectangles.
    Each element is a dictionary: {'title': str, 'rect': (x1, y1, x2, y2)}
    """
    if sys.platform != 'win32':
        print("Warning: Window scanning is only supported on Windows.")
        # Return some dummy windows for testing on non-windows platforms
        return [
            {'title': 'Dummy Window 1', 'rect': (100, 100, 500, 400)},
            {'title': 'Dummy Window 2', 'rect': (600, 200, 1000, 800)},
        ]

    windows = []
    def enum_handler(hwnd, ctx):
        if win32gui.IsWindowVisible(hwnd) and win32gui.GetWindowText(hwnd) != '':
            rect = win32gui.GetWindowRect(hwnd)
            windows.append({'title': win32gui.GetWindowText(hwnd), 'rect': rect})

    win32gui.EnumWindows(enum_handler, None)
    return windows

if __name__ == '__main__':
    # For testing purposes, print the list of visible windows
    for window in get_visible_windows():
        print(f"Title: {window['title']}, Rect: {window['rect']}")
