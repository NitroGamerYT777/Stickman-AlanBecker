import sys
import os
import pymunk
from PyQt6.QtWidgets import QApplication, QMainWindow, QPushButton
from PyQt6.QtCore import QTimer
from physics_world import PhysicsWorld
from stickman_renderer import StickmanWindow
from creation_ui import CreationWindow
from stickman import Stickman, save_stickman, load_stickman

class ControlPanel(QMainWindow):
    def __init__(self, main_app):
        super().__init__()
        self.main_app = main_app
        self.setWindowTitle('Stickman Control Panel')

        self.add_stickman_btn = QPushButton("Create New Stickman", self)
        self.add_stickman_btn.clicked.connect(self.open_creation_window)
        self.setCentralWidget(self.add_stickman_btn)

    def open_creation_window(self):
        self.creation_window = CreationWindow()
        # Connect the signal from the creation window to a method in MainApp
        self.creation_window.stickman_finalized.connect(self.main_app.add_new_stickman)
        self.creation_window.show()


class MainApp:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.physics_world = PhysicsWorld()
        self.stickmen = []
        self.stickman_windows = []

        self.control_panel = ControlPanel(self)
        self.control_panel.show()

        # Load existing stickmen
        self.load_all_stickmen()

        # Set up a timer to update the physics and rendering
        self.timer = QTimer()
        self.timer.timeout.connect(self.update)
        self.timer.start(16)  # Update at approx 60 FPS

    def add_new_stickman(self, drawing_data):
        # This method will be called when the creation window is finalized
        name = drawing_data['name']
        stickman = Stickman(name, drawing_data)

        # Add stickman to physics world
        for shape in stickman.body_parts:
            self.physics_world.space.add(shape.body, shape)
        for constraint in stickman.constraints:
            self.physics_world.space.add(constraint)

        self.stickmen.append(stickman)

        # Create a renderer for the new stickman
        # Note: StickmanWindow needs to be updated to handle a full stickman, not just one body
        # For now, we'll just create a window for the first body part
        if stickman.body_parts:
            renderer = StickmanWindow(stickman.body_parts[0].body)
            renderer.show()
            self.stickman_windows.append(renderer)

        # Save the new stickman
        save_stickman(stickman, f"{name}.json")

    def load_all_stickmen(self):
        for filename in os.listdir('.'):
            if filename.endswith(".json"):
                try:
                    stickman = load_stickman(filename)
                    # Add to physics world and create renderer (similar to add_new_stickman)
                    print(f"Loaded {stickman.name}")
                except Exception as e:
                    print(f"Error loading {filename}: {e}")

    def update(self):
        """The main application loop."""
        self.physics_world.update(1/60.0)

        for window in self.stickman_windows:
            window.update_position()
            window.update() # Triggers a repaint

    def run(self):
        sys.exit(self.app.exec())

if __name__ == '__main__':
    app_instance = MainApp()
    app_instance.run()
