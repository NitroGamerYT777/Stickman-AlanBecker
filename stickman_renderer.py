import sys
from PyQt6.QtWidgets import QWidget, QApplication
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPainter, QPen, QColor, QBrush

class StickmanWindow(QWidget):
    def __init__(self, stickman_body):
        super().__init__()
        self.stickman_body = stickman_body

        # Make the window transparent and borderless
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Set initial size and position based on the stickman's body
        # This will need to be updated continuously
        x, y = self.stickman_body.position
        self.setGeometry(int(x) - 50, int(y) - 50, 100, 100) # Placeholder size

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        pen = QPen(QColor("black"), 3)
        painter.setPen(pen)

        # Translate physics coordinates to widget coordinates
        # The widget's position is the center of the bounding box of the stickman
        all_x = [p.body.position.x for p in self.stickman_body.body_parts]
        all_y = [p.body.position.y for p in self.stickman_body.body_parts]
        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)

        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2

        for part in self.stickman_body.body_parts:
            body = part.body
            pos = body.position

            relative_x = pos.x - self.x()
            relative_y = pos.y - self.y()

            if isinstance(part, pymunk.Circle):
                painter.drawEllipse(QPoint(relative_x, relative_y), part.radius, part.radius)
            elif isinstance(part, pymunk.Segment):
                a = body.local_to_world(part.a)
                b = body.local_to_world(part.b)
                painter.drawLine(int(a.x - self.x()), int(a.y - self.y()), int(b.x - self.x()), int(b.y - self.y()))

    def update_position(self):
        """Updates the window's position and size to fit the stickman."""
        if not self.stickman_body.body_parts:
            return

        all_x = [p.body.position.x for p in self.stickman_body.body_parts]
        all_y = [p.body.position.y for p in self.stickman_body.body_parts]
        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)

        width = max(int(max_x - min_x) + 20, 50)
        height = max(int(max_y - min_y) + 20, 50)

        self.setGeometry(int(min_x) - 10, int(min_y) - 10, width, height)


if __name__ == '__main__':
    # For testing, create a dummy physics body and a window
    class DummyBody:
        def __init__(self, x, y):
            self.position = (x, y)

    app = QApplication(sys.argv)

    dummy_stickman = DummyBody(300, 300)
    window = StickmanWindow(dummy_stickman)
    window.show()

    sys.exit(app.exec())
