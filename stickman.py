import pymunk
import json

class Stickman:
    def __init__(self, name, drawing_data=None):
        self.name = name
        self.drawing_data = drawing_data
        self.body_parts = []
        self.constraints = []

        self.memory = {
            'goals': ['wander'],
            'personality': {}
        }

        if self.drawing_data:
            self._create_body_from_drawing()

    def _create_body_from_drawing(self):
        lines = self.drawing_data['lines']
        joints = self.drawing_data['joints']

        # Rigging logic similar to the JS version
        parts = {} # 'head': body, 'hand_0': body, etc.

        # Associate lines with joints and create bodies
        for i, line in enumerate(lines):
            start_pos = line[0]
            end_pos = line[-1]
            center_x = (start_pos.x() + end_pos.x()) / 2
            center_y = (start_pos.y() + end_pos.y()) / 2

            # Find closest joint
            closest_joint = min(joints, key=lambda j: ((j.x() - center_x)**2 + (j.y() - center_y)**2)**0.5)

            # This is a simplified logic. A proper implementation would be more complex.
            # For now, let's just create a body for each line.
            length = ((start_pos.x() - end_pos.x())**2 + (start_pos.y() - end_pos.y())**2)**0.5
            body = pymunk.Body(1, 100)
            body.position = center_x, center_y
            shape = pymunk.Segment(body, (-length/2, 0), (length/2, 0), 5)
            self.body_parts.append(shape)

        # Connect all parts to the first part for simplicity
        if len(self.body_parts) > 1:
            main_body = self.body_parts[0].body
            for shape in self.body_parts[1:]:
                joint = pymunk.PivotJoint(main_body, shape.body, main_body.position)
                self.constraints.append(joint)

    def to_dict(self):
        """Serializes the stickman to a dictionary for JSON storage."""
        return {
            'name': self.name,
            'drawing_data': self.drawing_data,
            'memory': self.memory,
            # We will need to serialize the physics state too
        }

    @staticmethod
    def from_dict(data):
        """Deserializes a stickman from a dictionary."""
        stickman = Stickman(data['name'], data['drawing_data'])
        stickman.memory = data['memory']
        return stickman

    def update(self):
        """The main AI and state update logic for the stickman."""
        # AI logic will go here
        pass

def save_stickman(stickman, filename):
    with open(filename, 'w') as f:
        json.dump(stickman.to_dict(), f, indent=4)

def load_stickman(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
        return Stickman.from_dict(data)

if __name__ == '__main__':
    # Test saving and loading
    test_data = {'lines': [[(1,1), (2,2)]], 'joints': [{'type': 'head', 'pos': (1,1)}]}
    s1 = Stickman("Test Dummy", test_data)
    save_stickman(s1, "test_stickman.json")
    s2 = load_stickman("test_stickman.json")
    print(f"Loaded stickman: {s2.name}")
    print(f"Drawing data matches: {s1.drawing_data == s2.drawing_data}")
