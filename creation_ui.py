import sys
from PyQt6.QtWidgets import QWidget, QApplication, QVBoxLayout, QHBoxLayout, QPushButton, QLineEdit
from PyQt6.QtCore import Qt, QPoint, pyqtSignal
from PyQt6.QtGui import QPainter, QPen, QColor, QBrush

class Canvas(QWidget):
    def __init__(self):
        super().__init__()
        self.setMinimumSize(800, 600)
        self.lines = []
        self.current_line = []
        self.drawing = False

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.drawing = True
            self.current_line = [event.pos()]

    def mouseMoveEvent(self, event):
        if self.drawing:
            self.current_line.append(event.pos())
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton and self.drawing:
            self.drawing = False
            self.lines.append(self.current_line)
            self.current_line = []

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        pen = QPen(QColor("black"), 3)
        painter.setPen(pen)

        for line in self.lines:
            painter.drawPolyline(line)
        if self.current_line:
            painter.drawPolyline(self.current_line)


class CreationWindow(QWidget):
    stickman_finalized = pyqtSignal(dict)

    def __init__(self):
        super().__init__()
        self.setWindowTitle('Create a New Stickman')

        main_layout = QVBoxLayout()
        self.canvas = Canvas()
        main_layout.addWidget(self.canvas)

        controls_layout = QHBoxLayout()
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Enter stickman name...")
        self.start_rigging_btn = QPushButton("Start Rigging")
        self.finalize_btn = QPushButton("Finalize Stickman")

        controls_layout.addWidget(self.name_input)
        controls_layout.addWidget(self.start_rigging_btn)
        controls_layout.addWidget(self.finalize_btn)

        main_layout.addLayout(controls_layout)
        self.setLayout(main_layout)

        # Rigging state
        self.rigging_mode = False
        self.rig_joints = []

        self.start_rigging_btn.clicked.connect(self.toggle_rigging_mode)
        self.finalize_btn.clicked.connect(self.finalize)

    def toggle_rigging_mode(self):
        self.rigging_mode = not self.rigging_mode
        self.start_rigging_btn.setText("End Rigging" if self.rigging_mode else "Start Rigging")
        self.canvas.set_rigging_mode(self.rigging_mode)

    def finalize(self):
        drawing_data = {
            'name': self.name_input.text(),
            'lines': self.canvas.lines,
            'joints': self.canvas.rig_joints,
        }
        self.stickman_finalized.emit(drawing_data)
        self.close()

# Update Canvas class to handle rigging
class Canvas(QWidget):
    def __init__(self):
        super().__init__()
        self.setMinimumSize(800, 600)
        self.lines = []
        self.current_line = []
        self.drawing = True # Start in drawing mode
        self.rigging_mode = False
        self.rig_joints = []

    def set_rigging_mode(self, enabled):
        self.rigging_mode = enabled
        self.drawing = not enabled

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            if self.drawing:
                self.drawing = True
                self.current_line = [event.pos()]
            elif self.rigging_mode:
                self.rig_joints.append(event.pos())
                self.update()

    def mouseMoveEvent(self, event):
        if self.drawing and self.current_line:
            self.current_line.append(event.pos())
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton and self.drawing:
            if self.current_line:
                self.lines.append(self.current_line)
                self.current_line = []

    def paintEvent(self, event):
        super().paintEvent(event)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Draw lines
        pen = QPen(QColor("black"), 3)
        painter.setPen(pen)
        for line in self.lines:
            painter.drawPolyline(line)
        if self.current_line:
            painter.drawPolyline(self.current_line)

        # Draw joints
        if self.rigging_mode:
            brush = QBrush(QColor("red"))
            painter.setBrush(brush)
            for joint in self.rig_joints:
                painter.drawEllipse(joint, 5, 5)



if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = CreationWindow()
    window.show()
    sys.exit(app.exec())
